import 'fake-indexeddb/auto';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRunningCard } from '@features/create-running-card';
import { RepeatOutcomeDatabase } from '@shared/lib/db';

import { loadCardDeck } from './loadCardDeck';

let database: RepeatOutcomeDatabase;

beforeEach(() => {
	database = new RepeatOutcomeDatabase(`test-load-card-deck-${crypto.randomUUID()}`);
});

afterEach(async () => {
	database.close();
	await database.delete();
});

describe('loadCardDeck', () => {
	it('returns seeded categories and exactly six truthful empty slots', async () => {
		const view = await loadCardDeck(database, '2026-07-11');

		expect(view.slots).toEqual([null, null, null, null, null, null]);
		expect(view.categories.map(({ id, enabled, cards }) => ({ id, enabled, cards: cards.length }))).toEqual([
			{ id: 'sport', enabled: true, cards: 0 },
			{ id: 'reading', enabled: false, cards: 0 },
			{ id: 'output', enabled: false, cards: 0 },
		]);
	});

	it('joins real cards, goals, goal-scoped progress, and today slots', async () => {
		await createRunningCard(database, {
			cardTitle: '晨跑', longTermTitle: '累计跑步 100 公里', longTermTargetDisplay: '100',
			stageTitle: '阶段跑步 20 公里', stageTargetDisplay: '20', startDate: '2026-07-01',
			nowIso: '2026-07-01T00:00:00.000Z', ids: { userCardId: 'card-a', longTermGoalId: 'long-a', stageGoalId: 'stage-a' },
		});
		await database.table('actionRecords').add({
			id: 'record-a', userCardId: 'card-a', localDate: '2026-07-11', quantityBaseValue: 5_000,
			longTermGoalId: 'long-a', stageGoalId: 'stage-a', firstSavedAt: '2026-07-11T08:00:00.000Z',
			lastSavedAt: '2026-07-11T08:00:00.000Z', lastSubmissionId: 'submission-a',
		});
		await database.table('actionRecords').add({
			id: 'record-old', userCardId: 'card-a', localDate: '2026-07-10', quantityBaseValue: 50_000,
			longTermGoalId: 'old-long', stageGoalId: 'old-stage', firstSavedAt: '2026-07-10T08:00:00.000Z',
			lastSavedAt: '2026-07-10T08:00:00.000Z', lastSubmissionId: 'submission-old',
		});
		await database.table('todayDrafts').add({
			localDate: '2026-07-11', status: 'editing', updatedAt: '2026-07-11T08:00:00.000Z',
			slots: [0, 1, 2, 3, 4, 5].map((slotIndex) => ({ slotIndex, userCardId: slotIndex === 0 ? 'card-a' : null, valueText: '' })),
		});

		const view = await loadCardDeck(database, '2026-07-11');
		const card = view.categories[0]?.cards[0];

		expect(view.slots[0]).toEqual({ slotIndex: 0, userCardId: 'card-a', title: '晨跑' });
		expect(card).toMatchObject({ title: '晨跑', longTermGoal: { id: 'long-a' }, stageGoal: { id: 'stage-a' } });
		expect(card?.longTermProgress).toMatchObject({ quantityBaseValue: 5_000, ratio: 0.05 });
		expect(card?.stageProgress).toMatchObject({ quantityBaseValue: 5_000, ratio: 0.25 });
	});

	it('ignores archived cards and invalid draft references', async () => {
		await createRunningCard(database, {
			cardTitle: '晨跑', longTermTitle: '累计跑步 100 公里', longTermTargetDisplay: '100',
			stageTitle: '阶段跑步 20 公里', stageTargetDisplay: '20', startDate: '2026-07-01',
			nowIso: '2026-07-01T00:00:00.000Z', ids: { userCardId: 'card-a', longTermGoalId: 'long-a', stageGoalId: 'stage-a' },
		});
		await database.table('userCards').update('card-a', { status: 'archived' });
		await database.table('todayDrafts').add({
			localDate: '2026-07-11', status: 'editing', updatedAt: '2026-07-11T08:00:00.000Z',
			slots: [{ slotIndex: 0, userCardId: 'missing-card', valueText: '' }],
		});

		const view = await loadCardDeck(database, '2026-07-11');

		expect(view.categories[0]?.cards).toEqual([]);
		expect(view.slots).toEqual([null, null, null, null, null, null]);
	});
});
