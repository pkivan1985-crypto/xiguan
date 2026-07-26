import 'fake-indexeddb/auto';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { seedSystemDefinitions } from '@entities/card-template';
import { RepeatOutcomeDatabase } from '@shared/lib/db';

import { saveDailyHabit } from './saveDailyHabit';

const LOCAL_DATE = '2026-07-25';
let database: RepeatOutcomeDatabase;

beforeEach(async () => {
	database = new RepeatOutcomeDatabase(`test-save-daily-habit-${crypto.randomUUID()}`);
	await seedSystemDefinitions(database);
	await database.table('userCards').add({
		id: 'card-a',
		officialCardId: 'running',
		title: '晨跑',
		status: 'active',
		sortOrder: 0,
		createdAt: '2026-07-25T01:00:00.000Z',
		updatedAt: '2026-07-25T01:00:00.000Z',
	});
});

afterEach(async () => {
	database.close();
	await database.delete();
});

describe('saveDailyHabit', () => {
	it('saves one cumulative value and completes its audit batch without playback', async () => {
		const result = await saveDailyHabit(database, {
			userCardId: 'card-a',
			localDate: LOCAL_DATE,
			currentLocalDate: LOCAL_DATE,
			quantityBaseValue: 2500,
			nowIso: '2026-07-25T02:00:00.000Z',
			submissionId: 'save-a',
		});

		expect(result.operation).toBe('save');
		expect(await database.table('actionRecords').get(`card-a:${LOCAL_DATE}`)).toMatchObject({
			quantityBaseValue: 2500,
			lastSubmissionId: 'save-a',
		});
		expect(await database.table('outcomeBatches').get('save-a')).toMatchObject({
			status: 'completed',
			completedAt: '2026-07-25T02:00:00.000Z',
		});
	});

	it('overwrites the same day and deletes it when the value returns to zero', async () => {
		await saveDailyHabit(database, {
			userCardId: 'card-a',
			localDate: LOCAL_DATE,
			currentLocalDate: LOCAL_DATE,
			quantityBaseValue: 2500,
			nowIso: '2026-07-25T02:00:00.000Z',
			submissionId: 'save-a',
		});
		await saveDailyHabit(database, {
			userCardId: 'card-a',
			localDate: LOCAL_DATE,
			currentLocalDate: LOCAL_DATE,
			quantityBaseValue: 3000,
			nowIso: '2026-07-25T03:00:00.000Z',
			submissionId: 'save-b',
		});
		await saveDailyHabit(database, {
			userCardId: 'card-a',
			localDate: LOCAL_DATE,
			currentLocalDate: LOCAL_DATE,
			quantityBaseValue: 0,
			nowIso: '2026-07-25T04:00:00.000Z',
			submissionId: 'delete-a',
		});

		expect(await database.table('actionRecords').count()).toBe(0);
	});

	it('rejects saving a past local date', async () => {
		await expect(saveDailyHabit(database, {
			userCardId: 'card-a',
			localDate: '2026-07-24',
			currentLocalDate: LOCAL_DATE,
			quantityBaseValue: 1,
			nowIso: '2026-07-25T04:00:00.000Z',
			submissionId: 'past-a',
		})).rejects.toThrow('TODAY_DRAFT_DATE_CHANGED');
	});

	it('saves integer-only count presets without adding decimal text', async () => {
		await database.table('userCards').add({
			id: 'card-water',
			officialCardId: 'water',
			title: '喝水',
			status: 'active',
			sortOrder: 1,
			createdAt: '2026-07-25T01:00:00.000Z',
			updatedAt: '2026-07-25T01:00:00.000Z',
		});

		await saveDailyHabit(database, {
			userCardId: 'card-water',
			localDate: LOCAL_DATE,
			currentLocalDate: LOCAL_DATE,
			quantityBaseValue: 1,
			nowIso: '2026-07-25T05:00:00.000Z',
			submissionId: 'water-a',
		});

		expect(await database.table('actionRecords').get(`card-water:${LOCAL_DATE}`)).toMatchObject({ quantityBaseValue: 1 });
	});
});
