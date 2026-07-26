/* eslint-disable i18next/no-literal-string -- Table names, indexes, statuses, and modes are domain identifiers. */
import { effectiveActionRecords, type ActionRecord } from '@entities/action-record';
import type { CardTemplate } from '@entities/card-template';
import { seedSystemDefinitions, SYSTEM_CARD_TEMPLATES } from '@entities/card-template';
import type { CategoryDefinition } from '@entities/category';
import {
	calculateGoalProgress,
	compareStageGoals,
	selectCurrentStageGoal,
	type GoalProgress,
	type LongTermGoal,
	type StageGoal,
} from '@entities/goal';
import type { TodayDraft } from '@entities/today-draft';
import type { HabitDailyPlan, UserCard } from '@entities/user-card';
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
	stagePosition?: { current: number; total: number };
	longTermProgress?: GoalProgress;
	stageProgress?: GoalProgress;
	dailyTargetBase?: number;
	dailyPlan?: HabitDailyPlan;
	todayStatus: {
		kind: 'completed' | 'rest' | 'target';
		targetBase?: number;
	};
}

export interface DeckCategoryView {
	id: string;
	title: string;
	enabled: boolean;
	cards: DeckCardView[];
}

export interface ArchivedDeckCardView {
	id: string;
	title: string;
	template: CardTemplate;
}

export interface DeckView {
	slots: Array<DeckSlotView | null>;
	categories: DeckCategoryView[];
	archivedCards: ArchivedDeckCardView[];
	archivedCount: number;
}

function isoWeekday(localDate: LocalDate): 1 | 2 | 3 | 4 | 5 | 6 | 7 {
	const [year, month, day] = localDate.split('-').map(Number);
	const weekday = new Date(Date.UTC(year!, month! - 1, day!)).getUTCDay();
	return (weekday === 0 ? 7 : weekday) as 1 | 2 | 3 | 4 | 5 | 6 | 7;
}

export async function loadCardDeck(database: RepeatOutcomeDatabase, localDate: LocalDate): Promise<DeckView> {
	const categoriesTable = database.tableFor<CategoryDefinition>('categoryDefinitions');
	const templatesTable = database.tableFor<CardTemplate>('cardTemplates');
	if (await templatesTable.count() < SYSTEM_CARD_TEMPLATES.length) await seedSystemDefinitions(database);
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
		cards: await cardsTable.toArray(),
		longTermGoals: await longTermGoalsTable.where('status').equals('active').toArray(),
		stageGoals: await stageGoalsTable.toArray(),
		records: await recordsTable.toArray(),
		draft: await draftsTable.get(localDate),
	}));

	const templatesById = new Map(data.templates.map((template) => [template.id, template]));
	const activeCards = data.cards.filter((card) => card.status === 'active');
	const archivedCards = data.cards
		.filter((card) => card.status === 'archived')
		.sort((left, right) => left.sortOrder - right.sortOrder)
		.flatMap((card): ArchivedDeckCardView[] => {
			const template = templatesById.get(card.officialCardId);
			return template ? [{ id: card.id, title: card.title, template }] : [];
		});
	const cardsById = new Map(activeCards.map((card) => [card.id, card]));
	const longTermByCard = new Map(data.longTermGoals.map((goal) => [goal.userCardId, goal]));
	const effectiveRecords = effectiveActionRecords(data.records);
	const todayWeekday = isoWeekday(localDate);
	const cardViews = activeCards
		.sort((left, right) => left.sortOrder - right.sortOrder)
		.flatMap((card): DeckCardView[] => {
			const template = templatesById.get(card.officialCardId);
			if (!template) return [];
			const longTermGoal = longTermByCard.get(card.id);
			const relatedStageGoals = longTermGoal
				? data.stageGoals.filter(({ longTermGoalId }) => longTermGoalId === longTermGoal.id).sort(compareStageGoals)
				: [];
			const stageGoal = selectCurrentStageGoal(relatedStageGoals);
			const stageIndex = stageGoal ? relatedStageGoals.findIndex(({ id }) => id === stageGoal.id) : -1;
			const longTermRecords = longTermGoal
				? effectiveRecords.filter((record) => record.userCardId === card.id && record.longTermGoalId === longTermGoal.id)
				: [];
			const stageRecords = stageGoal
				? effectiveRecords.filter((record) => record.userCardId === card.id && record.stageGoalId === stageGoal.id)
				: [];
			const longTermProgress = longTermGoal
				? calculateGoalProgress(longTermRecords, { mode: 'quantity', targetQuantityBase: longTermGoal.targetQuantityBase }) ?? undefined
				: undefined;
			const stageProgress = stageGoal
				? calculateGoalProgress(stageRecords, { mode: stageGoal.mode, targetQuantityBase: stageGoal.targetQuantityBase, targetActiveDays: stageGoal.targetActiveDays }) ?? undefined
				: undefined;
			const plannedTargetBase = card.dailyPlan?.mode === 'custom'
				? card.dailyPlan.customTargetsBaseByWeekday?.[todayWeekday]
				: stageGoal?.dailyTargetBase ?? card.dailyPlan?.averageTargetBase;
			const dailyTargetBase = plannedTargetBase
				?? template.defaultDailyTargetBase
				?? template.quantity.basePerDisplayUnit;
			const todayRecord = effectiveRecords.find((record) => (
				record.userCardId === card.id && record.localDate === localDate
			));
			const scheduledToday = !card.dailyPlan || card.dailyPlan.weekdays.includes(todayWeekday);
			const completedToday = todayRecord !== undefined && todayRecord.quantityBaseValue >= dailyTargetBase;
			return [{
				id: card.id,
				title: card.title,
				template,
				longTermGoal,
				stageGoal,
				stagePosition: stageGoal && stageIndex >= 0 ? { current: stageIndex + 1, total: relatedStageGoals.length } : undefined,
				longTermProgress,
				stageProgress,
				dailyTargetBase,
				dailyPlan: card.dailyPlan,
				todayStatus: completedToday
					? { kind: 'completed' }
					: scheduledToday
						? { kind: 'target', targetBase: dailyTargetBase }
						: { kind: 'rest' },
			}];
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

	return {
		slots,
		categories,
		archivedCards,
		archivedCount: archivedCards.length,
	};
}

export function loadCardDeckForDate(localDate: LocalDate): Promise<DeckView> {
	return loadCardDeck(appDatabase, localDate);
}
