import 'fake-indexeddb/auto';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { assignTodayCard, createEmptyTodayDraft } from '@entities/today-draft';
import { RepeatOutcomeDatabase } from '@shared/lib/db';

import { openTodayDraft, updateTodayDraft } from './manageTodayDraft';

let database: RepeatOutcomeDatabase;

beforeEach(() => {
	database = new RepeatOutcomeDatabase(`test-manage-today-draft-${crypto.randomUUID()}`);
});

afterEach(async () => {
	database.close();
	await database.delete();
});

describe('manageTodayDraft', () => {
	it('creates once, reopens the same date, and never inherits yesterday', async () => {
		const yesterday = assignTodayCard(
			createEmptyTodayDraft('2026-07-11', '2026-07-11T08:00:00.000Z'),
			0,
			'card-a',
			'2026-07-11T08:01:00.000Z',
		);
		await database.table('todayDrafts').put(yesterday);

		const today = await openTodayDraft(database, '2026-07-12', '2026-07-12T08:00:00.000Z');
		expect(today.slots.every(({ userCardId }) => userCardId === null)).toBe(true);
		expect(await openTodayDraft(database, '2026-07-12', '2026-07-12T09:00:00.000Z')).toEqual(today);
		expect(await database.table('todayDrafts').count()).toBe(2);
	});

	it('updates and validates inside one transaction', async () => {
		await openTodayDraft(database, '2026-07-12', '2026-07-12T08:00:00.000Z');

		const updated = await updateTodayDraft(database, '2026-07-12', (draft) =>
			assignTodayCard(draft, 0, 'card-a', '2026-07-12T08:01:00.000Z'),
		);

		expect(updated.slots[0]).toMatchObject({ userCardId: 'card-a' });
		expect(await database.table('todayDrafts').get('2026-07-12')).toEqual(updated);
	});

	it('rejects a missing or date-drifted draft without writing', async () => {
		await expect(updateTodayDraft(database, '2026-07-12', (draft) => draft)).rejects.toThrow('TODAY_DRAFT_NOT_FOUND');
		await openTodayDraft(database, '2026-07-12', '2026-07-12T08:00:00.000Z');
		await expect(updateTodayDraft(database, '2026-07-12', (draft) => ({ ...draft, localDate: '2026-07-13' }))).rejects.toThrow('TODAY_DRAFT_DATE_CHANGED');
		expect(await database.table('todayDrafts').get('2026-07-13')).toBeUndefined();
	});
});
