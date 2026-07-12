/* eslint-disable i18next/no-literal-string -- Dexie table names and transaction errors are domain identifiers. */
import type { ActionRecord } from '@entities/action-record';
import { backupFingerprint, type BackupPayloadV1, type ValidatedBackup } from '@entities/backup';
import type { GoalRevision, LongTermGoal, StageGoal } from '@entities/goal';
import type { OutcomeBatch } from '@entities/outcome-batch';
import type { TodayDraft } from '@entities/today-draft';
import type { UserCard } from '@entities/user-card';
import { appDatabase, type RepeatOutcomeDatabase, type SettingRecord } from '@shared/lib/db';
import { appLifecycleCoordinator } from '@shared/lib/app-lifecycle';

async function sha256Hex(value: string): Promise<string> {
	const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
	return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function readUserPayload(database: RepeatOutcomeDatabase): Promise<BackupPayloadV1> {
	return {
		userCards: await database.tableFor<UserCard>('userCards').toArray(),
		longTermGoals: await database.tableFor<LongTermGoal>('longTermGoals').toArray(),
		stageGoals: await database.tableFor<StageGoal>('stageGoals').toArray(),
		goalRevisions: await database.tableFor<GoalRevision>('goalRevisions').toArray(),
		todayDrafts: await database.tableFor<TodayDraft>('todayDrafts').toArray(),
		actionRecords: await database.tableFor<ActionRecord>('actionRecords').toArray(),
		outcomeBatches: await database.tableFor<OutcomeBatch>('outcomeBatches').toArray(),
		settings: await database.tableFor<SettingRecord>('settings').toArray(),
	};
}

export async function restoreBackup(database: RepeatOutcomeDatabase, backup: ValidatedBackup): Promise<void> {
	const cards = database.tableFor<UserCard>('userCards');
	const longGoals = database.tableFor<LongTermGoal>('longTermGoals');
	const stageGoals = database.tableFor<StageGoal>('stageGoals');
	const revisions = database.tableFor<GoalRevision>('goalRevisions');
	const drafts = database.tableFor<TodayDraft>('todayDrafts');
	const records = database.tableFor<ActionRecord>('actionRecords');
	const batches = database.tableFor<OutcomeBatch>('outcomeBatches');
	const settings = database.tableFor<SettingRecord>('settings');
	const tables = [cards, longGoals, stageGoals, revisions, drafts, records, batches, settings];
	await database.transaction('rw', tables, async () => {
		for (const table of tables) await table.clear();
		await cards.bulkPut(backup.envelope.data.userCards);
		await longGoals.bulkPut(backup.envelope.data.longTermGoals);
		await stageGoals.bulkPut(backup.envelope.data.stageGoals);
		await revisions.bulkPut(backup.envelope.data.goalRevisions);
		await drafts.bulkPut(backup.envelope.data.todayDrafts);
		await records.bulkPut(backup.envelope.data.actionRecords);
		await batches.bulkPut(backup.envelope.data.outcomeBatches);
		await settings.bulkPut(backup.envelope.data.settings);
		const readback = await readUserPayload(database);
		if (await backupFingerprint(readback, sha256Hex) !== backup.fingerprint) throw new Error('RESTORE_READBACK_MISMATCH');
	});
}

export function restoreBackupInApp(backup: ValidatedBackup): Promise<void> {
	return appLifecycleCoordinator.runCriticalOperation('restore-backup', () => restoreBackup(appDatabase, backup));
}
