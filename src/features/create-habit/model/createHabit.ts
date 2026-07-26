/* eslint-disable i18next/no-literal-string -- Domain identifiers and errors are not user-facing. */
import {
	parseQuantityToBase,
	seedSystemDefinitions,
	SYSTEM_CARD_TEMPLATES,
	type CardTemplate,
} from '@entities/card-template';
import type { LongTermGoal, StageGoal } from '@entities/goal';
import type { UserCard } from '@entities/user-card';
import { appLifecycleCoordinator } from '@shared/lib/app-lifecycle';
import { parseLocalDate } from '@shared/lib/date';
import { appDatabase, type RepeatOutcomeDatabase } from '@shared/lib/db';

interface OptionalPlanInput {
	title: string;
	targetDisplay: string;
}

export interface CreateHabitInput {
	templateId: string;
	cardTitle: string;
	startDate: string;
	longTerm?: OptionalPlanInput;
	stage?: OptionalPlanInput;
	stages?: readonly OptionalPlanInput[];
	nowIso: string;
	ids: {
		userCardId: string;
		longTermGoalId: string;
		stageGoalId: string;
		stageGoalIds?: readonly string[];
	};
}

export interface CreateHabitResult {
	userCard: UserCard;
	longTermGoal?: LongTermGoal;
	stageGoal?: StageGoal;
	stageGoals: StageGoal[];
}

function required(value: string, code: string): string {
	const trimmed = value.trim();
	if (!trimmed) throw new Error(code);
	return trimmed;
}

export async function createHabit(
	database: RepeatOutcomeDatabase,
	input: CreateHabitInput,
): Promise<CreateHabitResult> {
	const templates = database.tableFor<CardTemplate>('cardTemplates');
	if (await templates.count() < SYSTEM_CARD_TEMPLATES.length) await seedSystemDefinitions(database);
	const template = await templates.get(required(input.templateId, 'TEMPLATE_REQUIRED'));
	if (!template?.enabled) throw new Error('CARD_TEMPLATE_NOT_AVAILABLE');
	const stageInputs = input.stages ?? (input.stage ? [input.stage] : []);
	if (stageInputs.length > 0 && !input.longTerm) throw new Error('STAGE_REQUIRES_LONG_TERM');
	const cardTitle = required(input.cardTitle, 'CARD_TITLE_REQUIRED');
	const startDate = parseLocalDate(input.startDate);
	if (Number.isNaN(Date.parse(input.nowIso))) throw new Error('INVALID_NOW_ISO');

	const userCards = database.tableFor<UserCard>('userCards');
	const longTermGoals = database.tableFor<LongTermGoal>('longTermGoals');
	const stageGoalsTable = database.tableFor<StageGoal>('stageGoals');
	const userCard: UserCard = {
		id: input.ids.userCardId,
		officialCardId: template.id,
		title: cardTitle,
		status: 'active',
		sortOrder: await userCards.count(),
		createdAt: input.nowIso,
		updatedAt: input.nowIso,
	};
	const targetOptions = { confirmedOverLimit: true };
	const longTermGoal = input.longTerm ? {
		id: input.ids.longTermGoalId,
		userCardId: userCard.id,
		title: required(input.longTerm.title, 'GOAL_TITLE_REQUIRED'),
		targetQuantityBase: parseQuantityToBase(input.longTerm.targetDisplay, template.quantity, targetOptions),
		status: 'active' as const,
		startDate,
		createdAt: input.nowIso,
		updatedAt: input.nowIso,
	} satisfies LongTermGoal : undefined;
	const stageGoalIds = input.ids.stageGoalIds ?? [input.ids.stageGoalId];
	if (stageInputs.length > stageGoalIds.length) throw new Error('STAGE_GOAL_ID_REQUIRED');
	const createdAt = Date.parse(input.nowIso);
	const stageTargets = stageInputs.map((stage) => parseQuantityToBase(stage.targetDisplay, template.quantity, targetOptions));
	if (longTermGoal && stageTargets.reduce((total, target) => total + target, 0) > longTermGoal.targetQuantityBase) {
		throw new Error('STAGE_TARGETS_EXCEED_LONG_TERM');
	}
	const stageGoals = longTermGoal ? stageInputs.map((stage, index): StageGoal => {
		const stageTarget = stageTargets[index]!;
		const timestamp = new Date(createdAt + index).toISOString();
		return {
			id: required(stageGoalIds[index] ?? '', 'STAGE_GOAL_ID_REQUIRED'),
			longTermGoalId: longTermGoal.id,
			sequence: index,
			title: required(stage.title, 'GOAL_TITLE_REQUIRED'),
			mode: template.defaultStageMode,
			targetQuantityBase: template.defaultStageMode === 'activeDays' ? undefined : stageTarget,
			targetActiveDays: template.defaultStageMode === 'activeDays' ? stageTarget : undefined,
			status: index === 0 ? 'active' : 'planned',
			startDate,
			createdAt: timestamp,
			updatedAt: timestamp,
		};
	}) : [];
	const stageGoal = stageGoals[0];

	await database.transaction('rw', [userCards, longTermGoals, stageGoalsTable], async () => {
		await userCards.add(userCard);
		if (longTermGoal) await longTermGoals.add(longTermGoal);
		if (stageGoals.length > 0) await stageGoalsTable.bulkAdd(stageGoals);
	});
	return { userCard, longTermGoal, stageGoal, stageGoals };
}

export function createHabitInApp(input: CreateHabitInput): Promise<CreateHabitResult> {
	return appLifecycleCoordinator.runCriticalOperation('create-card', () => createHabit(appDatabase, input));
}
