/* eslint-disable i18next/no-literal-string -- Table names are stable identifiers. */
import { groupActionRecordsByLocalDate, type ActionRecord } from '@entities/action-record';
import { formatQuantityFromBase, type CardTemplate } from '@entities/card-template';
import type { LongTermGoal, StageGoal } from '@entities/goal';
import type { UserCard } from '@entities/user-card';
import { appDatabase, type RepeatOutcomeDatabase } from '@shared/lib/db';
import { parseLocalDate } from '@shared/lib/date';

export interface HistoryRecordModel {
	id: string;
	localDate: string;
	cardTitle: string;
	quantityBaseValue: number;
	displayValue: string;
	displayUnit: string;
	lastSavedAt: string;
	longTermGoalTitle?: string;
	stageGoalTitle?: string;
	canCorrect: boolean;
	relationAvailable: boolean;
}

export interface HistoryDateGroupModel {
	localDate: string;
	records: HistoryRecordModel[];
}

export interface HistoryModel {
	groups: HistoryDateGroupModel[];
}

export async function loadHistory(
	database: RepeatOutcomeDatabase,
	currentLocalDate: string,
): Promise<HistoryModel> {
	parseLocalDate(currentLocalDate);
	const actionRecords = database.tableFor<ActionRecord>('actionRecords');
	const cards = database.tableFor<UserCard>('userCards');
	const templates = database.tableFor<CardTemplate>('cardTemplates');
	const longGoals = database.tableFor<LongTermGoal>('longTermGoals');
	const stageGoals = database.tableFor<StageGoal>('stageGoals');
	const data = await database.transaction('r', [actionRecords, cards, templates, longGoals, stageGoals], async () => ({
		records: await actionRecords.toArray(),
		cards: await cards.toArray(),
		templates: await templates.toArray(),
		longGoals: await longGoals.toArray(),
		stageGoals: await stageGoals.toArray(),
	}));
	const cardsById = new Map(data.cards.map((card) => [card.id, card]));
	const templatesById = new Map(data.templates.map((template) => [template.id, template]));
	const longGoalsById = new Map(data.longGoals.map((goal) => [goal.id, goal]));
	const stageGoalsById = new Map(data.stageGoals.map((goal) => [goal.id, goal]));

	return {
		groups: groupActionRecordsByLocalDate(data.records).map((group) => ({
			localDate: group.localDate,
			records: group.records.map((record): HistoryRecordModel => {
				const card = cardsById.get(record.userCardId);
				const template = card ? templatesById.get(card.officialCardId) : undefined;
				const relationAvailable = Boolean(card && template);
				return {
					id: record.id,
					localDate: record.localDate,
					cardTitle: card?.title ?? '',
					quantityBaseValue: record.quantityBaseValue,
					displayValue: template
						? formatQuantityFromBase(record.quantityBaseValue, template.quantity)
						: String(record.quantityBaseValue),
					displayUnit: template?.quantity.displayUnit ?? '',
					lastSavedAt: record.lastSavedAt,
					longTermGoalTitle: record.longTermGoalId ? longGoalsById.get(record.longTermGoalId)?.title : undefined,
					stageGoalTitle: record.stageGoalId ? stageGoalsById.get(record.stageGoalId)?.title : undefined,
					canCorrect: relationAvailable && record.localDate === currentLocalDate,
					relationAvailable,
				};
			}),
		})),
	};
}

export function loadHistoryInApp(currentLocalDate: string): Promise<HistoryModel> {
	return loadHistory(appDatabase, currentLocalDate);
}
