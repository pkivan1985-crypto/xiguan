/* eslint-disable i18next/no-literal-string -- Domain errors and table names are stable identifiers. */
import type { ActionRecord } from '@entities/action-record';
import {
	calculateGoalProgress,
	reconcileGoalAfterCorrection,
	selectNextPlannedStageGoal,
} from '@entities/goal';
import type {
	GoalCompletionSnapshot,
	GoalRevision,
	GoalStatus,
	LongTermGoal,
	StageGoal,
} from '@entities/goal';
import { appDatabase, type RepeatOutcomeDatabase } from '@shared/lib/db';
import { parseLocalDate } from '@shared/lib/date';
import { appLifecycleCoordinator } from '@shared/lib/app-lifecycle';

export interface CorrectActionRecordInput {
	actionRecordId: string;
	operation: 'update' | 'delete';
	quantityBaseValue?: number;
	currentLocalDate: string;
	nowIso: string;
	correctionId: string;
}

export interface CorrectActionRecordResult {
	operation: CorrectActionRecordInput['operation'];
	actionRecordId: string;
	changedGoalIds: string[];
}

function assertInput(input: CorrectActionRecordInput): void {
	parseLocalDate(input.currentLocalDate);
	if (!input.actionRecordId.trim()) throw new Error('ACTION_RECORD_ID_REQUIRED');
	if (!input.correctionId.trim()) throw new Error('CORRECTION_ID_REQUIRED');
	if (Number.isNaN(Date.parse(input.nowIso))) throw new Error('INVALID_NOW_ISO');
	if (input.operation === 'update') {
		if (!Number.isSafeInteger(input.quantityBaseValue) || input.quantityBaseValue! <= 0) {
			throw new Error('INVALID_QUANTITY');
		}
	} else if (input.quantityBaseValue !== undefined) {
		throw new Error('DELETE_QUANTITY_NOT_ALLOWED');
	}
}

function snapshotChanged(
	before: GoalCompletionSnapshot | undefined,
	after: GoalCompletionSnapshot | undefined,
): boolean {
	return JSON.stringify(before) !== JSON.stringify(after);
}

function correctionRevision(
	goalType: GoalRevision['goalType'],
	goalId: string,
	beforeStatus: GoalStatus,
	afterStatus: GoalStatus,
	input: CorrectActionRecordInput,
): GoalRevision {
	return {
		id: `${goalType}:${goalId}:${input.correctionId}`,
		goalType,
		goalId,
		createdAt: input.nowIso,
		reason: 'correction',
		beforeStatus,
		afterStatus,
		submissionId: input.correctionId,
	};
}

export async function correctActionRecord(
	database: RepeatOutcomeDatabase,
	input: CorrectActionRecordInput,
): Promise<CorrectActionRecordResult> {
	assertInput(input);

	const actionRecords = database.tableFor<ActionRecord>('actionRecords');
	const longTermGoals = database.tableFor<LongTermGoal>('longTermGoals');
	const stageGoals = database.tableFor<StageGoal>('stageGoals');
	const goalRevisions = database.tableFor<GoalRevision>('goalRevisions');
	let result: CorrectActionRecordResult | undefined;

	await database.transaction('rw', [
		actionRecords,
		longTermGoals,
		stageGoals,
		goalRevisions,
	], async () => {
		const record = await actionRecords.get(input.actionRecordId);
		if (!record && input.operation === 'delete') {
			result = { operation: 'delete', actionRecordId: input.actionRecordId, changedGoalIds: [] };
			return;
		}
		if (!record) throw new Error('ACTION_RECORD_NOT_FOUND');
		if (record.localDate !== input.currentLocalDate) throw new Error('ACTION_RECORD_NOT_TODAY');
		if (record.lastSubmissionId === input.correctionId) {
			result = { operation: input.operation, actionRecordId: record.id, changedGoalIds: [] };
			return;
		}

		if (input.operation === 'delete') {
			await actionRecords.delete(record.id);
		} else {
			await actionRecords.put({
				...record,
				quantityBaseValue: input.quantityBaseValue!,
				entryMethod: 'adjustment',
				carryOutBaseValue: record.plannedQuantityBaseValue === undefined
					? record.carryOutBaseValue
					: Math.max(0, record.plannedQuantityBaseValue - input.quantityBaseValue!),
				lastSavedAt: input.nowIso,
				lastSubmissionId: input.correctionId,
			});
		}

		const cardRecords = await actionRecords.where('userCardId').equals(record.userCardId).toArray();
		const changedGoalIds: string[] = [];

		if (record.longTermGoalId) {
			const goal = await longTermGoals.get(record.longTermGoalId);
			if (!goal) throw new Error('LONG_TERM_GOAL_NOT_FOUND');
			const progress = calculateGoalProgress(
				cardRecords.filter(({ longTermGoalId }) => longTermGoalId === goal.id),
				{ mode: 'quantity', targetQuantityBase: goal.targetQuantityBase },
			)!;
			const next = reconcileGoalAfterCorrection(goal, progress, input.currentLocalDate, input.nowIso);
			if (next.status !== goal.status || snapshotChanged(goal.completionSnapshot, next.completionSnapshot)) {
				await longTermGoals.put(next);
				await goalRevisions.put(correctionRevision('longTerm', goal.id, goal.status, next.status, input));
				changedGoalIds.push(goal.id);
			}
		}

		if (record.stageGoalId) {
			const goal = await stageGoals.get(record.stageGoalId);
			if (!goal) throw new Error('STAGE_GOAL_NOT_FOUND');
			const progress = calculateGoalProgress(
				cardRecords.filter(({ stageGoalId }) => stageGoalId === goal.id),
				{
					mode: goal.mode,
					targetQuantityBase: goal.targetQuantityBase,
					targetActiveDays: goal.targetActiveDays,
				},
			)!;
			const next = reconcileGoalAfterCorrection(goal, progress, input.currentLocalDate, input.nowIso);
			if (next.status !== goal.status || snapshotChanged(goal.completionSnapshot, next.completionSnapshot)) {
				if (goal.status === 'completed' && next.status === 'active') {
					const activeSiblings = await stageGoals
						.where('[longTermGoalId+status]')
						.equals([goal.longTermGoalId, 'active'])
						.toArray();
					for (const sibling of activeSiblings.filter(({ id }) => id !== goal.id)) {
						await stageGoals.put({ ...sibling, status: 'planned', updatedAt: input.nowIso });
						await goalRevisions.put(correctionRevision('stage', sibling.id, sibling.status, 'planned', input));
						changedGoalIds.push(sibling.id);
					}
				}
				await stageGoals.put(next);
				await goalRevisions.put(correctionRevision('stage', goal.id, goal.status, next.status, input));
				changedGoalIds.push(goal.id);
				if (next.status === 'completed') {
					const longTermGoal = record.longTermGoalId
						? await longTermGoals.get(record.longTermGoalId)
						: undefined;
					if (longTermGoal?.status === 'active') {
						const siblings = await stageGoals.where('longTermGoalId').equals(goal.longTermGoalId).toArray();
						const nextPlanned = selectNextPlannedStageGoal(siblings);
						if (nextPlanned) {
							await stageGoals.put({ ...nextPlanned, status: 'active', updatedAt: input.nowIso });
							await goalRevisions.put(correctionRevision('stage', nextPlanned.id, nextPlanned.status, 'active', input));
							changedGoalIds.push(nextPlanned.id);
						}
					}
				}
			}
		}

		result = { operation: input.operation, actionRecordId: record.id, changedGoalIds };
	});

	if (!result) throw new Error('CORRECTION_RESULT_MISSING');
	return result;
}

export function correctActionRecordInApp(
	input: CorrectActionRecordInput,
): Promise<CorrectActionRecordResult> {
	return appLifecycleCoordinator.runCriticalOperation('correct-record', () => correctActionRecord(appDatabase, input));
}
