/* eslint-disable i18next/no-literal-string -- Table names, indexes, statuses, and modes are domain identifiers. */
import type { ActionRecord } from '@entities/action-record';
import type { CardTemplate } from '@entities/card-template';
import { seedSystemDefinitions } from '@entities/card-template';
import type { CategoryDefinition } from '@entities/category';
import { calculateGoalProgress, type GoalProgress, type LongTermGoal, type StageGoal } from '@entities/goal';
import type { TodayDraft } from '@entities/today-draft';
import type { UserCard } from '@entities/user-card';
import type { LocalDate } from '@shared/lib/date';
import { appDatabase, type RepeatOutcomeDatabase } from '@shared/lib/db';

export interface DeckSlotView {
	slotIndex: number;
	userCardId: string;
	title: string;
}

export interface DeckCardView {
	id: string;
	title: string;
	template: CardTemplate;
	longTermGoal?: LongTermGoal;
	stageGoal?: StageGoal;
	longTermProgress?: GoalProgress;
	stageProgress?: GoalProgress;
}

export interface DeckCategoryView {
	id: string;
	title: string;
	enabled: boolean;
	cards: DeckCardView[];
}

export interface DeckView {
	slots: Array<DeckSlotView | null>;
	categories: DeckCategoryView[];
}

export async function loadCardDeck(database: RepeatOutcomeDatabase, localDate: LocalDate): Promise<DeckView> {
	const categoriesTable = database.tableFor<CategoryDefinition>('categoryDefinitions');
	const templatesTable = database.tableFor<CardTemplate>('cardTemplates');
	if (!await templatesTable.get('running')) await seedSystemDefinitions(database);
	const cardsTable = database.tableFor<UserCard>('userCards');
	const longTermGoalsTable = database.tableFor<LongTermGoal>('longTermGoals');
	const stageGoalsTable = database.tableFor<StageGoal>('stageGoals');
	const recordsTable = database.tableFor<ActionRecord>('actionRecords');
	const draftsTable = database.tableFor<TodayDraft, string>('todayDrafts');

	const data = await database.transaction('r', [
		categoriesTable, templatesTable, cardsTable, longTermGoalsTable, stageGoalsTable, recordsTable, draftsTable,
	], async () => ({
		categories: await categoriesTable.toArray(),
		templates: await templatesTable.toArray(),
		cards: await cardsTable.where('status').equals('active').toArray(),
		longTermGoals: await longTermGoalsTable.where('status').equals('active').toArray(),
		stageGoals: await stageGoalsTable.where('status').equals('active').toArray(),
		records: await recordsTable.toArray(),
		draft: await draftsTable.get(localDate),
	}));

	const templatesById = new Map(data.templates.map((template) => [template.id, template]));
	const cardsById = new Map(data.cards.map((card) => [card.id, card]));
	const longTermByCard = new Map(data.longTermGoals.map((goal) => [goal.userCardId, goal]));
	const stageByLongTerm = new Map(data.stageGoals.map((goal) => [goal.longTermGoalId, goal]));
	const cardViews = data.cards
		.sort((left, right) => left.sortOrder - right.sortOrder)
		.flatMap((card): DeckCardView[] => {
			const template = templatesById.get(card.officialCardId);
			if (!template) return [];
			const longTermGoal = longTermByCard.get(card.id);
			const stageGoal = longTermGoal ? stageByLongTerm.get(longTermGoal.id) : undefined;
			const longTermRecords = longTermGoal
				? data.records.filter((record) => record.userCardId === card.id && record.longTermGoalId === longTermGoal.id)
				: [];
			const stageRecords = stageGoal
				? data.records.filter((record) => record.userCardId === card.id && record.stageGoalId === stageGoal.id)
				: [];
			const longTermProgress = longTermGoal
				? calculateGoalProgress(longTermRecords, { mode: 'quantity', targetQuantityBase: longTermGoal.targetQuantityBase }) ?? undefined
				: undefined;
			const stageProgress = stageGoal
				? calculateGoalProgress(stageRecords, { mode: stageGoal.mode, targetQuantityBase: stageGoal.targetQuantityBase, targetActiveDays: stageGoal.targetActiveDays }) ?? undefined
				: undefined;
			return [{ id: card.id, title: card.title, template, longTermGoal, stageGoal, longTermProgress, stageProgress }];
		});

	const cardsByCategory = new Map<string, DeckCardView[]>();
	for (const card of cardViews) {
		const list = cardsByCategory.get(card.template.categoryId) ?? [];
		list.push(card);
		cardsByCategory.set(card.template.categoryId, list);
	}
	const categories = data.categories
		.sort((left, right) => left.sortOrder - right.sortOrder)
		.map((category) => ({ id: category.id, title: category.title, enabled: category.enabled, cards: cardsByCategory.get(category.id) ?? [] }));
	const draftByIndex = new Map(data.draft?.slots.map((slot) => [slot.slotIndex, slot]) ?? []);
	const slots = Array.from({ length: 6 }, (_, slotIndex): DeckSlotView | null => {
		const assignment = draftByIndex.get(slotIndex);
		if (!assignment?.userCardId) return null;
		const card = cardsById.get(assignment.userCardId);
		return card ? { slotIndex, userCardId: card.id, title: card.title } : null;
	});

	return { slots, categories };
}

export function loadCardDeckForDate(localDate: LocalDate): Promise<DeckView> {
	return loadCardDeck(appDatabase, localDate);
}
