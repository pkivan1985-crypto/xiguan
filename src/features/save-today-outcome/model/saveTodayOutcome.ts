/* eslint-disable i18next/no-literal-string -- Transaction modes, statuses, and index names are domain identifiers. */
import type { ActionRecord } from '@entities/action-record';
import { parseQuantityToBase } from '@entities/card-template';
import type { CardTemplate } from '@entities/card-template';
import type { StageCompletionMode } from '@entities/card-template';
import { calculateGoalProgress } from '@entities/goal';
import type { GoalCompletionSnapshot, GoalProgress, GoalRevision, LongTermGoal, StageGoal } from '@entities/goal';
import type { OutcomeBatch, OutcomeBatchItem, OutcomeGoalChange, OutcomeProgressSnapshot } from '@entities/outcome-batch';
import { filledSlotsInOrder, validateTodayDraft } from '@entities/today-draft';
import type { TodayDraft } from '@entities/today-draft';
import type { UserCard } from '@entities/user-card';
import { appDatabase, type RepeatOutcomeDatabase } from '@shared/lib/db';
import { parseLocalDate } from '@shared/lib/date';

export interface SaveTodayOutcomeInput {
	localDate: string;
	currentLocalDate: string;
	nowIso: string;
	submissionId: string;
	confirmedOverLimit?: boolean;
}

function progressSnapshot(progress: GoalProgress, mode: StageCompletionMode): OutcomeProgressSnapshot {
	return {
		mode,
		quantityBaseValue: progress.quantityBaseValue,
		activeDays: progress.activeDays,
		quantityRatio: progress.quantityRatio,
		activeDaysRatio: progress.activeDaysRatio,
		completed: progress.completed,
	};
}

function goalChange(goalId: string, before: GoalProgress, after: GoalProgress, mode: StageCompletionMode): OutcomeGoalChange {
	return { goalId, before: progressSnapshot(before, mode), after: progressSnapshot(after, mode) };
}

function completionSnapshot(
	progress: GoalProgress,
	goal: LongTermGoal | StageGoal,
	nowIso: string,
): GoalCompletionSnapshot {
	const mode = 'mode' in goal ? goal.mode : 'quantity';
	return {
		completedAt: nowIso,
		mode,
		quantityBaseValue: progress.quantityBaseValue,
		activeDays: progress.activeDays,
		targetQuantityBase: goal.targetQuantityBase,
		targetActiveDays: 'targetActiveDays' in goal ? goal.targetActiveDays : undefined,
	};
}

function completionRevision(
	goalType: GoalRevision['goalType'],
	goalId: string,
	beforeStatus: GoalRevision['beforeStatus'],
	input: SaveTodayOutcomeInput,
): GoalRevision {
	return {
		id: `${goalType}:${goalId}:${input.submissionId}`,
		goalType,
		goalId,
		createdAt: input.nowIso,
		reason: 'completed',
		beforeStatus,
		afterStatus: 'completed',
		submissionId: input.submissionId,
	};
}

function assertInput(input: SaveTodayOutcomeInput): void {
	parseLocalDate(input.localDate);
	parseLocalDate(input.currentLocalDate);
	if (input.currentLocalDate !== input.localDate) throw new Error('TODAY_DRAFT_DATE_CHANGED');
	if (!input.submissionId.trim()) throw new Error('SUBMISSION_ID_REQUIRED');
	if (Number.isNaN(Date.parse(input.nowIso))) throw new Error('INVALID_NOW_ISO');
}

export async function saveTodayOutcome(
	database: RepeatOutcomeDatabase,
	input: SaveTodayOutcomeInput,
): Promise<OutcomeBatch> {
	assertInput(input);
	let resultBatchId: string | undefined;
	const tables = {
		cardTemplates: database.tableFor<CardTemplate>('cardTemplates'),
		userCards: database.tableFor<UserCard>('userCards'),
		longTermGoals: database.tableFor<LongTermGoal>('longTermGoals'),
		stageGoals: database.tableFor<StageGoal>('stageGoals'),
		goalRevisions: database.tableFor<GoalRevision>('goalRevisions'),
		todayDrafts: database.tableFor<TodayDraft>('todayDrafts'),
		actionRecords: database.tableFor<ActionRecord>('actionRecords'),
		outcomeBatches: database.tableFor<OutcomeBatch>('outcomeBatches'),
	};

	await database.transaction('rw', [
		tables.cardTemplates,
		tables.userCards,
		tables.longTermGoals,
		tables.stageGoals,
		tables.goalRevisions,
		tables.todayDrafts,
		tables.actionRecords,
		tables.outcomeBatches,
	], async () => {
		const existingBatch = await tables.outcomeBatches.where('submissionId').equals(input.submissionId).first();
		if (existingBatch) {
			resultBatchId = existingBatch.id;
			return;
		}

		const draft = await tables.todayDrafts.get(input.localDate);
		if (!draft) throw new Error('TODAY_DRAFT_NOT_FOUND');
		validateTodayDraft(draft, input.localDate);
		const filledSlots = filledSlotsInOrder(draft);
		if (!filledSlots.length) throw new Error('TODAY_DRAFT_EMPTY');

		const items: OutcomeBatchItem[] = [];
		for (const slot of filledSlots) {
			const userCard = await tables.userCards.get(slot.userCardId!);
			if (!userCard || userCard.status !== 'active') throw new Error('USER_CARD_NOT_AVAILABLE');
			const template = await tables.cardTemplates.get(userCard.officialCardId);
			if (!template || !template.enabled) throw new Error('CARD_TEMPLATE_NOT_AVAILABLE');
			const quantityBaseValue = parseQuantityToBase(slot.valueText, template.quantity, {
				confirmedOverLimit: input.confirmedOverLimit,
			});

			const existingRecord = await tables.actionRecords.where('[userCardId+localDate]').equals([userCard.id, input.localDate]).first();
			let longTermGoal = existingRecord?.longTermGoalId
				? await tables.longTermGoals.get(existingRecord.longTermGoalId)
				: await tables.longTermGoals.where('[userCardId+status]').equals([userCard.id, 'active']).first();
			let stageGoal = existingRecord?.stageGoalId
				? await tables.stageGoals.get(existingRecord.stageGoalId)
				: longTermGoal
					? await tables.stageGoals.where('[longTermGoalId+status]').equals([longTermGoal.id, 'active']).first()
					: undefined;
			const cardRecordsBefore = await tables.actionRecords.where('userCardId').equals(userCard.id).toArray();
			const longTermProgressBefore = longTermGoal
				? calculateGoalProgress(
					cardRecordsBefore.filter(({ longTermGoalId }) => longTermGoalId === longTermGoal?.id),
					{ mode: 'quantity', targetQuantityBase: longTermGoal.targetQuantityBase },
				)
				: null;
			const stageProgressBefore = stageGoal
				? calculateGoalProgress(
					cardRecordsBefore.filter(({ stageGoalId }) => stageGoalId === stageGoal?.id),
					{ mode: stageGoal.mode, targetQuantityBase: stageGoal.targetQuantityBase, targetActiveDays: stageGoal.targetActiveDays },
				)
				: null;

			const record: ActionRecord = {
				id: existingRecord?.id ?? `${userCard.id}:${input.localDate}`,
				userCardId: userCard.id,
				localDate: input.localDate,
				quantityBaseValue,
				longTermGoalId: longTermGoal?.id,
				stageGoalId: stageGoal?.id,
				firstSavedAt: existingRecord?.firstSavedAt ?? input.nowIso,
				lastSavedAt: input.nowIso,
				lastSubmissionId: input.submissionId,
			};
			await tables.actionRecords.put(record);
			const cardRecords = await tables.actionRecords.where('userCardId').equals(userCard.id).toArray();

			let longTermProgress: GoalProgress | null = null;
			if (longTermGoal) {
				const longTermRecords = cardRecords.filter(({ longTermGoalId }) => longTermGoalId === longTermGoal?.id);
				longTermProgress = calculateGoalProgress(longTermRecords, { mode: 'quantity', targetQuantityBase: longTermGoal.targetQuantityBase });
				if (longTermGoal.status === 'active' && longTermProgress?.completed) {
					await tables.goalRevisions.add(completionRevision('longTerm', longTermGoal.id, longTermGoal.status, input));
					longTermGoal = { ...longTermGoal, status: 'completed', updatedAt: input.nowIso, completionSnapshot: completionSnapshot(longTermProgress, longTermGoal, input.nowIso) };
					await tables.longTermGoals.put(longTermGoal);
				}
			}

			let stageProgress: GoalProgress | null = null;
			if (stageGoal) {
				const stageRecords = cardRecords.filter(({ stageGoalId }) => stageGoalId === stageGoal?.id);
				stageProgress = calculateGoalProgress(stageRecords, {
					mode: stageGoal.mode,
					targetQuantityBase: stageGoal.targetQuantityBase,
					targetActiveDays: stageGoal.targetActiveDays,
				});
				if (stageGoal.status === 'active' && stageProgress?.completed) {
					await tables.goalRevisions.add(completionRevision('stage', stageGoal.id, stageGoal.status, input));
					stageGoal = { ...stageGoal, status: 'completed', updatedAt: input.nowIso, completionSnapshot: completionSnapshot(stageProgress, stageGoal, input.nowIso) };
					await tables.stageGoals.put(stageGoal);
				}
			}

			items.push({
				slotIndex: slot.slotIndex,
				userCardId: userCard.id,
				cardTitle: userCard.title,
				quantityBaseValue,
				baseUnit: template.quantity.baseUnit,
				displayUnit: template.quantity.displayUnit,
				longTermChange: longTermGoal && longTermProgressBefore && longTermProgress
					? goalChange(longTermGoal.id, longTermProgressBefore, longTermProgress, 'quantity')
					: undefined,
				stageChange: stageGoal && stageProgressBefore && stageProgress
					? goalChange(stageGoal.id, stageProgressBefore, stageProgress, stageGoal.mode)
					: undefined,
			});
		}

		const batch: OutcomeBatch = {
			id: input.submissionId,
			submissionId: input.submissionId,
			localDate: input.localDate,
			status: 'ready',
			createdAt: input.nowIso,
			items,
		};
		await tables.outcomeBatches.add(batch);
		await tables.todayDrafts.put({ ...draft, status: 'submitted', updatedAt: input.nowIso, lastSubmissionId: input.submissionId });
		resultBatchId = batch.id;
	});

	const batch = resultBatchId ? await tables.outcomeBatches.get(resultBatchId) : undefined;
	if (!batch) throw new Error('OUTCOME_BATCH_READBACK_FAILED');
	return batch;
}

export function saveTodayOutcomeInApp(input: SaveTodayOutcomeInput): Promise<OutcomeBatch> {
	return saveTodayOutcome(appDatabase, input);
}
