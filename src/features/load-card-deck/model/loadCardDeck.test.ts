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
			{ id: 'nutrition', enabled: true, cards: 0 },
			{ id: 'learning', enabled: true, cards: 0 },
			{ id: 'recovery', enabled: true, cards: 0 },
			{ id: 'focus', enabled: true, cards: 0 },
			{ id: 'life-management', enabled: true, cards: 0 },
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
		expect(card?.todayStatus).toEqual({ kind: 'completed' });
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
		expect(view.archivedCount).toBe(1);
		expect(view.archivedCards).toEqual([expect.objectContaining({
			id: 'card-a',
			title: '晨跑',
			template: expect.objectContaining({ id: 'running' }),
		})]);
	});

	it('returns active cards by category and sort order while keeping progress scoped to the current goal', async () => {
		await database.table('userCards').bulkAdd([
			{ id: 'run-later', officialCardId: 'running', title: '夜跑', status: 'active', sortOrder: 2, createdAt: '2026-07-01T00:00:00.000Z', updatedAt: '2026-07-01T00:00:00.000Z' },
			{ id: 'run-first', officialCardId: 'running', title: '晨跑', status: 'active', sortOrder: 1, createdAt: '2026-07-01T00:00:00.000Z', updatedAt: '2026-07-01T00:00:00.000Z' },
			{ id: 'reading', officialCardId: 'reading-time', title: '读书', status: 'active', sortOrder: 0, createdAt: '2026-07-01T00:00:00.000Z', updatedAt: '2026-07-01T00:00:00.000Z' },
			{ id: 'archived', officialCardId: 'sleep', title: '已归档', status: 'archived', sortOrder: 0, createdAt: '2026-07-01T00:00:00.000Z', updatedAt: '2026-07-01T00:00:00.000Z' },
		]);
		await database.table('longTermGoals').add({ id: 'current-long', userCardId: 'run-first', title: '累计十公里', targetQuantityBase: 10_000, status: 'active', startDate: '2026-07-01', createdAt: '2026-07-01T00:00:00.000Z', updatedAt: '2026-07-01T00:00:00.000Z' });
		await database.table('actionRecords').bulkAdd([
			{ id: 'current-record', userCardId: 'run-first', localDate: '2026-07-11', quantityBaseValue: 2_500, longTermGoalId: 'current-long', firstSavedAt: '2026-07-11T08:00:00.000Z', lastSavedAt: '2026-07-11T08:00:00.000Z', lastSubmissionId: 'submission-a' },
			{ id: 'old-record', userCardId: 'run-first', localDate: '2026-07-10', quantityBaseValue: 7_500, longTermGoalId: 'old-long', firstSavedAt: '2026-07-10T08:00:00.000Z', lastSavedAt: '2026-07-10T08:00:00.000Z', lastSubmissionId: 'submission-b' },
		]);

		const view = await loadCardDeck(database, '2026-07-11');

		expect(view.categories.map((category) => ({ id: category.id, cards: category.cards.map((card) => card.title) }))).toEqual([
			{ id: 'sport', cards: ['晨跑', '夜跑'] },
			{ id: 'nutrition', cards: [] },
			{ id: 'learning', cards: ['读书'] },
			{ id: 'recovery', cards: [] },
			{ id: 'focus', cards: [] },
			{ id: 'life-management', cards: [] },
		]);
		expect(view.archivedCount).toBe(1);
		expect(view.archivedCards.map(({ id, title }) => ({ id, title }))).toEqual([
			{ id: 'archived', title: '已归档' },
		]);
		expect(view.categories[0]?.cards[0]?.longTermProgress).toMatchObject({ quantityBaseValue: 2_500, ratio: 0.25 });
	});

	it('describes an unselected weekday as rest and a selected weekday with its real target', async () => {
		await database.table('userCards').add({
			id: 'planned-run',
			officialCardId: 'running',
			title: '隔日跑',
			dailyPlan: { mode: 'custom', weekdays: [1, 3, 5], customTargetsBaseByWeekday: { 1: 2_000, 3: 3_000, 5: 4_000 } },
			status: 'active',
			sortOrder: 0,
			createdAt: '2026-07-01T00:00:00.000Z',
			updatedAt: '2026-07-01T00:00:00.000Z',
		});

		const monday = await loadCardDeck(database, '2026-07-27');
		const tuesday = await loadCardDeck(database, '2026-07-28');

		expect(monday.categories[0]?.cards[0]?.todayStatus).toEqual({ kind: 'target', targetBase: 2_000 });
		expect(tuesday.categories[0]?.cards[0]?.todayStatus).toEqual({ kind: 'rest' });
	});

	it('shows the direct average target when the card has no stage goals', async () => {
		await database.table('userCards').add({
			id: 'direct-run',
			officialCardId: 'running',
			title: 'Direct run',
			dailyPlan: { mode: 'average', weekdays: [1, 3, 5], averageTargetBase: 2_500 },
			status: 'active',
			sortOrder: 0,
			createdAt: '2026-07-27T00:00:00.000Z',
			updatedAt: '2026-07-27T00:00:00.000Z',
		});

		const monday = await loadCardDeck(database, '2026-07-27');

		expect(monday.categories[0]?.cards[0]).toMatchObject({
			stageGoal: undefined,
			dailyTargetBase: 2_500,
			todayStatus: { kind: 'target', targetBase: 2_500 },
		});
	});

	it('describes an expense card as event-driven until that day has a record', async () => {
		await database.table('userCards').add({
			id: 'expense-card', officialCardId: 'extra-expense', title: '额外开支',
			status: 'active', sortOrder: 0,
			createdAt: '2026-07-01T00:00:00.000Z', updatedAt: '2026-07-01T00:00:00.000Z',
		});

		const before = await loadCardDeck(database, '2026-07-27');
		expect(before.categories.find(({ id }) => id === 'life-management')?.cards[0]?.todayStatus).toEqual({ kind: 'event' });

		await database.table('actionRecords').add({
			id: 'expense-card:2026-07-27', userCardId: 'expense-card', localDate: '2026-07-27', quantityBaseValue: 2_800,
			firstSavedAt: '2026-07-27T02:00:00.000Z', lastSavedAt: '2026-07-27T02:00:00.000Z', lastSubmissionId: 'expense-a',
		});
		const after = await loadCardDeck(database, '2026-07-27');
		expect(after.categories.find(({ id }) => id === 'life-management')?.cards[0]?.todayStatus).toEqual({ kind: 'completed' });
	});
});
