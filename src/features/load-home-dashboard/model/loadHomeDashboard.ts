/* eslint-disable i18next/no-literal-string -- Table names and domain statuses are stable identifiers. */
import { outcomeDatesForMonth, type ActionRecord } from '@entities/action-record';
import type { CardTemplate, StageCompletionMode } from '@entities/card-template';
import { calculateGoalProgress, selectCurrentStageGoal } from '@entities/goal';
import type { GoalProgress, GoalStatus, LongTermGoal, StageGoal } from '@entities/goal';
import type { UserCard } from '@entities/user-card';
import { appDatabase, type RepeatOutcomeDatabase } from '@shared/lib/db';

export interface HomeGoalSummaryGoal {
	id: string;
	title: string;
	status: GoalStatus;
	targetQuantityBase: number;
	progress: GoalProgress;
}

export interface HomeGoalSummaryStage {
	id: string;
	title: string;
	status: GoalStatus;
	mode: StageCompletionMode;
	targetQuantityBase?: number;
	targetActiveDays?: number;
	progress: GoalProgress;
}

export interface HomeGoalSummary {
	userCardId: string;
	cardTitle: string;
	displayUnit: string;
	basePerDisplayUnit: number;
	maxDecimalPlaces: number;
	longTermGoal: HomeGoalSummaryGoal | null;
	stageGoal: HomeGoalSummaryStage | null;
}

export interface HomeDashboardModel {
	hasCards: boolean;
	goalSummaries: HomeGoalSummary[];
	outcomeDates: string[];
	expenseDates?: string[];
	outcomeDayCount: number;
	year: number;
	monthIndex: number;
}

export interface LoadHomeDashboardInput {
	year: number;
	monthIndex: number;
}

const STATUS_PRIORITY: Record<GoalStatus, number> = {
	active: 0,
	completed: 1,
	expired: 2,
	planned: 3,
	abandoned: 4,
};

function selectCurrentGoal<T extends LongTermGoal | StageGoal>(goals: readonly T[]): T | undefined {
	return [...goals].sort((left, right) => {
		const statusOrder = STATUS_PRIORITY[left.status] - STATUS_PRIORITY[right.status];
		return statusOrder || right.updatedAt.localeCompare(left.updatedAt);
	})[0];
}

export async function loadHomeDashboard(
	database: RepeatOutcomeDatabase,
	input: LoadHomeDashboardInput,
): Promise<HomeDashboardModel> {
	const cardTemplates = database.tableFor<CardTemplate>('cardTemplates');
	const userCards = database.tableFor<UserCard>('userCards');
	const longTermGoals = database.tableFor<LongTermGoal>('longTermGoals');
	const stageGoals = database.tableFor<StageGoal>('stageGoals');
	const actionRecords = database.tableFor<ActionRecord>('actionRecords');

	const data = await database.transaction('r', [
		cardTemplates,
		userCards,
		longTermGoals,
		stageGoals,
		actionRecords,
	], async () => ({
		templates: await cardTemplates.toArray(),
		cards: await userCards.toArray(),
		longGoals: await longTermGoals.toArray(),
		stages: await stageGoals.toArray(),
		records: await actionRecords.toArray(),
	}));

	const templatesById = new Map(data.templates.map((template) => [template.id, template]));
	const goalSummaries = data.cards
		.filter((card) => card.status === 'active')
		.filter((card) => card.officialCardId !== 'extra-expense')
		.sort((left, right) => left.sortOrder - right.sortOrder)
		.map((card): HomeGoalSummary => {
			const template = templatesById.get(card.officialCardId);
			if (!template) throw new Error('HOME_RELATIONSHIP_INVALID');
			const longGoal = selectCurrentGoal(data.longGoals.filter(({ userCardId }) => userCardId === card.id));
			const stage = longGoal
				? selectCurrentStageGoal(data.stages.filter(({ longTermGoalId }) => longTermGoalId === longGoal.id))
				: undefined;
			const longProgress = longGoal
				? calculateGoalProgress(
					data.records.filter(({ longTermGoalId }) => longTermGoalId === longGoal.id),
					{ mode: 'quantity', targetQuantityBase: longGoal.targetQuantityBase },
				)
				: null;
			const stageProgress = stage
				? calculateGoalProgress(
					data.records.filter(({ stageGoalId }) => stageGoalId === stage.id),
					{ mode: stage.mode, targetQuantityBase: stage.targetQuantityBase, targetActiveDays: stage.targetActiveDays },
				)
				: null;

			return {
				userCardId: card.id,
				cardTitle: card.title,
				displayUnit: template.quantity.displayUnit,
				basePerDisplayUnit: template.quantity.basePerDisplayUnit,
				maxDecimalPlaces: template.quantity.maxDecimalPlaces,
				longTermGoal: longGoal && longProgress
					? {
						id: longGoal.id,
						title: longGoal.title,
						status: longGoal.status,
						targetQuantityBase: longGoal.targetQuantityBase,
						progress: longProgress,
					}
					: null,
				stageGoal: stage && stageProgress
					? {
						id: stage.id,
						title: stage.title,
						status: stage.status,
						mode: stage.mode,
						targetQuantityBase: stage.targetQuantityBase,
						targetActiveDays: stage.targetActiveDays,
						progress: stageProgress,
					}
					: null,
			};
		});
	const expenseCardIds = new Set(data.cards.filter((card) => card.officialCardId === 'extra-expense').map((card) => card.id));
	const outcomeDates = [...outcomeDatesForMonth(data.records.filter((record) => !expenseCardIds.has(record.userCardId)), input.year, input.monthIndex)].sort();
	const expenseDates = [...outcomeDatesForMonth(data.records.filter((record) => expenseCardIds.has(record.userCardId)), input.year, input.monthIndex)].sort();

	return {
		hasCards: goalSummaries.length > 0,
		goalSummaries,
		outcomeDates,
		expenseDates,
		outcomeDayCount: outcomeDates.length,
		year: input.year,
		monthIndex: input.monthIndex,
	};
}

export function loadHomeDashboardInApp(input: LoadHomeDashboardInput): Promise<HomeDashboardModel> {
	return loadHomeDashboard(appDatabase, input);
}
