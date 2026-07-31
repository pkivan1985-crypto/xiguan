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
	iconKey?: CardTemplate['iconKey'];
	accent?: CardTemplate['accent'];
	quantityBaseValue: number;
	displayValue: string;
	displayUnit: string;
	basePerDisplayUnit: number;
	maxDecimalPlaces: number;
	confirmationThresholdDisplay: number;
	lastSavedAt: string;
	longTermGoalTitle?: string;
	stageGoalTitle?: string;
	entryMethod?: ActionRecord['entryMethod'];
	plannedQuantityBaseValue?: number;
	carryInBaseValue?: number;
	carryOutBaseValue?: number;
	durationSeconds?: number;
	averagePaceSecondsPerKm?: number;
	averageHeartRateBpm?: number;
	note?: string;
	supportsTrainingDetails?: boolean;
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
					iconKey: template?.iconKey,
					accent: template?.accent,
					quantityBaseValue: record.quantityBaseValue,
					displayValue: template
						? template.trackingType && template.trackingType !== 'quantity' && template.quantity.maxDecimalPlaces === 0
							? String(record.quantityBaseValue / template.quantity.basePerDisplayUnit)
							: formatQuantityFromBase(record.quantityBaseValue, template.quantity)
						: String(record.quantityBaseValue),
					displayUnit: template?.quantity.displayUnit ?? '',
					basePerDisplayUnit: template?.quantity.basePerDisplayUnit ?? 1,
					maxDecimalPlaces: template?.quantity.maxDecimalPlaces ?? 0,
					confirmationThresholdDisplay: template?.quantity.confirmationThresholdDisplay ?? Number.MAX_SAFE_INTEGER,
					lastSavedAt: record.lastSavedAt,
					longTermGoalTitle: record.longTermGoalId ? longGoalsById.get(record.longTermGoalId)?.title : undefined,
					stageGoalTitle: record.stageGoalId ? stageGoalsById.get(record.stageGoalId)?.title : undefined,
					entryMethod: record.entryMethod,
					plannedQuantityBaseValue: record.plannedQuantityBaseValue,
					carryInBaseValue: record.carryInBaseValue,
					carryOutBaseValue: record.carryOutBaseValue,
					durationSeconds: record.durationSeconds,
					averagePaceSecondsPerKm: record.averagePaceSecondsPerKm,
					averageHeartRateBpm: record.averageHeartRateBpm,
					note: record.note,
					supportsTrainingDetails: card?.officialCardId === 'running',
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
