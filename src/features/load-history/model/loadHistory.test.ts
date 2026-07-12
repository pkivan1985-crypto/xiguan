import 'fake-indexeddb/auto';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { loadHistory } from './loadHistory';
import type { ActionRecord } from '@entities/action-record';
import { createRunningCard } from '@features/create-running-card';
import { RepeatOutcomeDatabase } from '@shared/lib/db';

let database: RepeatOutcomeDatabase;

function record(id: string, localDate: string, quantityBaseValue: number, lastSavedAt: string): ActionRecord {
	return {
		id,
		userCardId: 'card-a',
		localDate,
		quantityBaseValue,
		longTermGoalId: 'long-card-a',
		stageGoalId: 'stage-card-a',
		firstSavedAt: lastSavedAt,
		lastSavedAt,
		lastSubmissionId: `submission-${id}`,
	};
}

async function seedCard(): Promise<void> {
	await createRunningCard(database, {
		cardTitle: '晨跑', longTermTitle: '累计 100 km', longTermTargetDisplay: '100',
		stageTitle: '阶段 20 km', stageTargetDisplay: '20', startDate: '2026-07-01',
		nowIso: '2026-07-01T00:00:00.000Z', ids: { userCardId: 'card-a', longTermGoalId: 'long-card-a', stageGoalId: 'stage-card-a' },
	});
}

beforeEach(() => {
	database = new RepeatOutcomeDatabase(`test-load-history-${crypto.randomUUID()}`);
});

afterEach(async () => {
	database.close();
	await database.delete();
});

describe('loadHistory', () => {
	it('groups dates descending and records by save time descending', async () => {
		await seedCard();
		await database.tableFor<ActionRecord>('actionRecords').bulkAdd([
			record('older-date', '2026-07-10', 3_000, '2026-07-10T08:00:00.000Z'),
			{ ...record('today-early', '2026-07-12', 4_000, '2026-07-12T07:00:00.000Z'), userCardId: 'card-b' },
			record('today-late', '2026-07-12', 5_000, '2026-07-12T09:00:00.000Z'),
		]);

		const model = await loadHistory(database, '2026-07-12');

		expect(model.groups.map(({ localDate, records }) => [localDate, records.map(({ id }) => id)])).toEqual([
			['2026-07-12', ['today-late', 'today-early']],
			['2026-07-10', ['older-date']],
		]);
	});

	it('formats quantity and includes card, save time, and goal association', async () => {
		await seedCard();
		await database.tableFor<ActionRecord>('actionRecords').add(record('today', '2026-07-12', 7_500, '2026-07-12T08:42:00.000Z'));

		const item = (await loadHistory(database, '2026-07-12')).groups[0]?.records[0];

		expect(item).toMatchObject({
			id: 'today', cardTitle: '晨跑', displayValue: '7.50', displayUnit: 'km',
			basePerDisplayUnit: 1000, maxDecimalPlaces: 3, confirmationThresholdDisplay: 100,
			lastSavedAt: '2026-07-12T08:42:00.000Z', longTermGoalTitle: '累计 100 km',
			stageGoalTitle: '阶段 20 km', canCorrect: true, relationAvailable: true,
		});
	});

	it('marks only current-local-date records correctable', async () => {
		await seedCard();
		await database.tableFor<ActionRecord>('actionRecords').bulkAdd([
			record('today', '2026-07-12', 1_000, '2026-07-12T08:00:00.000Z'),
			record('past', '2026-07-11', 1_000, '2026-07-11T08:00:00.000Z'),
		]);

		const model = await loadHistory(database, '2026-07-12');

		expect(model.groups.flatMap(({ records }) => records).map(({ id, canCorrect }) => ({ id, canCorrect }))).toEqual([
			{ id: 'today', canCorrect: true }, { id: 'past', canCorrect: false },
		]);
	});

	it('keeps archived-card history visible', async () => {
		await seedCard();
		await database.table('userCards').update('card-a', { status: 'archived' });
		await database.tableFor<ActionRecord>('actionRecords').add(record('past', '2026-07-11', 1_000, '2026-07-11T08:00:00.000Z'));

		const item = (await loadHistory(database, '2026-07-12')).groups[0]?.records[0];
		expect(item).toMatchObject({ cardTitle: '晨跑', relationAvailable: true, canCorrect: false });
	});

	it('returns an explicit unavailable relation instead of inventing metadata', async () => {
		await database.tableFor<ActionRecord>('actionRecords').add(record('orphan', '2026-07-12', 7_500, '2026-07-12T08:00:00.000Z'));

		const item = (await loadHistory(database, '2026-07-12')).groups[0]?.records[0];
		expect(item).toMatchObject({
			cardTitle: '', displayValue: '7500', displayUnit: '', basePerDisplayUnit: 1,
			maxDecimalPlaces: 0, relationAvailable: false, canCorrect: false,
		});
	});
});
