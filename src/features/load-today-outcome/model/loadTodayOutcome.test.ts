import 'fake-indexeddb/auto';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { CardTemplate } from '@entities/card-template';
import { createRunningCard } from '@features/create-running-card';
import { assignTodayCard, createEmptyTodayDraft, updateTodayValue } from '@entities/today-draft';
import { RepeatOutcomeDatabase } from '@shared/lib/db';

import { buildBatchFooterSummary, loadTodayOutcome } from './loadTodayOutcome';

let database: RepeatOutcomeDatabase;

beforeEach(() => {
	database = new RepeatOutcomeDatabase(`test-load-today-outcome-${crypto.randomUUID()}`);
});

afterEach(async () => {
	database.close();
	await database.delete();
});

describe('buildBatchFooterSummary', () => {
	it('sums only compatible display units', () => {
		expect(buildBatchFooterSummary([
			{ displayValue: 5.2, displayUnit: 'km', filled: true },
			{ displayValue: 3, displayUnit: 'km', filled: true },
		])).toEqual({ kind: 'total', cardCount: 2, valueText: '8.20', displayUnit: 'km' });
		expect(buildBatchFooterSummary([
			{ displayValue: 5.2, displayUnit: 'km', filled: true },
			{ displayValue: 30, displayUnit: 'min', filled: true },
		])).toEqual({ kind: 'completion', cardCount: 2, filledCount: 2 });
	});
});

describe('loadTodayOutcome', () => {
	it('joins active cards in slot order and returns only unselected cards as available', async () => {
		await createRunningCard(database, runningCardInput('card-a', 'long-a', 'stage-a', '晨跑'));
		await createRunningCard(database, runningCardInput('card-b', 'long-b', 'stage-b', '夜跑'));
		let draft = createEmptyTodayDraft('2026-07-12', '2026-07-12T08:00:00.000Z');
		draft = assignTodayCard(draft, 1, 'card-a', '2026-07-12T08:01:00.000Z');
		draft = updateTodayValue(draft, 1, '5.20', '2026-07-12T08:02:00.000Z');
		await database.table('todayDrafts').add(draft);

		const view = await loadTodayOutcome(database, '2026-07-12', '2026-07-12T09:00:00.000Z');

		expect(view.selectedCards).toEqual([expect.objectContaining({ id: 'card-a', slotIndex: 1, valueText: '5.20', displayUnit: 'km' })]);
		expect(view.availableCards.map(({ id }) => id)).toEqual(['card-b']);
		expect(view.footer).toEqual({ kind: 'total', cardCount: 1, valueText: '5.20', displayUnit: 'km' });
	});

	it('keeps invalid references stored while omitting them from the selected view', async () => {
		let draft = createEmptyTodayDraft('2026-07-12', '2026-07-12T08:00:00.000Z');
		draft = assignTodayCard(draft, 0, 'missing-card', '2026-07-12T08:01:00.000Z');
		await database.table('todayDrafts').add(draft);

		const view = await loadTodayOutcome(database, '2026-07-12', '2026-07-12T09:00:00.000Z');

		expect(view.selectedCards).toEqual([]);
		expect((await database.table('todayDrafts').get('2026-07-12')).slots[0].userCardId).toBe('missing-card');
	});

	it('uses completion counts for mixed units and finds the newest recoverable batch', async () => {
		await createRunningCard(database, runningCardInput('card-a', 'long-a', 'stage-a', '晨跑'));
		const minuteTemplate: CardTemplate = {
			id: 'meditation', categoryId: 'sport', title: '冥想', sortOrder: 1, enabled: true, version: 1,
			defaultStageMode: 'quantity',
			quantity: { baseUnit: 'second', displayUnit: 'min', basePerDisplayUnit: 60, maxDecimalPlaces: 1, confirmationThresholdDisplay: 300 },
		};
		await database.table('cardTemplates').put(minuteTemplate);
		await database.table('userCards').add({ id: 'card-b', officialCardId: 'meditation', title: '冥想', status: 'active', sortOrder: 1, createdAt: '2026-07-01T00:00:00.000Z', updatedAt: '2026-07-01T00:00:00.000Z' });
		let draft = createEmptyTodayDraft('2026-07-12', '2026-07-12T08:00:00.000Z');
		draft = assignTodayCard(draft, 0, 'card-a', '2026-07-12T08:01:00.000Z');
		draft = updateTodayValue(draft, 0, '5.2', '2026-07-12T08:02:00.000Z');
		draft = assignTodayCard(draft, 1, 'card-b', '2026-07-12T08:03:00.000Z');
		draft = updateTodayValue(draft, 1, '30', '2026-07-12T08:04:00.000Z');
		await database.table('todayDrafts').add(draft);
		await database.table('outcomeBatches').bulkAdd([
			{ id: 'older', submissionId: 'older', localDate: '2026-07-12', status: 'ready', createdAt: '2026-07-12T08:00:00.000Z', items: [] },
			{ id: 'newer', submissionId: 'newer', localDate: '2026-07-12', status: 'playing', createdAt: '2026-07-12T09:00:00.000Z', items: [] },
			{ id: 'completed', submissionId: 'completed', localDate: '2026-07-12', status: 'completed', createdAt: '2026-07-12T10:00:00.000Z', items: [] },
		]);

		const view = await loadTodayOutcome(database, '2026-07-12', '2026-07-12T11:00:00.000Z');

		expect(view.footer).toEqual({ kind: 'completion', cardCount: 2, filledCount: 2 });
		expect(view.recoverableBatch?.id).toBe('newer');
	});
});

function runningCardInput(userCardId: string, longTermGoalId: string, stageGoalId: string, cardTitle: string) {
	return {
		cardTitle,
		longTermTitle: `${cardTitle}长期目标`,
		longTermTargetDisplay: '100',
		stageTitle: `${cardTitle}阶段目标`,
		stageTargetDisplay: '20',
		startDate: '2026-07-01',
		nowIso: '2026-07-01T00:00:00.000Z',
		ids: { userCardId, longTermGoalId, stageGoalId },
	};
}
