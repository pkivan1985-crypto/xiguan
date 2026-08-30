import 'fake-indexeddb/auto';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { seedSystemDefinitions } from '@entities/card-template';
import type { TodayDraft } from '@entities/today-draft';
import { completeOutcomePlayback } from '@features/manage-outcome-playback';
import { RepeatOutcomeDatabase } from '@shared/lib/db';

import { saveDailyHabit } from './saveDailyHabit';

vi.mock('@features/manage-outcome-playback', async (importOriginal) => {
	const actual = await importOriginal<typeof import('@features/manage-outcome-playback')>();
	return {
		...actual,
		completeOutcomePlayback: vi.fn(actual.completeOutcomePlayback),
	};
});

const LOCAL_DATE = '2026-07-25';
let database: RepeatOutcomeDatabase;

function existingSixSlotDraft(): TodayDraft {
	return {
		localDate: LOCAL_DATE,
		status: 'editing',
		updatedAt: '2026-07-25T01:30:00.000Z',
		slots: Array.from({ length: 6 }, (_, slotIndex) => ({
			slotIndex,
			userCardId: slotIndex === 0 ? 'card-a' : null,
			valueText: slotIndex === 0 ? '9.50' : '',
		})),
	};
}

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
	vi.clearAllMocks();
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

	it('stores the actual run, training details, and only carries a shortfall forward', async () => {
		await saveDailyHabit(database, {
			userCardId: 'card-a',
			localDate: LOCAL_DATE,
			currentLocalDate: LOCAL_DATE,
			quantityBaseValue: 3_000,
			entryMethod: 'actual',
			plannedQuantityBaseValue: 5_000,
			carryInBaseValue: 0,
			durationSeconds: 1_560,
			averagePaceSecondsPerKm: 520,
			averageHeartRateBpm: 148,
			note: '河边慢跑',
			nowIso: '2026-07-25T02:30:00.000Z',
			submissionId: 'save-training',
		});

		expect(await database.table('actionRecords').get(`card-a:${LOCAL_DATE}`)).toMatchObject({
			quantityBaseValue: 3_000,
			entryMethod: 'actual',
			plannedQuantityBaseValue: 5_000,
			carryInBaseValue: 0,
			carryOutBaseValue: 2_000,
			durationSeconds: 1_560,
			averagePaceSecondsPerKm: 520,
			averageHeartRateBpm: 148,
			note: '河边慢跑',
		});

		await saveDailyHabit(database, {
			userCardId: 'card-a',
			localDate: LOCAL_DATE,
			currentLocalDate: LOCAL_DATE,
			quantityBaseValue: 6_000,
			entryMethod: 'actual',
			plannedQuantityBaseValue: 5_000,
			carryInBaseValue: 0,
			nowIso: '2026-07-25T03:00:00.000Z',
			submissionId: 'save-surplus',
		});

		expect(await database.table('actionRecords').get(`card-a:${LOCAL_DATE}`)).toMatchObject({
			quantityBaseValue: 6_000,
			carryOutBaseValue: 0,
		});
	});

	it('preserves an explicit completed check-in when later details use an actual value', async () => {
		await saveDailyHabit(database, {
			userCardId: 'card-a',
			localDate: LOCAL_DATE,
			currentLocalDate: LOCAL_DATE,
			quantityBaseValue: 5_000,
			entryMethod: 'completed',
			plannedQuantityBaseValue: 5_000,
			carryInBaseValue: 0,
			nowIso: '2026-07-25T02:00:00.000Z',
			submissionId: 'complete-run',
		});

		await saveDailyHabit(database, {
			userCardId: 'card-a',
			localDate: LOCAL_DATE,
			currentLocalDate: LOCAL_DATE,
			quantityBaseValue: 3_000,
			entryMethod: 'actual',
			plannedQuantityBaseValue: 5_000,
			carryInBaseValue: 0,
			durationSeconds: 1_800,
			note: '补充训练详情',
			nowIso: '2026-07-25T03:00:00.000Z',
			submissionId: 'edit-run-details',
		});

		expect(await database.table('actionRecords').get(`card-a:${LOCAL_DATE}`)).toMatchObject({
			quantityBaseValue: 3_000,
			entryMethod: 'completed',
			durationSeconds: 1_800,
			note: '补充训练详情',
		});
	});

	it('stores preset-specific optional details without changing the cumulative fact', async () => {
		await saveDailyHabit(database, {
			userCardId: 'card-a',
			localDate: LOCAL_DATE,
			currentLocalDate: LOCAL_DATE,
			quantityBaseValue: 2_500,
			entryMethod: 'actual',
			details: {
				kind: 'reading',
				bookTitle: '活着',
				durationMinutes: 35,
				startPage: 18,
				endPage: 42,
				chapter: '第三章',
				reflection: '人物选择比情节更有力量。',
			},
			nowIso: '2026-07-25T02:30:00.000Z',
			submissionId: 'save-reading-details',
		});

		expect(await database.table('actionRecords').get(`card-a:${LOCAL_DATE}`)).toMatchObject({
			quantityBaseValue: 2_500,
			details: {
				kind: 'reading',
				bookTitle: '活着',
				durationMinutes: 35,
				startPage: 18,
				endPage: 42,
				chapter: '第三章',
				reflection: '人物选择比情节更有力量。',
			},
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

	it('updates an existing historical event record through an explicit correction', async () => {
		await database.table('userCards').add({
			id: 'expense-card',
			officialCardId: 'extra-expense',
			title: '额外开支',
			status: 'active',
			sortOrder: 1,
			createdAt: '2026-07-20T01:00:00.000Z',
			updatedAt: '2026-07-20T01:00:00.000Z',
		});
		await saveDailyHabit(database, {
			userCardId: 'expense-card',
			localDate: '2026-07-24',
			currentLocalDate: LOCAL_DATE,
			recordingContext: 'backfill',
			quantityBaseValue: 2_000,
			details: {
				kind: 'extra-expense',
				entries: [{
					id: 'expense-a', amountCents: 2_000, item: '临时用品', reason: '出门忘带',
					necessity: 'delayable', occurredTime: '10:30',
					createdAt: '2026-07-24T02:30:00.000Z', updatedAt: '2026-07-24T02:30:00.000Z',
				}],
			},
			nowIso: '2026-07-25T02:30:00.000Z',
			submissionId: 'expense-backfill',
		});

		await saveDailyHabit(database, {
			userCardId: 'expense-card',
			localDate: '2026-07-24',
			currentLocalDate: LOCAL_DATE,
			recordingContext: 'correction',
			quantityBaseValue: 2_800,
			details: {
				kind: 'extra-expense',
				entries: [{
					id: 'expense-a', amountCents: 2_800, item: '临时用品', reason: '补充实际金额',
					necessity: 'delayable', occurredTime: '10:30',
					createdAt: '2026-07-24T02:30:00.000Z', updatedAt: '2026-07-25T03:00:00.000Z',
				}],
			},
			nowIso: '2026-07-25T03:00:00.000Z',
			submissionId: 'expense-correction',
		});

		expect(await database.table('actionRecords').get('expense-card:2026-07-24')).toMatchObject({
			quantityBaseValue: 2_800,
			lastSubmissionId: 'expense-correction',
			details: { kind: 'extra-expense', entries: [{ amountCents: 2_800, reason: '补充实际金额' }] },
		});
	});

	it('deletes the final line of an existing historical event record', async () => {
		await database.table('actionRecords').add({
			id: 'card-a:2026-07-24', userCardId: 'card-a', localDate: '2026-07-24', quantityBaseValue: 2_000,
			firstSavedAt: '2026-07-24T02:00:00.000Z', lastSavedAt: '2026-07-24T02:00:00.000Z',
			lastSubmissionId: 'expense-original',
		});

		await saveDailyHabit(database, {
			userCardId: 'card-a',
			localDate: '2026-07-24',
			currentLocalDate: LOCAL_DATE,
			recordingContext: 'correction',
			quantityBaseValue: 0,
			nowIso: '2026-07-25T04:00:00.000Z',
			submissionId: 'expense-delete',
		});

		expect(await database.table('actionRecords').get('card-a:2026-07-24')).toBeUndefined();
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

	it('allows an explicit historical backfill while still rejecting future records', async () => {
		await expect(saveDailyHabit(database, {
			userCardId: 'card-a',
			localDate: '2026-07-24',
			currentLocalDate: LOCAL_DATE,
			recordingContext: 'backfill',
			quantityBaseValue: 2_500,
			plannedQuantityBaseValue: 5_000,
			nowIso: '2026-07-25T04:10:00.000Z',
			submissionId: 'backfill-a',
		})).resolves.toEqual({
			operation: 'save',
			actionRecordId: 'card-a:2026-07-24',
		});
		expect(await database.table('actionRecords').get('card-a:2026-07-24')).toMatchObject({
			quantityBaseValue: 2_500,
			plannedQuantityBaseValue: 5_000,
			carryOutBaseValue: 2_500,
		});

		await expect(saveDailyHabit(database, {
			userCardId: 'card-a',
			localDate: '2026-07-26',
			currentLocalDate: LOCAL_DATE,
			recordingContext: 'backfill',
			quantityBaseValue: 1,
			nowIso: '2026-07-25T04:20:00.000Z',
			submissionId: 'future-a',
		})).rejects.toThrow('FUTURE_RECORD_NOT_ALLOWED');
	});

	it('does not let backfill overwrite an existing historical record', async () => {
		await saveDailyHabit(database, {
			userCardId: 'card-a',
			localDate: '2026-07-24',
			currentLocalDate: LOCAL_DATE,
			recordingContext: 'backfill',
			quantityBaseValue: 2_500,
			nowIso: '2026-07-25T04:10:00.000Z',
			submissionId: 'backfill-first',
		});

		await expect(saveDailyHabit(database, {
			userCardId: 'card-a',
			localDate: '2026-07-24',
			currentLocalDate: LOCAL_DATE,
			recordingContext: 'backfill',
			quantityBaseValue: 5_000,
			nowIso: '2026-07-25T04:20:00.000Z',
			submissionId: 'backfill-duplicate',
		})).rejects.toThrow('BACKFILL_RECORD_EXISTS');
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

	it('preserves an existing six-slot draft while saving one habit immediately', async () => {
		const originalDraft = existingSixSlotDraft();
		await database.table('todayDrafts').put(originalDraft);

		await saveDailyHabit(database, {
			userCardId: 'card-a',
			localDate: LOCAL_DATE,
			currentLocalDate: LOCAL_DATE,
			quantityBaseValue: 2500,
			nowIso: '2026-07-25T06:00:00.000Z',
			submissionId: 'preserve-draft',
		});

		expect(await database.table('todayDrafts').get(LOCAL_DATE)).toEqual(originalDraft);
		expect(await database.table('actionRecords').get(`card-a:${LOCAL_DATE}`)).toMatchObject({
			quantityBaseValue: 2500,
			lastSubmissionId: 'preserve-draft',
		});
	});

	it('saves concurrent single habits from isolated callers without sharing a draft', async () => {
		await database.table('userCards').add({
			id: 'card-water',
			officialCardId: 'water',
			title: '喝水',
			status: 'active',
			sortOrder: 1,
			createdAt: '2026-07-25T01:00:00.000Z',
			updatedAt: '2026-07-25T01:00:00.000Z',
		});

		await Promise.all([
			saveDailyHabit(database, {
				userCardId: 'card-a',
				localDate: LOCAL_DATE,
				currentLocalDate: LOCAL_DATE,
				quantityBaseValue: 2500,
				nowIso: '2026-07-25T07:00:00.000Z',
				submissionId: 'concurrent-run',
			}),
			saveDailyHabit(database, {
				userCardId: 'card-water',
				localDate: LOCAL_DATE,
				currentLocalDate: LOCAL_DATE,
				quantityBaseValue: 3,
				nowIso: '2026-07-25T07:00:01.000Z',
				submissionId: 'concurrent-water',
			}),
		]);

		expect(await database.table('actionRecords').get(`card-a:${LOCAL_DATE}`)).toMatchObject({
			quantityBaseValue: 2500,
			lastSubmissionId: 'concurrent-run',
		});
		expect(await database.table('actionRecords').get(`card-water:${LOCAL_DATE}`)).toMatchObject({
			quantityBaseValue: 3,
			lastSubmissionId: 'concurrent-water',
		});
	});

	it('reports a successful save when only playback completion fails after the record commits', async () => {
		vi.mocked(completeOutcomePlayback).mockRejectedValueOnce(new Error('PLAYBACK_WRITE_FAILED'));

		await expect(saveDailyHabit(database, {
			userCardId: 'card-a',
			localDate: LOCAL_DATE,
			currentLocalDate: LOCAL_DATE,
			quantityBaseValue: 2500,
			nowIso: '2026-07-25T08:00:00.000Z',
			submissionId: 'playback-failure',
		})).resolves.toEqual({
			operation: 'save',
			actionRecordId: `card-a:${LOCAL_DATE}`,
		});

		expect(await database.table('actionRecords').get(`card-a:${LOCAL_DATE}`)).toMatchObject({
			quantityBaseValue: 2500,
			lastSubmissionId: 'playback-failure',
		});
		expect(await database.table('outcomeBatches').get('playback-failure')).toMatchObject({
			status: 'ready',
		});
	});
});
