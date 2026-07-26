/* eslint-disable i18next/no-literal-string -- Table names and statuses are stable domain identifiers. */
import { effectiveActionRecords, type ActionRecord } from '@entities/action-record';
import {
	calculateGoalProgress,
	selectCurrentStageGoal,
	type LongTermGoal,
	type StageGoal,
} from '@entities/goal';
import {
	formatQuantityFromBase,
	seedSystemDefinitions,
	SYSTEM_CARD_TEMPLATES,
	type CardTemplate,
	type HabitTrackingType,
} from '@entities/card-template';
import type { UserCard } from '@entities/user-card';
import type { LocalDate } from '@shared/lib/date';
import { appDatabase, type RepeatOutcomeDatabase } from '@shared/lib/db';

export interface DailyHabitView {
	id: string;
	title: string;
	trackingType: HabitTrackingType;
	iconKey: NonNullable<CardTemplate['iconKey']>;
	accent: NonNullable<CardTemplate['accent']>;
	quantityBaseValue: number;
	displayValue: string;
	displayUnit: string;
	stepBase: number;
	dailyTargetBase: number;
	totalQuantityBaseValue: number;
	activeDays: number;
	goalTitle?: string;
	goalProgressRatio?: number;
}

export interface DailyHabitsModel {
	localDate: LocalDate;
	outcomeDates: LocalDate[];
	habits: DailyHabitView[];
	completedCount: number;
}

function currentLongTermGoal(goals: readonly LongTermGoal[], userCardId: string): LongTermGoal | undefined {
	return goals
		.filter((goal) => goal.userCardId === userCardId)
		.sort((left, right) => {
			const leftActive = left.status === 'active' ? 0 : 1;
			const rightActive = right.status === 'active' ? 0 : 1;
			return leftActive - rightActive || right.updatedAt.localeCompare(left.updatedAt);
		})[0];
}

export async function loadDailyHabits(
	database: RepeatOutcomeDatabase,
	localDate: LocalDate,
): Promise<DailyHabitsModel> {
	const templates = database.tableFor<CardTemplate>('cardTemplates');
	if (await templates.count() < SYSTEM_CARD_TEMPLATES.length) await seedSystemDefinitions(database);

	const cards = database.tableFor<UserCard>('userCards');
	const records = database.tableFor<ActionRecord>('actionRecords');
	const longTermGoals = database.tableFor<LongTermGoal>('longTermGoals');
	const stageGoals = database.tableFor<StageGoal>('stageGoals');
	const data = await database.transaction('r', [templates, cards, records, longTermGoals, stageGoals], async () => ({
		templates: await templates.toArray(),
		cards: await cards.where('status').equals('active').toArray(),
		records: await records.toArray(),
		longTermGoals: await longTermGoals.toArray(),
		stageGoals: await stageGoals.toArray(),
	}));

	const templatesById = new Map(data.templates.map((template) => [template.id, template]));
	const effectiveRecords = effectiveActionRecords(data.records);
	const todayRecords = new Map(
		effectiveRecords
			.filter((record) => record.localDate === localDate)
			.map((record) => [record.userCardId, record]),
	);
	const recordsByCard = new Map<string, ActionRecord[]>();
	for (const record of effectiveRecords) {
		const cardRecords = recordsByCard.get(record.userCardId) ?? [];
		cardRecords.push(record);
		recordsByCard.set(record.userCardId, cardRecords);
	}
	const habits = data.cards
		.sort((left, right) => left.sortOrder - right.sortOrder)
		.flatMap((card): DailyHabitView[] => {
			const template = templatesById.get(card.officialCardId);
			if (!template?.enabled) return [];
			const cardRecords = recordsByCard.get(card.id) ?? [];
			const quantityBaseValue = todayRecords.get(card.id)?.quantityBaseValue ?? 0;
			const trackingType = template.trackingType ?? 'quantity';
			const longTermGoal = currentLongTermGoal(data.longTermGoals, card.id);
			const stageGoal = longTermGoal
				? selectCurrentStageGoal(data.stageGoals.filter(({ longTermGoalId }) => longTermGoalId === longTermGoal.id))
				: undefined;
			const primaryGoal = stageGoal ?? longTermGoal;
			const goalRecords = primaryGoal
				? effectiveRecords.filter((record) => (
					stageGoal ? record.stageGoalId === stageGoal.id : record.longTermGoalId === longTermGoal?.id
				))
				: [];
			const progress = stageGoal
				? calculateGoalProgress(goalRecords, {
					mode: stageGoal.mode,
					targetQuantityBase: stageGoal.targetQuantityBase,
					targetActiveDays: stageGoal.targetActiveDays,
				})
				: longTermGoal
					? calculateGoalProgress(goalRecords, {
						mode: 'quantity',
						targetQuantityBase: longTermGoal.targetQuantityBase,
					})
					: null;
			return [{
				id: card.id,
				title: card.title,
				trackingType,
				iconKey: template.iconKey ?? 'activity',
				accent: template.accent ?? 'blue',
				quantityBaseValue,
				displayValue: trackingType === 'quantity'
					? formatQuantityFromBase(quantityBaseValue, template.quantity)
					: String(quantityBaseValue / template.quantity.basePerDisplayUnit),
				displayUnit: template.quantity.displayUnit,
				stepBase: template.stepBase ?? template.quantity.basePerDisplayUnit,
				dailyTargetBase: template.defaultDailyTargetBase ?? template.quantity.basePerDisplayUnit,
				totalQuantityBaseValue: cardRecords.reduce((total, record) => total + record.quantityBaseValue, 0),
				activeDays: new Set(cardRecords.map((record) => record.localDate)).size,
				goalTitle: primaryGoal?.title,
				goalProgressRatio: progress?.ratio,
			}];
		});

	return {
		localDate,
		outcomeDates: [...new Set(effectiveRecords.map((record) => record.localDate))].sort(),
		habits,
		completedCount: habits.filter((habit) => habit.quantityBaseValue >= habit.dailyTargetBase).length,
	};
}

export function loadDailyHabitsInApp(localDate: LocalDate): Promise<DailyHabitsModel> {
	return loadDailyHabits(appDatabase, localDate);
}
