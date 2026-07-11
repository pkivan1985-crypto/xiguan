/* eslint-disable i18next/no-literal-string -- Dexie store specifications are schema identifiers. */
import Dexie, { type Table } from 'dexie';

export const PRODUCTION_DATABASE_NAME = 'repeat-outcome';
export const DATABASE_SCHEMA_VERSION = 1;
export const REPEAT_OUTCOME_TABLE_NAMES = [
	'categoryDefinitions',
	'cardTemplates',
	'userCards',
	'longTermGoals',
	'stageGoals',
	'goalRevisions',
	'todayDrafts',
	'actionRecords',
	'outcomeBatches',
	'settings',
] as const;
export type RepeatOutcomeTableName = typeof REPEAT_OUTCOME_TABLE_NAMES[number];

export interface SettingRecord {
	key: string;
	value: unknown;
	updatedAt: string;
}

export class RepeatOutcomeDatabase extends Dexie {
	constructor(name = PRODUCTION_DATABASE_NAME) {
		super(name);
		this.version(DATABASE_SCHEMA_VERSION).stores({
			categoryDefinitions: '&id, sortOrder, enabled',
			cardTemplates: '&id, categoryId, [categoryId+sortOrder], enabled, version',
			userCards: '&id, officialCardId, status, sortOrder, createdAt, updatedAt',
			longTermGoals: '&id, userCardId, status, [userCardId+status], startDate, endDate',
			stageGoals: '&id, longTermGoalId, status, [longTermGoalId+status], startDate, endDate',
			goalRevisions: '&id, goalType, goalId, [goalId+createdAt], createdAt',
			todayDrafts: '&localDate, status, updatedAt, lastSubmissionId',
			actionRecords: '&id, &[userCardId+localDate], userCardId, localDate, longTermGoalId, stageGoalId, deletedAt, lastSubmissionId',
			outcomeBatches: '&id, &submissionId, localDate, status, createdAt',
			settings: '&key, updatedAt',
		});
	}

	tableFor<T, TKey = string>(name: RepeatOutcomeTableName): Table<T, TKey> {
		return this.table<T, TKey>(name);
	}
}
