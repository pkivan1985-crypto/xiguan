/* eslint-disable i18next/no-literal-string -- Dexie table names are schema identifiers. */
import { appDatabase, type RepeatOutcomeDatabase } from '@shared/lib/db';
import { appLifecycleCoordinator } from '@shared/lib/app-lifecycle';

const USER_TABLE_NAMES = [
	'userCards',
	'longTermGoals',
	'stageGoals',
	'goalRevisions',
	'todayDrafts',
	'actionRecords',
	'outcomeBatches',
	'settings',
] as const;

export async function clearUserData(database: RepeatOutcomeDatabase): Promise<void> {
	const tables = USER_TABLE_NAMES.map((name) => database.table(name));
	await database.transaction('rw', tables, async () => {
		for (const table of tables) await table.clear();
	});
}

export function clearUserDataInApp(): Promise<void> {
	return appLifecycleCoordinator.runCriticalOperation('clear-data', () => clearUserData(appDatabase));
}
