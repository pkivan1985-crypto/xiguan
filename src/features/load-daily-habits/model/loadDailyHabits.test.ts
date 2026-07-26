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
});
