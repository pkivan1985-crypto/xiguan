/* eslint-disable i18next/no-literal-string -- Table names and domain errors are stable identifiers. */
import type { ActionRecord } from '@entities/action-record';
import type { GoalRevision, LongTermGoal, StageGoal } from '@entities/goal';
import type { OutcomeBatch } from '@entities/outcome-batch';
import type { TodayDraft } from '@entities/today-draft';
import type { UserCard } from '@entities/user-card';
import { appDatabase, type RepeatOutcomeDatabase } from '@shared/lib/db';
import { appLifecycleCoordinator } from '@shared/lib/app-lifecycle';

export interface SetUserCardArchivedInput {
	userCardId: string;
	archived: boolean;
	nowIso: string;
}

export interface DeleteUserCardResult {
	actionRecordCount: number;
	longTermGoalCount: number;
	outcomeBatchCount: number;
	stageGoalCount: number;
	todayDraftCount: number;
}

export type UserCardManagementAction =
	| { type: 'archive'; userCardId: string; nowIso: string }
	| { type: 'restore'; userCardId: string; nowIso: string }
	| { type: 'delete'; userCardId: string };

function validNowIso(nowIso: string): string {
	if (Number.isNaN(Date.parse(nowIso))) throw new Error('INVALID_NOW_ISO');
	return nowIso;
}

function requiredUserCardId(userCardId: string): string {
	const id = userCardId.trim();
	if (!id) throw new Error('USER_CARD_REQUIRED');
	return id;
}

export async function setUserCardArchived(
	database: RepeatOutcomeDatabase,
	input: SetUserCardArchivedInput,
): Promise<UserCard> {
	const userCards = database.tableFor<UserCard>('userCards');
	const userCardId = requiredUserCardId(input.userCardId);
	const nowIso = validNowIso(input.nowIso);

	return database.transaction('rw', [userCards], async () => {
		const card = await userCards.get(userCardId);
		if (!card) throw new Error('USER_CARD_NOT_FOUND');
		const updatedCard: UserCard = {
			...card,
			status: input.archived ? 'archived' : 'active',
			updatedAt: nowIso,
		};
		await userCards.put(updatedCard);
		return updatedCard;
	});
}

export async function deleteUserCard(
	database: RepeatOutcomeDatabase,
	userCardIdText: string,
): Promise<DeleteUserCardResult> {
	const userCards = database.tableFor<UserCard>('userCards');
	const longTermGoals = database.tableFor<LongTermGoal>('longTermGoals');
	const stageGoals = database.tableFor<StageGoal>('stageGoals');
	const goalRevisions = database.tableFor<GoalRevision>('goalRevisions');
	const todayDrafts = database.tableFor<TodayDraft, string>('todayDrafts');
	const actionRecords = database.tableFor<ActionRecord>('actionRecords');
	const outcomeBatches = database.tableFor<OutcomeBatch>('outcomeBatches');
	const userCardId = requiredUserCardId(userCardIdText);

	return database.transaction(
		'rw',
		[userCards, longTermGoals, stageGoals, goalRevisions, todayDrafts, actionRecords, outcomeBatches],
		async () => {
			const card = await userCards.get(userCardId);
			if (!card) throw new Error('USER_CARD_NOT_FOUND');

			const relatedLongTermGoals = await longTermGoals.where('userCardId').equals(userCardId).toArray();
			const longTermGoalIds = new Set(relatedLongTermGoals.map(({ id }) => id));
			const relatedStageGoals = (await stageGoals.toArray())
				.filter(({ longTermGoalId }) => longTermGoalIds.has(longTermGoalId));
			const stageGoalIds = new Set(relatedStageGoals.map(({ id }) => id));
			const relatedRevisions = (await goalRevisions.toArray()).filter(({ goalId, goalType }) => (
				goalType === 'longTerm' ? longTermGoalIds.has(goalId) : stageGoalIds.has(goalId)
			));
			const relatedRecords = await actionRecords.where('userCardId').equals(userCardId).toArray();
			const affectedDrafts = (await todayDrafts.toArray()).filter(({ slots }) => (
				slots.some((slot) => slot.userCardId === userCardId)
			));
			const affectedBatches = (await outcomeBatches.toArray()).filter(({ items }) => (
				items.some((item) => item.userCardId === userCardId)
			));

			if (relatedRevisions.length) {
				await goalRevisions.bulkDelete(relatedRevisions.map(({ id }) => id));
			}
			if (relatedRecords.length) {
				await actionRecords.bulkDelete(relatedRecords.map(({ id }) => id));
			}
			if (affectedDrafts.length) {
				await todayDrafts.bulkPut(affectedDrafts.map((draft) => ({
					...draft,
					slots: draft.slots.map((slot) => (
						slot.userCardId === userCardId
							? { ...slot, userCardId: null, valueText: '' }
							: slot
					)),
				})));
			}
			for (const batch of affectedBatches) {
				const items = batch.items.filter((item) => item.userCardId !== userCardId);
				if (items.length) {
					await outcomeBatches.put({ ...batch, items });
				} else {
					await outcomeBatches.delete(batch.id);
				}
			}
			if (relatedStageGoals.length) {
				await stageGoals.bulkDelete(relatedStageGoals.map(({ id }) => id));
			}
			if (relatedLongTermGoals.length) {
				await longTermGoals.bulkDelete(relatedLongTermGoals.map(({ id }) => id));
			}
			await userCards.delete(userCardId);

			return {
				actionRecordCount: relatedRecords.length,
				longTermGoalCount: relatedLongTermGoals.length,
				outcomeBatchCount: affectedBatches.length,
				stageGoalCount: relatedStageGoals.length,
				todayDraftCount: affectedDrafts.length,
			};
		},
	);
}

export function manageUserCardInApp(
	action: UserCardManagementAction,
): Promise<UserCard | DeleteUserCardResult> {
	return appLifecycleCoordinator.runCriticalOperation('manage-card', async (): Promise<UserCard | DeleteUserCardResult> => {
		if (action.type === 'delete') return deleteUserCard(appDatabase, action.userCardId);
		return setUserCardArchived(appDatabase, {
			userCardId: action.userCardId,
			archived: action.type === 'archive',
			nowIso: action.nowIso,
		});
	});
}

export function archiveUserCardInApp(userCardId: string, nowIso: string): Promise<UserCard> {
	return manageUserCardInApp({ type: 'archive', userCardId, nowIso }) as Promise<UserCard>;
}

export function restoreUserCardInApp(userCardId: string, nowIso: string): Promise<UserCard> {
	return manageUserCardInApp({ type: 'restore', userCardId, nowIso }) as Promise<UserCard>;
}

export function deleteUserCardInApp(userCardId: string): Promise<DeleteUserCardResult> {
	return manageUserCardInApp({ type: 'delete', userCardId }) as Promise<DeleteUserCardResult>;
}
