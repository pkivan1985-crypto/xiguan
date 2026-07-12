import type { ActionRecord } from '@entities/action-record';
import type { GoalRevision, LongTermGoal, StageGoal } from '@entities/goal';
import type { OutcomeBatch } from '@entities/outcome-batch';
import type { TodayDraft } from '@entities/today-draft';
import type { UserCard } from '@entities/user-card';
import type { SettingRecord } from '@shared/lib/db';

export const BACKUP_FORMAT = 'repeat-outcome-backup' as const;
export const BACKUP_SCHEMA_VERSION = 1 as const;

export interface TemplateDefinitionRef {
	id: string;
	version: number;
}

export interface BackupPayloadV1 {
	userCards: UserCard[];
	longTermGoals: LongTermGoal[];
	stageGoals: StageGoal[];
	goalRevisions: GoalRevision[];
	todayDrafts: TodayDraft[];
	actionRecords: ActionRecord[];
	outcomeBatches: OutcomeBatch[];
	settings: SettingRecord[];
}

export interface BackupEnvelopeV1 {
	format: typeof BACKUP_FORMAT;
	backupSchemaVersion: typeof BACKUP_SCHEMA_VERSION;
	databaseSchemaVersion: 1;
	appVersion: string;
	exportedAt: string;
	definitionRefs: { cardTemplates: TemplateDefinitionRef[] };
	checksum: { algorithm: 'SHA-256'; value: string };
	data: BackupPayloadV1;
}

export interface BackupPreview {
	userCards: number;
	longTermGoals: number;
	stageGoals: number;
	goalRevisions: number;
	todayDrafts: number;
	actionRecords: number;
	outcomeBatches: number;
	settings: number;
	exportedAt: string;
	appVersion: string;
	encrypted: boolean;
}

export type DigestText = (value: string) => Promise<string>;
