/* eslint-disable i18next/no-literal-string -- Table names, statuses, and domain errors are stable identifiers. */
import {
	parseQuantityToBase,
	type CardTemplate,
} from '@entities/card-template';
import type { LongTermGoal, StageGoal } from '@entities/goal';
import type { UserCard } from '@entities/user-card';
import { appLifecycleCoordinator } from '@shared/lib/app-lifecycle';
import { parseLocalDate } from '@shared/lib/date';
import { appDatabase, type RepeatOutcomeDatabase } from '@shared/lib/db';

export interface AddStageGoalInput {
	id: string;
	userCardId: string;
	longTermGoalId: string;
	title: string;
	targetDisplay: string;
	startDate: string;
	nowIso: string;
}

function required(value: string, code: string): string {
	const trimmed = value.trim();
	if (!trimmed) throw new Error(code);
	return trimmed;
}

function sequenceOf(goal: StageGoal): number {
	return goal.sequence ?? 0;
}

export async function addStageGoal(
	database: RepeatOutcomeDatabase,
	input: AddStageGoalInput,
): Promise<StageGoal> {
	const startDate = parseLocalDate(input.startDate);
	if (Number.isNaN(Date.parse(input.nowIso))) throw new Error('INVALID_NOW_ISO');
	const cards = database.tableFor<UserCard>('userCards');
	const templates = database.tableFor<CardTemplate>('cardTemplates');
	const longTermGoals = database.tableFor<LongTermGoal>('longTermGoals');
	const stageGoals = database.tableFor<StageGoal>('stageGoals');

	return database.transaction('rw', [cards, templates, longTermGoals, stageGoals], async () => {
		const card = await cards.get(required(input.userCardId, 'USER_CARD_REQUIRED'));
		const longTermGoal = await longTermGoals.get(required(input.longTermGoalId, 'LONG_TERM_GOAL_REQUIRED'));
		if (!card || !longTermGoal || longTermGoal.userCardId !== card.id) {
			throw new Error('GOAL_RELATIONSHIP_INVALID');
		}
		if (longTermGoal.status !== 'active') throw new Error('LONG_TERM_GOAL_NOT_ACTIVE');
		const template = await templates.get(card.officialCardId);
		if (!template?.enabled) throw new Error('CARD_TEMPLATE_NOT_AVAILABLE');
		const siblings = await stageGoals.where('longTermGoalId').equals(longTermGoal.id).toArray();
		const target = parseQuantityToBase(input.targetDisplay, template.quantity, { confirmedOverLimit: true });
		const plannedTotal = siblings.reduce(
			(total, goal) => total + (goal.targetQuantityBase ?? goal.targetActiveDays ?? 0),
			0,
		);
		if (plannedTotal + target > longTermGoal.targetQuantityBase) {
			throw new Error('STAGE_TARGETS_EXCEED_LONG_TERM');
		}
		const hasActive = siblings.some(({ status }) => status === 'active');
		const stageGoal: StageGoal = {
			id: required(input.id, 'STAGE_GOAL_ID_REQUIRED'),
			longTermGoalId: longTermGoal.id,
			sequence: siblings.reduce((maximum, goal) => Math.max(maximum, sequenceOf(goal)), -1) + 1,
			title: required(input.title, 'GOAL_TITLE_REQUIRED'),
			mode: template.defaultStageMode,
			targetQuantityBase: template.defaultStageMode === 'activeDays' ? undefined : target,
			targetActiveDays: template.defaultStageMode === 'activeDays' ? target : undefined,
			status: hasActive ? 'planned' : 'active',
			startDate,
			createdAt: input.nowIso,
			updatedAt: input.nowIso,
		};
		await stageGoals.add(stageGoal);
		return stageGoal;
	});
}

export function addStageGoalInApp(input: AddStageGoalInput): Promise<StageGoal> {
	return appLifecycleCoordinator.runCriticalOperation(
		'create-card',
		() => addStageGoal(appDatabase, input),
	);
}
