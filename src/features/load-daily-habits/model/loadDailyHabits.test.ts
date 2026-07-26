import 'fake-indexeddb/auto';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { seedSystemDefinitions } from '@entities/card-template';
import { RepeatOutcomeDatabase } from '@shared/lib/db';

import { loadDailyHabits } from './loadDailyHabits';

let database: RepeatOutcomeDatabase;

beforeEach(async () => {
	database = new RepeatOutcomeDatabase(`test-load-daily-habits-${crypto.randomUUID()}`);
	await seedSystemDefinitions(database);
});

afterEach(async () => {
	database.close();
	await database.delete();
});

describe('loadDailyHabits', () => {
	it('loads every active card with its tracking metadata and today cumulative value', async () => {
		await database.table('userCards').bulkAdd([
			{ id: 'run', officialCardId: 'running', title: '晨跑', status: 'active', sortOrder: 0, createdAt: '2026-07-25T00:00:00.000Z', updatedAt: '2026-07-25T00:00:00.000Z' },
			{ id: 'water', officialCardId: 'water', title: '喝八杯水', status: 'active', sortOrder: 1, createdAt: '2026-07-25T00:00:00.000Z', updatedAt: '2026-07-25T00:00:00.000Z' },
			{ id: 'old', officialCardId: 'sleep', title: '已归档', status: 'archived', sortOrder: 2, createdAt: '2026-07-25T00:00:00.000Z', updatedAt: '2026-07-25T00:00:00.000Z' },
		]);
		await database.table('actionRecords').add({
			id: 'run:2026-07-25',
			userCardId: 'run',
			localDate: '2026-07-25',
			quantityBaseValue: 2500,
			firstSavedAt: '2026-07-25T01:00:00.000Z',
			lastSavedAt: '2026-07-25T01:00:00.000Z',
			lastSubmissionId: 'save-a',
		});

		const result = await loadDailyHabits(database, '2026-07-25');

		expect(result.habits).toHaveLength(2);
		expect(result.habits[0]).toMatchObject({
			id: 'run',
			trackingType: 'quantity',
			iconKey: 'activity',
			quantityBaseValue: 2500,
			displayValue: '2.50',
			displayUnit: 'km',
			stepBase: 500,
			dailyTargetBase: 5000,
		});
		expect(result.habits[1]).toMatchObject({
			id: 'water',
			trackingType: 'count',
			quantityBaseValue: 0,
			displayValue: '0',
			displayUnit: '杯',
		});
	});

	it('returns goal progress derived from real records', async () => {
		await database.table('userCards').add({ id: 'run', officialCardId: 'running', title: '晨跑', status: 'active', sortOrder: 0, createdAt: '2026-07-25T00:00:00.000Z', updatedAt: '2026-07-25T00:00:00.000Z' });
		await database.table('longTermGoals').add({ id: 'long', userCardId: 'run', title: '累计 10 公里', targetQuantityBase: 10000, status: 'active', startDate: '2026-07-01', createdAt: '2026-07-01T00:00:00.000Z', updatedAt: '2026-07-01T00:00:00.000Z' });
		await database.table('actionRecords').add({ id: 'run:2026-07-24', userCardId: 'run', localDate: '2026-07-24', quantityBaseValue: 2500, longTermGoalId: 'long', firstSavedAt: '2026-07-24T01:00:00.000Z', lastSavedAt: '2026-07-24T01:00:00.000Z', lastSubmissionId: 'save-a' });

		const result = await loadDailyHabits(database, '2026-07-25');

		expect(result.habits[0]).toMatchObject({
			goalTitle: '累计 10 公里',
			goalProgressRatio: 0.25,
		});
	});

	it('uses the planned weekday target and omits a habit on a rest day', async () => {
		await database.table('userCards').add({
			id: 'run',
			officialCardId: 'running',
			title: '晨跑',
			dailyPlan: {
				mode: 'custom',
				weekdays: [1, 3, 5],
				customTargetsBaseByWeekday: { 1: 2_000, 3: 3_000, 5: 4_000 },
			},
			status: 'active',
			sortOrder: 0,
			createdAt: '2026-07-27T00:00:00.000Z',
			updatedAt: '2026-07-27T00:00:00.000Z',
		});
		await database.table('longTermGoals').add({ id: 'long', userCardId: 'run', title: '晨跑', targetQuantityBase: 100_000, status: 'active', startDate: '2026-07-27', endDate: '2026-10-24', createdAt: '2026-07-27T00:00:00.000Z', updatedAt: '2026-07-27T00:00:00.000Z' });
		await database.table('stageGoals').add({ id: 'stage', longTermGoalId: 'long', title: '阶段 1', mode: 'quantity', dailyTargetBase: 1_250, targetQuantityBase: 100_000, status: 'active', startDate: '2026-07-27', endDate: '2026-10-24', createdAt: '2026-07-27T00:00:00.000Z', updatedAt: '2026-07-27T00:00:00.000Z' });

		expect((await loadDailyHabits(database, '2026-07-27')).habits[0]).toMatchObject({ dailyTargetBase: 2_000 });
		expect((await loadDailyHabits(database, '2026-07-28')).habits).toHaveLength(0);
	});

	it('derives outcome dates and each active habit display total from effective action records', async () => {
		await database.table('userCards').bulkAdd([
			{ id: 'run', officialCardId: 'running', title: '晨跑', status: 'active', sortOrder: 0, createdAt: '2026-07-20T00:00:00.000Z', updatedAt: '2026-07-20T00:00:00.000Z' },
			{ id: 'water', officialCardId: 'water', title: '喝水', status: 'active', sortOrder: 1, createdAt: '2026-07-20T00:00:00.000Z', updatedAt: '2026-07-20T00:00:00.000Z' },
			{ id: 'archived', officialCardId: 'sleep', title: '已归档', status: 'archived', sortOrder: 2, createdAt: '2026-07-20T00:00:00.000Z', updatedAt: '2026-07-20T00:00:00.000Z' },
		]);
		await database.table('longTermGoals').add({ id: 'run-long', userCardId: 'run', title: '累计十公里', targetQuantityBase: 10_000, status: 'active', startDate: '2026-07-01', createdAt: '2026-07-01T00:00:00.000Z', updatedAt: '2026-07-01T00:00:00.000Z' });
		await database.table('actionRecords').bulkAdd([
			{ id: 'run-old', userCardId: 'run', localDate: '2026-07-21', quantityBaseValue: 500, firstSavedAt: '2026-07-21T08:00:00.000Z', lastSavedAt: '2026-07-21T08:00:00.000Z', lastSubmissionId: 'save-old' },
			{ id: 'run-goal-a', userCardId: 'run', localDate: '2026-07-24', quantityBaseValue: 2_000, longTermGoalId: 'run-long', firstSavedAt: '2026-07-24T08:00:00.000Z', lastSavedAt: '2026-07-24T08:00:00.000Z', lastSubmissionId: 'save-a' },
			{ id: 'run-goal-b', userCardId: 'run', localDate: '2026-07-25', quantityBaseValue: 3_000, longTermGoalId: 'run-long', firstSavedAt: '2026-07-25T08:00:00.000Z', lastSavedAt: '2026-07-25T08:00:00.000Z', lastSubmissionId: 'save-b' },
			{ id: 'water-today', userCardId: 'water', localDate: '2026-07-25', quantityBaseValue: 4, firstSavedAt: '2026-07-25T08:00:00.000Z', lastSavedAt: '2026-07-25T08:00:00.000Z', lastSubmissionId: 'save-c' },
			{ id: 'archived-history', userCardId: 'archived', localDate: '2026-07-20', quantityBaseValue: 1, firstSavedAt: '2026-07-20T08:00:00.000Z', lastSavedAt: '2026-07-20T08:00:00.000Z', lastSubmissionId: 'save-d' },
			{ id: 'deleted-history', userCardId: 'run', localDate: '2026-07-19', quantityBaseValue: 9_000, deletedAt: '2026-07-19T09:00:00.000Z', firstSavedAt: '2026-07-19T08:00:00.000Z', lastSavedAt: '2026-07-19T08:00:00.000Z', lastSubmissionId: 'save-e' },
		]);

		const result = await loadDailyHabits(database, '2026-07-25');

		expect(result.outcomeDates).toEqual(['2026-07-20', '2026-07-21', '2026-07-24', '2026-07-25']);
		expect(result.habits).toHaveLength(2);
		expect(result.habits[0]).toMatchObject({
			id: 'run',
			quantityBaseValue: 3_000,
			totalQuantityBaseValue: 5_500,
			activeDays: 3,
			goalTitle: '累计十公里',
			goalProgressRatio: 0.5,
		});
		expect(result.habits[1]).toMatchObject({
			id: 'water',
			quantityBaseValue: 4,
			totalQuantityBaseValue: 4,
			activeDays: 1,
		});
	});
});
