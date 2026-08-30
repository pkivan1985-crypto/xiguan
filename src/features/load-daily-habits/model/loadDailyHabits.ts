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
import type { IsoWeekday, UserCard } from '@entities/user-card';
import type { HabitConfiguration } from '@entities/user-card';
import type { HabitRecordDetails } from '@entities/action-record';
import type { LocalDate } from '@shared/lib/date';
import { formatLocalDate } from '@shared/lib/date';
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
	basePerDisplayUnit: number;
	maxDecimalPlaces: number;
	baseDailyTargetBase: number;
	dailyTargetBase: number;
	carryInBaseValue: number;
	totalQuantityBaseValue: number;
	monthQuantityBaseValue?: number;
	activeDays: number;
	supportsTrainingDetails: boolean;
	officialCardId?: string;
	habitConfig?: HabitConfiguration;
	details?: HabitRecordDetails;
	durationSeconds?: number;
	averagePaceSecondsPerKm?: number;
	averageHeartRateBpm?: number;
	note?: string;
	entryMethod?: ActionRecord['entryMethod'];
	goalTitle?: string;
	goalProgressRatio?: number;
	scheduledToday: boolean;
	recordedToday: boolean;
	recordSavedAt?: string;
	expenseEntryCount?: number;
	previousRecord?: DailyHabitPreviousRecord;
}

export interface DailyHabitPreviousRecord {
	quantityBaseValue: number;
	displayValue: string;
	durationSeconds?: number;
	averagePaceSecondsPerKm?: number;
	averageHeartRateBpm?: number;
}

export interface DailyHabitsModel {
	localDate: LocalDate;
	outcomeDates: LocalDate[];
	expenseDates?: LocalDate[];
	habits: DailyHabitView[];
	completedCount: number;
	scheduledCount: number;
}

function coversLocalDate(
	goal: Pick<LongTermGoal | StageGoal, 'startDate' | 'endDate'>,
	localDate: LocalDate,
): boolean {
	return goal.startDate <= localDate && (!goal.endDate || localDate <= goal.endDate);
}

function currentLongTermGoal(
	goals: readonly LongTermGoal[],
	userCardId: string,
	localDate: LocalDate,
): LongTermGoal | undefined {
	return goals
		.filter((goal) => goal.userCardId === userCardId)
		.sort((left, right) => {
			const leftCoversDate = coversLocalDate(left, localDate) ? 0 : 1;
			const rightCoversDate = coversLocalDate(right, localDate) ? 0 : 1;
			const leftActive = left.status === 'active' ? 0 : 1;
			const rightActive = right.status === 'active' ? 0 : 1;
			return leftCoversDate - rightCoversDate
				|| leftActive - rightActive
				|| right.updatedAt.localeCompare(left.updatedAt);
		})[0];
}

function currentStageGoal(
	goals: readonly StageGoal[],
	localDate: LocalDate,
): StageGoal | undefined {
	return goals
		.filter((goal) => coversLocalDate(goal, localDate))
		.sort((left, right) => {
			const leftActive = left.status === 'active' ? 0 : 1;
			const rightActive = right.status === 'active' ? 0 : 1;
			return leftActive - rightActive
				|| right.startDate.localeCompare(left.startDate)
				|| right.updatedAt.localeCompare(left.updatedAt);
		})[0]
		?? selectCurrentStageGoal(goals);
}

function cardExistedOnDate(card: UserCard, localDate: LocalDate): boolean {
	const createdAt = new Date(card.createdAt);
	return Number.isNaN(createdAt.getTime())
		|| formatLocalDate(createdAt) <= localDate;
}

function weekday(localDate: LocalDate): IsoWeekday {
	const [year, month, day] = localDate.split('-').map(Number);
	const value = new Date(Date.UTC(year!, month! - 1, day!)).getUTCDay();
	return (value === 0 ? 7 : value) as IsoWeekday;
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
		cards: await cards.toArray(),
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
	const todayWeekday = weekday(localDate);
	const habits = data.cards
		.filter((card) => card.status === 'active')
		.filter((card) => cardExistedOnDate(card, localDate))
		.sort((left, right) => left.sortOrder - right.sortOrder)
		.flatMap((card): DailyHabitView[] => {
			const template = templatesById.get(card.officialCardId);
			if (!template?.enabled) return [];
			const cardRecords = recordsByCard.get(card.id) ?? [];
			const monthPrefix = `${localDate.slice(0, 7)}-`;
			const todayRecord = todayRecords.get(card.id);
			const scheduledByPlan = !card.dailyPlan
				|| card.dailyPlan.weekdays.includes(todayWeekday);
			const scheduledToday = card.officialCardId === 'extra-expense'
				? false
				: scheduledByPlan || todayRecord !== undefined;
			const quantityBaseValue = todayRecord?.quantityBaseValue ?? 0;
			const trackingType = template.trackingType ?? 'quantity';
			const longTermGoal = currentLongTermGoal(data.longTermGoals, card.id, localDate);
			const stageGoal = longTermGoal
				? currentStageGoal(
					data.stageGoals.filter(({ longTermGoalId }) => longTermGoalId === longTermGoal.id),
					localDate,
				)
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
			const baseDailyTargetBase = card.dailyPlan?.mode === 'custom'
				? card.dailyPlan.customTargetsBaseByWeekday?.[todayWeekday]
				: stageGoal?.dailyTargetBase ?? card.dailyPlan?.averageTargetBase;
			const previousRecord = cardRecords
				.filter((record) => record.localDate < localDate)
				.sort((left, right) => right.localDate.localeCompare(left.localDate))[0];
			const carryInBaseValue = todayRecord?.carryInBaseValue
				?? previousRecord?.carryOutBaseValue
				?? 0;
			const resolvedBaseDailyTarget = baseDailyTargetBase
				?? stageGoal?.dailyTargetBase
				?? template.defaultDailyTargetBase
				?? template.quantity.basePerDisplayUnit;
			const configuredDailyTarget = card.habitConfig?.kind === 'light-food'
				? card.habitConfig.rules.length
				: resolvedBaseDailyTarget;
			return [{
				id: card.id,
				officialCardId: card.officialCardId,
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
				basePerDisplayUnit: template.quantity.basePerDisplayUnit,
				maxDecimalPlaces: template.quantity.maxDecimalPlaces,
				baseDailyTargetBase: configuredDailyTarget,
				dailyTargetBase: todayRecord?.plannedQuantityBaseValue
					?? configuredDailyTarget + carryInBaseValue,
				carryInBaseValue,
				totalQuantityBaseValue: cardRecords.reduce((total, record) => total + record.quantityBaseValue, 0),
				monthQuantityBaseValue: cardRecords
					.filter((record) => record.localDate.startsWith(monthPrefix))
					.reduce((total, record) => total + record.quantityBaseValue, 0),
				activeDays: new Set(cardRecords.map((record) => record.localDate)).size,
				supportsTrainingDetails: card.officialCardId === 'running',
				habitConfig: card.habitConfig,
				details: todayRecord?.details,
				durationSeconds: todayRecord?.durationSeconds,
				averagePaceSecondsPerKm: todayRecord?.averagePaceSecondsPerKm,
				averageHeartRateBpm: todayRecord?.averageHeartRateBpm,
				note: todayRecord?.note,
				entryMethod: todayRecord?.entryMethod,
				goalTitle: primaryGoal?.title,
				goalProgressRatio: progress?.ratio,
				scheduledToday,
				recordedToday: todayRecord !== undefined,
				recordSavedAt: todayRecord?.lastSavedAt,
				expenseEntryCount: card.officialCardId === 'extra-expense' && todayRecord
					? todayRecord.details?.kind === 'extra-expense' && 'entries' in todayRecord.details
						? todayRecord.details.entries.length
						: 1
					: 0,
				previousRecord: previousRecord ? {
					quantityBaseValue: previousRecord.quantityBaseValue,
					displayValue: formatQuantityFromBase(previousRecord.quantityBaseValue, template.quantity),
					durationSeconds: previousRecord.durationSeconds,
					averagePaceSecondsPerKm: previousRecord.averagePaceSecondsPerKm,
					averageHeartRateBpm: previousRecord.averageHeartRateBpm,
				} : undefined,
			}];
		});
	const scheduledHabits = habits.filter((habit) => habit.scheduledToday);

	return {
		localDate,
		outcomeDates: [...new Set(effectiveRecords
			.filter((record) => data.cards.find((card) => card.id === record.userCardId)?.officialCardId !== 'extra-expense')
			.map((record) => record.localDate))].sort(),
		expenseDates: [...new Set(effectiveRecords
			.filter((record) => record.localDate.startsWith(`${localDate.slice(0, 7)}-`)
				&& data.cards.find((card) => card.id === record.userCardId)?.officialCardId === 'extra-expense')
			.map((record) => record.localDate))].sort(),
		habits,
		completedCount: scheduledHabits.filter(
			(habit) => habit.entryMethod === 'completed'
				|| habit.quantityBaseValue >= habit.dailyTargetBase,
		).length,
		scheduledCount: scheduledHabits.length,
	};
}

export function loadDailyHabitsInApp(localDate: LocalDate): Promise<DailyHabitsModel> {
	return loadDailyHabits(appDatabase, localDate);
}
