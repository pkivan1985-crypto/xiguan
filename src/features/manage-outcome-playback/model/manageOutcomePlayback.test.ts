import 'fake-indexeddb/auto';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { ActionRecord } from '@entities/action-record';
import type { OutcomeBatch, OutcomeBatchItem } from '@entities/outcome-batch';
import { RepeatOutcomeDatabase } from '@shared/lib/db';

import { advanceOutcomePlayback, beginOutcomePlayback, completeOutcomePlayback } from './manageOutcomePlayback';

const NOW = '2026-07-12T08:00:00.000Z';
const LATER = '2026-07-12T08:01:00.000Z';
const LATEST = '2026-07-12T08:02:00.000Z';
const itemA: OutcomeBatchItem = { slotIndex: 0, userCardId: 'card-a', cardTitle: '晨跑', quantityBaseValue: 5000, baseUnit: 'meter', displayUnit: 'km' };
const itemB: OutcomeBatchItem = { slotIndex: 1, userCardId: 'card-b', cardTitle: '夜跑', quantityBaseValue: 3000, baseUnit: 'meter', displayUnit: 'km' };
const originalRecords: ActionRecord[] = [{ id: 'card-a:2026-07-12', userCardId: 'card-a', localDate: '2026-07-12', quantityBaseValue: 5000, firstSavedAt: NOW, lastSavedAt: NOW, lastSubmissionId: 'batch-a' }];

let database: RepeatOutcomeDatabase;

beforeEach(() => {
	database = new RepeatOutcomeDatabase(`test-manage-outcome-playback-${crypto.randomUUID()}`);
});

afterEach(async () => {
	database.close();
	await database.delete();
});

async function arrangeBatch(overrides: Partial<OutcomeBatch> = {}): Promise<void> {
	await database.table('actionRecords').bulkAdd(originalRecords);
	await database.table('outcomeBatches').add({
		id: 'batch-a', submissionId: 'batch-a', localDate: '2026-07-12', createdAt: NOW,
		status: 'ready', playbackIndex: 0, items: [itemA, itemB], ...overrides,
	});
}

describe('manageOutcomePlayback', () => {
	it('moves ready to playing, advances safely, and completes without touching records', async () => {
		await arrangeBatch();
		await beginOutcomePlayback(database, 'batch-a', NOW);
		await advanceOutcomePlayback(database, 'batch-a', LATER);
		expect(await database.table('outcomeBatches').get('batch-a')).toMatchObject({ status: 'playing', playbackIndex: 1 });
		await advanceOutcomePlayback(database, 'batch-a', LATEST);
		expect(await database.table('outcomeBatches').get('batch-a')).toMatchObject({ status: 'completed', playbackIndex: 1, completedAt: LATEST });
		expect(await database.table('actionRecords').toArray()).toEqual(originalRecords);
	});

	it('is idempotent when begin or complete is repeated', async () => {
		await arrangeBatch({ items: [itemA] });
		const begun = await beginOutcomePlayback(database, 'batch-a', NOW);
		expect(await beginOutcomePlayback(database, 'batch-a', LATER)).toEqual(begun);
		const completed = await completeOutcomePlayback(database, 'batch-a', LATEST);
		expect(await completeOutcomePlayback(database, 'batch-a', '2026-07-12T08:03:00.000Z')).toEqual(completed);
	});

	it('rejects missing and empty batches', async () => {
		await expect(beginOutcomePlayback(database, 'missing', NOW)).rejects.toThrow('OUTCOME_BATCH_NOT_FOUND');
		await arrangeBatch({ items: [] });
		await expect(beginOutcomePlayback(database, 'batch-a', NOW)).rejects.toThrow('OUTCOME_BATCH_EMPTY');
	});
});
