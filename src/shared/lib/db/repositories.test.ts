import 'fake-indexeddb/auto';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ActionRecordRepository } from '@entities/action-record/repository/actionRecordRepository';
import { GoalRepository } from '@entities/goal/repository/goalRepository';
import { OutcomeBatchRepository } from '@entities/outcome-batch/repository/outcomeBatchRepository';
import { TodayDraftRepository } from '@entities/today-draft/repository/todayDraftRepository';
import { UserCardRepository } from '@entities/user-card/repository/userCardRepository';
import type { LongTermGoal, StageGoal } from '@entities/goal';
import { RepeatOutcomeDatabase } from './repeatOutcomeDatabase';

let database: RepeatOutcomeDatabase;

beforeEach(() => {
	database = new RepeatOutcomeDatabase(`test-repositories-${crypto.randomUUID()}`);
});

afterEach(async () => {
	database.close();
	await database.delete();
});

describe('entity repositories', () => {
	it('round-trips a user card and today draft', async () => {
		const cards = new UserCardRepository(database);
		const drafts = new TodayDraftRepository(database);
		await cards.put({ id: 'card-a', officialCardId: 'running', title: '晨跑', status: 'active', sortOrder: 0, createdAt: '2026-07-11T08:00:00.000Z', updatedAt: '2026-07-11T08:00:00.000Z' });
		await drafts.put({ localDate: '2026-07-11', status: 'editing', updatedAt: '2026-07-11T08:00:00.000Z', slots: [0, 1, 2, 3, 4, 5].map((slotIndex) => ({ slotIndex, userCardId: slotIndex === 0 ? 'card-a' : null, valueText: slotIndex === 0 ? '5' : '' })) });

		expect(await cards.get('card-a')).toMatchObject({ title: '晨跑' });
		expect(await drafts.get('2026-07-11')).toMatchObject({ status: 'editing' });
	});

	it('enforces action-record and submission business uniqueness', async () => {
		const records = new ActionRecordRepository(database);
		const batches = new OutcomeBatchRepository(database);
		const baseRecord = { userCardId: 'card-a', localDate: '2026-07-11', quantityBaseValue: 5000, firstSavedAt: '2026-07-11T08:00:00.000Z', lastSavedAt: '2026-07-11T08:00:00.000Z', lastSubmissionId: 'submission-a' };
		await records.put({ ...baseRecord, id: 'record-a' });
		await batches.add({ id: 'batch-a', submissionId: 'submission-a', localDate: '2026-07-11', status: 'ready', createdAt: '2026-07-11T08:00:00.000Z', items: [] });

		await expect(records.put({ ...baseRecord, id: 'record-b' })).rejects.toMatchObject({ name: 'ConstraintError' });
		await expect(batches.add({ id: 'batch-b', submissionId: 'submission-a', localDate: '2026-07-11', status: 'ready', createdAt: '2026-07-11T08:01:00.000Z', items: [] })).rejects.toMatchObject({ name: 'ConstraintError' });
	});

	it('allows historical goals but rejects a second active goal for the same owner', async () => {
		const goals = new GoalRepository(database);
		const longTerm = (id: string, status: LongTermGoal['status']): LongTermGoal => ({ id, userCardId: 'card-a', title: id, targetQuantityBase: 10000, status, startDate: '2026-07-01', createdAt: '2026-07-01T00:00:00.000Z', updatedAt: '2026-07-01T00:00:00.000Z' });
		await goals.addLongTermGoal(longTerm('old-a', 'completed'));
		await goals.addLongTermGoal(longTerm('old-b', 'abandoned'));
		await goals.addLongTermGoal(longTerm('active-a', 'active'));

		await expect(goals.addLongTermGoal(longTerm('active-b', 'active'))).rejects.toThrow('ACTIVE_LONG_TERM_GOAL_EXISTS');
		expect(await database.table('longTermGoals').count()).toBe(3);
	});

	it('rejects a second active stage goal under one long-term goal', async () => {
		const goals = new GoalRepository(database);
		const stage = (id: string, status: StageGoal['status']): StageGoal => ({ id, longTermGoalId: 'long-a', title: id, mode: 'activeDays', targetActiveDays: 3, status, startDate: '2026-07-01', createdAt: '2026-07-01T00:00:00.000Z', updatedAt: '2026-07-01T00:00:00.000Z' });
		await goals.addStageGoal(stage('stage-old', 'completed'));
		await goals.addStageGoal(stage('stage-active', 'active'));

		await expect(goals.addStageGoal(stage('stage-second', 'active'))).rejects.toThrow('ACTIVE_STAGE_GOAL_EXISTS');
	});
});
