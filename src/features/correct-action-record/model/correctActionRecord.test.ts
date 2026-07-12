import 'fake-indexeddb/auto';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { correctActionRecord } from './correctActionRecord';
import type { ActionRecord } from '@entities/action-record';
import type { GoalCompletionSnapshot, GoalRevision, LongTermGoal, StageGoal } from '@entities/goal';
import { RepeatOutcomeDatabase } from '@shared/lib/db';

let database: RepeatOutcomeDatabase;

const completedSnapshot: GoalCompletionSnapshot = {
	completedAt: '2026-07-12T08:00:00.000Z',
	mode: 'quantity',
	quantityBaseValue: 10_000,
	activeDays: 2,
	targetQuantityBase: 10_000,
};

function longTermGoal(overrides: Partial<LongTermGoal> = {}): LongTermGoal {
	return {
		id: 'long-1',
		userCardId: 'card-1',
		title: '长期 10 km',
		targetQuantityBase: 10_000,
		status: 'completed',
		startDate: '2026-07-01',
		endDate: '2026-12-31',
		createdAt: '2026-07-01T00:00:00.000Z',
		updatedAt: '2026-07-12T08:00:00.000Z',
		completionSnapshot: completedSnapshot,
		...overrides,
	};
}

function stageGoal(overrides: Partial<StageGoal> = {}): StageGoal {
	return {
		id: 'stage-1',
		longTermGoalId: 'long-1',
		title: '阶段目标',
		mode: 'quantity',
		targetQuantityBase: 10_000,
		status: 'completed',
		startDate: '2026-07-01',
		endDate: '2026-07-31',
		createdAt: '2026-07-01T00:00:00.000Z',
		updatedAt: '2026-07-12T08:00:00.000Z',
		completionSnapshot: completedSnapshot,
		...overrides,
	};
}

function record(overrides: Partial<ActionRecord> = {}): ActionRecord {
	return {
		id: 'record-1',
		userCardId: 'card-1',
		localDate: '2026-07-12',
		quantityBaseValue: 10_000,
		longTermGoalId: 'long-1',
		stageGoalId: 'stage-1',
		firstSavedAt: '2026-07-12T08:00:00.000Z',
		lastSavedAt: '2026-07-12T08:00:00.000Z',
		lastSubmissionId: 'submission-1',
		...overrides,
	};
}

const updateInput = {
	actionRecordId: 'record-1',
	operation: 'update' as const,
	quantityBaseValue: 5_000,
	currentLocalDate: '2026-07-12',
	nowIso: '2026-07-12T10:00:00.000Z',
	correctionId: 'correction-1',
};

async function seed(
	records: ActionRecord[] = [record()],
	longGoals: LongTermGoal[] = [longTermGoal()],
	stageGoals: StageGoal[] = [stageGoal()],
): Promise<void> {
	await database.tableFor<LongTermGoal>('longTermGoals').bulkAdd(longGoals);
	await database.tableFor<StageGoal>('stageGoals').bulkAdd(stageGoals);
	await database.tableFor<ActionRecord>('actionRecords').bulkAdd(records);
}

beforeEach(() => {
	database = new RepeatOutcomeDatabase(`test-correct-action-record-${crypto.randomUUID()}`);
});

afterEach(async () => {
	vi.restoreAllMocks();
	await database.delete();
});

describe('correctActionRecord', () => {
	it('rejects a record outside the current local date without changing facts', async () => {
		await seed([record({ localDate: '2026-07-11' })]);

		await expect(correctActionRecord(database, updateInput)).rejects.toThrow('ACTION_RECORD_NOT_TODAY');
		expect(await database.tableFor<ActionRecord>('actionRecords').get('record-1')).toMatchObject({ quantityBaseValue: 10_000 });
		expect(await database.tableFor<GoalRevision>('goalRevisions').count()).toBe(0);
	});

	it.each([0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1])('rejects invalid update quantity %s', async (quantityBaseValue) => {
		await seed();
		await expect(correctActionRecord(database, { ...updateInput, quantityBaseValue })).rejects.toThrow('INVALID_QUANTITY');
	});

	it('updates only quantity and audit fields while preserving immutable links', async () => {
		await seed();

		await correctActionRecord(database, updateInput);

		expect(await database.tableFor<ActionRecord>('actionRecords').get('record-1')).toEqual({
			...record(),
			quantityBaseValue: 5_000,
			lastSavedAt: updateInput.nowIso,
			lastSubmissionId: updateInput.correctionId,
		});
	});

	it('deletes the record and releases its card-date unique key', async () => {
		await seed();

		await correctActionRecord(database, { ...updateInput, operation: 'delete', quantityBaseValue: undefined });

		expect(await database.tableFor<ActionRecord>('actionRecords').get('record-1')).toBeUndefined();
		await expect(database.tableFor<ActionRecord>('actionRecords').add(record({ id: 'record-2' }))).resolves.toBe('record-2');
	});

	it('removes completed quantity-goal snapshots and writes correction revisions', async () => {
		await seed();

		const result = await correctActionRecord(database, updateInput);

		expect(result.changedGoalIds).toEqual(['long-1', 'stage-1']);
		expect(await database.tableFor<LongTermGoal>('longTermGoals').get('long-1')).toMatchObject({ status: 'active', completionSnapshot: undefined });
		expect(await database.tableFor<StageGoal>('stageGoals').get('stage-1')).toMatchObject({ status: 'active', completionSnapshot: undefined });
		expect((await database.tableFor<GoalRevision>('goalRevisions').toArray()).map(({ reason }) => reason)).toEqual(['correction', 'correction']);
	});

	it('recalculates activeDays after deleting one of two outcome dates', async () => {
		await seed(
			[
				record({ quantityBaseValue: 1_000 }),
				record({ id: 'record-old', localDate: '2026-07-11', quantityBaseValue: 1_000, lastSubmissionId: 'submission-old' }),
			],
			[longTermGoal({ status: 'active', completionSnapshot: undefined })],
			[stageGoal({ mode: 'activeDays', targetQuantityBase: undefined, targetActiveDays: 2, completionSnapshot: { ...completedSnapshot, mode: 'activeDays', targetQuantityBase: undefined, targetActiveDays: 2 } })],
		);

		await correctActionRecord(database, { ...updateInput, operation: 'delete', quantityBaseValue: undefined });

		expect(await database.tableFor<StageGoal>('stageGoals').get('stage-1')).toMatchObject({ status: 'active', completionSnapshot: undefined });
	});

	it('uses the lower both-mode fact after a quantity correction', async () => {
		await seed(
			[
				record({ quantityBaseValue: 5_000 }),
				record({ id: 'record-old', localDate: '2026-07-11', quantityBaseValue: 5_000, lastSubmissionId: 'submission-old' }),
			],
			[longTermGoal({ status: 'active', targetQuantityBase: 100_000, completionSnapshot: undefined })],
			[stageGoal({ mode: 'both', targetQuantityBase: 10_000, targetActiveDays: 2, completionSnapshot: { ...completedSnapshot, mode: 'both', targetActiveDays: 2 } })],
		);

		await correctActionRecord(database, { ...updateInput, quantityBaseValue: 1_000 });

		expect(await database.tableFor<StageGoal>('stageGoals').get('stage-1')).toMatchObject({ status: 'active', completionSnapshot: undefined });
	});

	it('is idempotent for repeated updates and deletes', async () => {
		await seed();

		await correctActionRecord(database, updateInput);
		await correctActionRecord(database, updateInput);
		expect(await database.tableFor<GoalRevision>('goalRevisions').count()).toBe(2);

		const deleteInput = { ...updateInput, operation: 'delete' as const, quantityBaseValue: undefined, correctionId: 'correction-delete' };
		await correctActionRecord(database, deleteInput);
		await expect(correctActionRecord(database, deleteInput)).resolves.toMatchObject({ operation: 'delete', actionRecordId: 'record-1' });
	});

	it('rolls back record, goals, snapshots, and revisions when a write fails', async () => {
		await seed();
		vi.spyOn(database.tableFor<GoalRevision>('goalRevisions'), 'put').mockRejectedValueOnce(new Error('INJECTED_REVISION_FAILURE'));

		await expect(correctActionRecord(database, updateInput)).rejects.toThrow('INJECTED_REVISION_FAILURE');

		expect(await database.tableFor<ActionRecord>('actionRecords').get('record-1')).toEqual(record());
		expect(await database.tableFor<LongTermGoal>('longTermGoals').get('long-1')).toEqual(longTermGoal());
		expect(await database.tableFor<StageGoal>('stageGoals').get('stage-1')).toEqual(stageGoal());
		expect(await database.tableFor<GoalRevision>('goalRevisions').count()).toBe(0);
	});
});
