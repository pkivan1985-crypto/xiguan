/* eslint-disable i18next/no-literal-string -- Table names, statuses, and domain errors are stable identifiers. */
import { effectiveActionRecords, groupActionRecordsByLocalDate, type ActionRecord } from '@entities/action-record';
import { formatQuantityFromBase, type CardTemplate, type StageCompletionMode } from '@entities/card-template';
import {
	calculateGoalProgress,
	compareStageGoals,
	selectCurrentStageGoal,
} from '@entities/goal';
import type { GoalCompletionSnapshot, GoalProgress, GoalStatus, LongTermGoal, StageGoal } from '@entities/goal';
import type { UserCard, UserCardStatus } from '@entities/user-card';
import { appDatabase, type RepeatOutcomeDatabase } from '@shared/lib/db';

export interface GoalDetailsCard {
	id: string;
	title: string;
	status: UserCardStatus;
	displayUnit: string;
	basePerDisplayUnit: number;
	maxDecimalPlaces: number;
}

export interface GoalDetailsLongTermGoal {
	id: string;
	title: string;
	status: GoalStatus;
	targetQuantityBase: number;
	startDate: string;
	endDate?: string;
	progress: GoalProgress;
	completionSnapshot?: GoalCompletionSnapshot;
}

export interface GoalDetailsStageGoal {
	id: string;
	title: string;
	status: GoalStatus;
	mode: StageCompletionMode;
	targetQuantityBase?: number;
	targetActiveDays?: number;
	startDate: string;
	endDate?: string;
	progress: GoalProgress;
	completionSnapshot?: GoalCompletionSnapshot;
}

export interface GoalDetailsRecord {
	id: string;
	localDate: string;
	displayValue: string;
	displayUnit: string;
	lastSavedAt: string;
}

export interface GoalDetailsModel {
	card: GoalDetailsCard;
	longTermGoal: GoalDetailsLongTermGoal | null;
	stageGoal: GoalDetailsStageGoal | null;
	stageGoals: GoalDetailsStageGoal[];
	activeDays: number;
	recentRecords: GoalDetailsRecord[];
}

const STATUS_PRIORITY: Record<GoalStatus, number> = { active: 0, completed: 1, expired: 2, planned: 3, abandoned: 4 };

function selectCurrent<T extends LongTermGoal | StageGoal>(goals: readonly T[]): T | undefined {
	return [...goals].sort((left, right) => STATUS_PRIORITY[left.status] - STATUS_PRIORITY[right.status] || right.updatedAt.localeCompare(left.updatedAt))[0];
}

export async function loadGoalDetails(database: RepeatOutcomeDatabase, userCardId: string): Promise<GoalDetailsModel> {
	if (!userCardId.trim()) throw new Error('GOAL_DETAILS_NOT_FOUND');
	const cards = database.tableFor<UserCard>('userCards');
	const templates = database.tableFor<CardTemplate>('cardTemplates');
	const longGoals = database.tableFor<LongTermGoal>('longTermGoals');
	const stageGoals = database.tableFor<StageGoal>('stageGoals');
	const records = database.tableFor<ActionRecord>('actionRecords');
	const data = await database.transaction('r', [cards, templates, longGoals, stageGoals, records], async () => ({
		card: await cards.get(userCardId),
		templates: await templates.toArray(),
		longGoals: await longGoals.where('userCardId').equals(userCardId).toArray(),
		stageGoals: await stageGoals.toArray(),
		records: await records.where('userCardId').equals(userCardId).toArray(),
	}));
	if (!data.card) throw new Error('GOAL_DETAILS_NOT_FOUND');
	const template = data.templates.find(({ id }) => id === data.card?.officialCardId);
	if (!template) throw new Error('GOAL_DETAILS_RELATIONSHIP_INVALID');
	const longGoal = selectCurrent(data.longGoals);
	const relatedStageGoals = longGoal
		? data.stageGoals.filter(({ longTermGoalId }) => longTermGoalId === longGoal.id).sort(compareStageGoals)
		: [];
	const stage = selectCurrentStageGoal(relatedStageGoals);
	const effectiveRecords = effectiveActionRecords(data.records);
	const longProgress = longGoal ? calculateGoalProgress(effectiveRecords.filter(({ longTermGoalId }) => longTermGoalId === longGoal.id), { mode: 'quantity', targetQuantityBase: longGoal.targetQuantityBase }) : null;
	const mappedStageGoals = relatedStageGoals.map((goal): GoalDetailsStageGoal => ({
		id: goal.id,
		title: goal.title,
		status: goal.status,
		mode: goal.mode,
		targetQuantityBase: goal.targetQuantityBase,
		targetActiveDays: goal.targetActiveDays,
		startDate: goal.startDate,
		endDate: goal.endDate,
		progress: calculateGoalProgress(
			effectiveRecords.filter(({ stageGoalId }) => stageGoalId === goal.id),
			{ mode: goal.mode, targetQuantityBase: goal.targetQuantityBase, targetActiveDays: goal.targetActiveDays },
		)!,
		completionSnapshot: goal.completionSnapshot,
	}));
	const stageDetails = stage ? mappedStageGoals.find(({ id }) => id === stage.id) : undefined;
	const recentRecords = groupActionRecordsByLocalDate(effectiveRecords).flatMap(({ records: group }) => group).slice(0, 5).map((record) => ({
		id: record.id,
		localDate: record.localDate,
		displayValue: formatQuantityFromBase(record.quantityBaseValue, template.quantity),
		displayUnit: template.quantity.displayUnit,
		lastSavedAt: record.lastSavedAt,
	}));

	return {
		card: {
			id: data.card.id, title: data.card.title, status: data.card.status,
			displayUnit: template.quantity.displayUnit,
			basePerDisplayUnit: template.quantity.basePerDisplayUnit,
			maxDecimalPlaces: template.quantity.maxDecimalPlaces,
		},
		longTermGoal: longGoal && longProgress ? {
			id: longGoal.id, title: longGoal.title, status: longGoal.status,
			targetQuantityBase: longGoal.targetQuantityBase, startDate: longGoal.startDate,
			endDate: longGoal.endDate, progress: longProgress, completionSnapshot: longGoal.completionSnapshot,
		} : null,
		stageGoal: stageDetails ?? null,
		stageGoals: mappedStageGoals,
		activeDays: new Set(effectiveRecords.map(({ localDate }) => localDate)).size,
		recentRecords,
	};
}

export function loadGoalDetailsInApp(userCardId: string): Promise<GoalDetailsModel> {
	return loadGoalDetails(appDatabase, userCardId);
}
