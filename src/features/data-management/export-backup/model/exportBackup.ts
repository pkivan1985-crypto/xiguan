/* eslint-disable i18next/no-literal-string -- Backup filenames and Dexie table names are protocol identifiers. */
import type { ActionRecord } from '@entities/action-record';
import {
	BACKUP_FORMAT,
	BACKUP_SCHEMA_VERSION,
	backupFingerprint,
	type BackupEnvelopeV1,
	type BackupPayloadV1,
	type DigestText,
	validatePlainBackup,
} from '@entities/backup';
import type { CardTemplate } from '@entities/card-template';
import type { GoalRevision, LongTermGoal, StageGoal } from '@entities/goal';
import type { OutcomeBatch } from '@entities/outcome-batch';
import type { TodayDraft } from '@entities/today-draft';
import type { UserCard } from '@entities/user-card';
import { appDatabase, type RepeatOutcomeDatabase, type SettingRecord } from '@shared/lib/db';
import { encryptBackupJson } from '@shared/lib/crypto';
import { downloadBackup, type BackupFile } from '../lib/downloadBackup';

export interface BuildBackupOptions {
	nowIso: string;
	appVersion: string;
	password?: string;
	digest?: DigestText;
}

async function sha256Hex(value: string): Promise<string> {
	const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
	return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function fileTimestamp(nowIso: string): string {
	const date = new Date(nowIso);
	if (!Number.isFinite(date.getTime())) throw new Error('INVALID_EXPORT_TIME');
	const iso = date.toISOString();
	return `${iso.slice(0, 10).replaceAll('-', '')}-${iso.slice(11, 16).replace(':', '')}`;
}

export async function buildBackup(database: RepeatOutcomeDatabase, options: BuildBackupOptions): Promise<BackupFile> {
	const templates = database.tableFor<CardTemplate>('cardTemplates');
	const userCards = database.tableFor<UserCard>('userCards');
	const longTermGoals = database.tableFor<LongTermGoal>('longTermGoals');
	const stageGoals = database.tableFor<StageGoal>('stageGoals');
	const goalRevisions = database.tableFor<GoalRevision>('goalRevisions');
	const todayDrafts = database.tableFor<TodayDraft>('todayDrafts');
	const actionRecords = database.tableFor<ActionRecord>('actionRecords');
	const outcomeBatches = database.tableFor<OutcomeBatch>('outcomeBatches');
	const settings = database.tableFor<SettingRecord>('settings');
	const snapshot = await database.transaction('r', [templates, userCards, longTermGoals, stageGoals, goalRevisions, todayDrafts, actionRecords, outcomeBatches, settings], async () => ({
		templates: await templates.toArray(),
		data: {
			userCards: await userCards.toArray(),
			longTermGoals: await longTermGoals.toArray(),
			stageGoals: await stageGoals.toArray(),
			goalRevisions: await goalRevisions.toArray(),
			todayDrafts: await todayDrafts.toArray(),
			actionRecords: await actionRecords.toArray(),
			outcomeBatches: await outcomeBatches.toArray(),
			settings: await settings.toArray(),
		} satisfies BackupPayloadV1,
	}));
	const referencedIds = new Set(snapshot.data.userCards.map((card) => card.officialCardId));
	const refs = snapshot.templates.filter((template) => referencedIds.has(template.id)).map(({ id, version }) => ({ id, version })).sort((a, b) => a.id.localeCompare(b.id));
	const digest = options.digest ?? sha256Hex;
	const envelope: BackupEnvelopeV1 = {
		format: BACKUP_FORMAT,
		backupSchemaVersion: BACKUP_SCHEMA_VERSION,
		databaseSchemaVersion: 1,
		appVersion: options.appVersion,
		exportedAt: options.nowIso,
		definitionRefs: { cardTemplates: refs },
		checksum: { algorithm: 'SHA-256', value: await backupFingerprint(snapshot.data, digest) },
		data: snapshot.data,
	};
	const validated = await validatePlainBackup(envelope, snapshot.templates.map(({ id, version }) => ({ id, version })), digest);
	const plainJson = JSON.stringify(envelope, null, 2);
	const encrypted = Boolean(options.password);
	return {
		contents: options.password ? await encryptBackupJson(plainJson, options.password) : plainJson,
		fileName: `repeat-outcome-backup-${fileTimestamp(options.nowIso)}.json`,
		encrypted,
		preview: { ...validated.preview, encrypted },
	};
}

export async function exportBackupInApp(options: BuildBackupOptions): Promise<BackupFile> {
	const file = await buildBackup(appDatabase, options);
	downloadBackup(file);
	return file;
}
