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
	nowIso: string;
	ids: {
		userCardId: string;
		longTermGoalId: string;
		stageGoalId: string;
	};
}

export interface CreateHabitResult {
	userCard: UserCard;
	longTermGoal?: LongTermGoal;
	stageGoal?: StageGoal;
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
	if (input.stage && !input.longTerm) throw new Error('STAGE_REQUIRES_LONG_TERM');
	const cardTitle = required(input.cardTitle, 'CARD_TITLE_REQUIRED');
	const startDate = parseLocalDate(input.startDate);
	if (Number.isNaN(Date.parse(input.nowIso))) throw new Error('INVALID_NOW_ISO');

	const userCards = database.tableFor<UserCard>('userCards');
	const longTermGoals = database.tableFor<LongTermGoal>('longTermGoals');
	const stageGoals = database.tableFor<StageGoal>('stageGoals');
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
	const stageTarget = input.stage
		? parseQuantityToBase(input.stage.targetDisplay, template.quantity, targetOptions)
		: undefined;
	if (stageTarget !== undefined && longTermGoal && stageTarget > longTermGoal.targetQuantityBase) {
		throw new Error('STAGE_TARGET_EXCEEDS_LONG_TERM');
	}
	const stageGoal = input.stage && longTermGoal ? {
		id: input.ids.stageGoalId,
		longTermGoalId: longTermGoal.id,
		title: required(input.stage.title, 'GOAL_TITLE_REQUIRED'),
		mode: template.defaultStageMode,
		targetQuantityBase: template.defaultStageMode === 'activeDays' ? undefined : stageTarget,
		targetActiveDays: template.defaultStageMode === 'activeDays' ? stageTarget : undefined,
		status: 'active' as const,
		startDate,
		createdAt: input.nowIso,
		updatedAt: input.nowIso,
	} satisfies StageGoal : undefined;

	await database.transaction('rw', [userCards, longTermGoals, stageGoals], async () => {
		await userCards.add(userCard);
		if (longTermGoal) await longTermGoals.add(longTermGoal);
		if (stageGoal) await stageGoals.add(stageGoal);
	});
	return { userCard, longTermGoal, stageGoal };
}

export function createHabitInApp(input: CreateHabitInput): Promise<CreateHabitResult> {
	return appLifecycleCoordinator.runCriticalOperation('create-card', () => createHabit(appDatabase, input));
}
