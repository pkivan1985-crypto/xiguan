/* eslint-disable i18next/no-literal-string -- Error codes and fixed IDs are domain identifiers. */
import type { CardTemplate } from '@entities/card-template';
import { parseQuantityToBase, seedSystemDefinitions } from '@entities/card-template';
import type { LongTermGoal, StageGoal } from '@entities/goal';
import type { UserCard } from '@entities/user-card';
import { parseLocalDate } from '@shared/lib/date';
import { appDatabase, type RepeatOutcomeDatabase } from '@shared/lib/db';

export interface CreateRunningCardInput {
	cardTitle: string;
	longTermTitle: string;
	longTermTargetDisplay: string;
	stageTitle: string;
	stageTargetDisplay: string;
	startDate: string;
	endDate?: string;
	nowIso: string;
	ids: {
		userCardId: string;
		longTermGoalId: string;
		stageGoalId: string;
	};
}

export interface CreateRunningCardResult {
	userCard: UserCard;
	longTermGoal: LongTermGoal;
	stageGoal: StageGoal;
}

function required(value: string, errorCode: string): string {
	const trimmed = value.trim();
	if (!trimmed) throw new Error(errorCode);
	return trimmed;
}

function dateRange(startText: string, endText?: string): { startDate: string; endDate?: string } {
	try {
		const startDate = parseLocalDate(startText);
		const endDate = endText ? parseLocalDate(endText) : undefined;
		if (endDate && endDate < startDate) throw new Error('INVALID_DATE_RANGE');
		return { startDate, endDate };
	} catch {
		throw new Error('INVALID_DATE_RANGE');
	}
}

export async function createRunningCard(
	database: RepeatOutcomeDatabase,
	input: CreateRunningCardInput,
): Promise<CreateRunningCardResult> {
	const templates = database.tableFor<CardTemplate>('cardTemplates');
	if (!await templates.get('running')) await seedSystemDefinitions(database);
	const template = await templates.get('running');
	if (!template?.enabled) throw new Error('RUNNING_TEMPLATE_UNAVAILABLE');

	const cardTitle = required(input.cardTitle, 'CARD_TITLE_REQUIRED');
	const longTermTitle = required(input.longTermTitle, 'GOAL_TITLE_REQUIRED');
	const stageTitle = required(input.stageTitle, 'GOAL_TITLE_REQUIRED');
	const { startDate, endDate } = dateRange(input.startDate, input.endDate);
	const targetOptions = { confirmedOverLimit: true };
	const longTermTarget = parseQuantityToBase(input.longTermTargetDisplay.trim(), template.quantity, targetOptions);
	const stageTarget = parseQuantityToBase(input.stageTargetDisplay.trim(), template.quantity, targetOptions);
	if (stageTarget > longTermTarget) throw new Error('STAGE_TARGET_EXCEEDS_LONG_TERM');

	const userCards = database.tableFor<UserCard>('userCards');
	const longTermGoals = database.tableFor<LongTermGoal>('longTermGoals');
	const stageGoals = database.tableFor<StageGoal>('stageGoals');
	const sortOrder = await userCards.count();
	const userCard: UserCard = {
		id: input.ids.userCardId,
		officialCardId: template.id,
		title: cardTitle,
		status: 'active',
		sortOrder,
		createdAt: input.nowIso,
		updatedAt: input.nowIso,
	};
	const longTermGoal: LongTermGoal = {
		id: input.ids.longTermGoalId,
		userCardId: userCard.id,
		title: longTermTitle,
		targetQuantityBase: longTermTarget,
		status: 'active',
		startDate,
		endDate,
		createdAt: input.nowIso,
		updatedAt: input.nowIso,
	};
	const stageGoal: StageGoal = {
		id: input.ids.stageGoalId,
		longTermGoalId: longTermGoal.id,
		title: stageTitle,
		mode: 'quantity',
		targetQuantityBase: stageTarget,
		status: 'active',
		startDate,
		endDate,
		createdAt: input.nowIso,
		updatedAt: input.nowIso,
	};

	await database.transaction('rw', [userCards, longTermGoals, stageGoals], async () => {
		await userCards.add(userCard);
		await longTermGoals.add(longTermGoal);
		await stageGoals.add(stageGoal);
	});
	return { userCard, longTermGoal, stageGoal };
}

export function createRunningCardInApp(input: CreateRunningCardInput): Promise<CreateRunningCardResult> {
	return createRunningCard(appDatabase, input);
}
