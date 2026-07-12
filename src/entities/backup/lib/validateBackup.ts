/* eslint-disable i18next/no-literal-string -- Backup schema keys and brands are domain identifiers. */
import { BackupValidationError } from '../model/errors';
import {
	BACKUP_FORMAT,
	BACKUP_SCHEMA_VERSION,
	type BackupEnvelopeV1,
	type BackupPayloadV1,
	type BackupPreview,
	type DigestText,
	type TemplateDefinitionRef,
} from '../model/types';
import { stableStringify } from './stableStringify';

const validatedBackupBrand: unique symbol = Symbol('validatedBackup');

export interface ValidatedBackup {
	readonly envelope: BackupEnvelopeV1;
	readonly preview: BackupPreview;
	readonly fingerprint: string;
	readonly [validatedBackupBrand]: true;
}

function fail(code: ConstructorParameters<typeof BackupValidationError>[0]): never {
	throw new BackupValidationError(code);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isText(value: unknown): value is string {
	return typeof value === 'string' && value.length > 0;
}

function isIso(value: unknown): value is string {
	return isText(value) && Number.isFinite(Date.parse(value));
}

function isLocalDate(value: unknown): value is string {
	return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(`${value}T00:00:00Z`));
}

function isSafeNonNegative(value: unknown): value is number {
	return Number.isSafeInteger(value) && (value as number) >= 0;
}

function isSafePositive(value: unknown): value is number {
	return Number.isSafeInteger(value) && (value as number) > 0;
}

function assertUnique(values: string[]): void {
	if (new Set(values).size !== values.length) fail('DUPLICATE_KEY');
}

function assertPayloadShape(payload: unknown): asserts payload is BackupPayloadV1 {
	if (!isRecord(payload)) fail('INVALID_BACKUP');
	const arrays = ['userCards', 'longTermGoals', 'stageGoals', 'goalRevisions', 'todayDrafts', 'actionRecords', 'outcomeBatches', 'settings'] as const;
	if (arrays.some((key) => !Array.isArray(payload[key]))) fail('INVALID_BACKUP');
	const candidate = payload as unknown as BackupPayloadV1;

	for (const card of candidate.userCards) {
		if (!isRecord(card) || !isText(card.id) || !isText(card.officialCardId) || !isText(card.title)
			|| !['active', 'archived'].includes(String(card.status)) || !isSafeNonNegative(card.sortOrder)
			|| !isIso(card.createdAt) || !isIso(card.updatedAt)) fail('INVALID_BACKUP');
	}
	for (const goal of candidate.longTermGoals) {
		if (!isRecord(goal) || !isText(goal.id) || !isText(goal.userCardId) || !isText(goal.title)
			|| !isSafePositive(goal.targetQuantityBase) || !isLocalDate(goal.startDate)
			|| !isIso(goal.createdAt) || !isIso(goal.updatedAt)) fail('INVALID_BACKUP');
	}
	for (const goal of candidate.stageGoals) {
		if (!isRecord(goal) || !isText(goal.id) || !isText(goal.longTermGoalId) || !isText(goal.title)
			|| !['quantity', 'activeDays', 'both'].includes(String(goal.mode)) || !isLocalDate(goal.startDate)
			|| !isIso(goal.createdAt) || !isIso(goal.updatedAt)) fail('INVALID_BACKUP');
		if (goal.mode !== 'activeDays' && !isSafePositive(goal.targetQuantityBase)) fail('INVALID_BACKUP');
		if (goal.mode !== 'quantity' && !isSafePositive(goal.targetActiveDays)) fail('INVALID_BACKUP');
	}
	for (const revision of candidate.goalRevisions) {
		if (!isRecord(revision) || !isText(revision.id) || !['longTerm', 'stage'].includes(String(revision.goalType))
			|| !isText(revision.goalId) || !isIso(revision.createdAt) || !isText(revision.submissionId)) fail('INVALID_BACKUP');
	}
	for (const draft of candidate.todayDrafts) {
		if (!isRecord(draft) || !isLocalDate(draft.localDate) || !['editing', 'submitted'].includes(String(draft.status))
			|| !Array.isArray(draft.slots) || draft.slots.length !== 6 || !isIso(draft.updatedAt)) fail('INVALID_BACKUP');
	}
	for (const record of candidate.actionRecords) {
		if (!isRecord(record) || !isText(record.id) || !isText(record.userCardId) || !isLocalDate(record.localDate)
			|| !isSafePositive(record.quantityBaseValue) || !isIso(record.firstSavedAt) || !isIso(record.lastSavedAt)
			|| !isText(record.lastSubmissionId)) fail('INVALID_BACKUP');
	}
	for (const batch of candidate.outcomeBatches) {
		if (!isRecord(batch) || !isText(batch.id) || !isText(batch.submissionId) || !isLocalDate(batch.localDate)
			|| !['ready', 'playing', 'completed'].includes(String(batch.status)) || !isIso(batch.createdAt) || !Array.isArray(batch.items)) fail('INVALID_BACKUP');
	}
	for (const setting of candidate.settings) {
		if (!isRecord(setting) || !isText(setting.key) || !isIso(setting.updatedAt)) fail('INVALID_BACKUP');
		try { stableStringify(setting.value); } catch { fail('INVALID_BACKUP'); }
	}
}

function assertRelationships(payload: BackupPayloadV1, refs: TemplateDefinitionRef[], currentDefinitions: TemplateDefinitionRef[]): void {
	assertUnique(payload.userCards.map((item) => item.id));
	assertUnique(payload.longTermGoals.map((item) => item.id));
	assertUnique(payload.stageGoals.map((item) => item.id));
	assertUnique(payload.goalRevisions.map((item) => item.id));
	assertUnique(payload.todayDrafts.map((item) => item.localDate));
	assertUnique(payload.actionRecords.map((item) => item.id));
	assertUnique(payload.actionRecords.map((item) => `${item.userCardId}\u0000${item.localDate}`));
	assertUnique(payload.outcomeBatches.map((item) => item.id));
	assertUnique(payload.outcomeBatches.map((item) => item.submissionId));
	assertUnique(payload.settings.map((item) => item.key));
	assertUnique(refs.map((item) => item.id));

	const current = new Map(currentDefinitions.map((item) => [item.id, item.version]));
	const backupRefs = new Map(refs.map((item) => [item.id, item.version]));
	if (refs.some((item) => current.get(item.id) !== item.version)) fail('TEMPLATE_INCOMPATIBLE');
	if (payload.userCards.some((card) => backupRefs.get(card.officialCardId) !== current.get(card.officialCardId))) fail('TEMPLATE_INCOMPATIBLE');

	const cards = new Map(payload.userCards.map((item) => [item.id, item]));
	const longGoals = new Map(payload.longTermGoals.map((item) => [item.id, item]));
	const stageGoals = new Map(payload.stageGoals.map((item) => [item.id, item]));
	if (payload.longTermGoals.some((goal) => !cards.has(goal.userCardId))) fail('RELATIONSHIP_INVALID');
	if (payload.stageGoals.some((goal) => !longGoals.has(goal.longTermGoalId))) fail('RELATIONSHIP_INVALID');
	for (const revision of payload.goalRevisions) {
		if (revision.goalType === 'longTerm' ? !longGoals.has(revision.goalId) : !stageGoals.has(revision.goalId)) fail('RELATIONSHIP_INVALID');
	}
	for (const record of payload.actionRecords) {
		if (!cards.has(record.userCardId)) fail('RELATIONSHIP_INVALID');
		const longGoal = record.longTermGoalId ? longGoals.get(record.longTermGoalId) : undefined;
		if (record.longTermGoalId && longGoal?.userCardId !== record.userCardId) fail('RELATIONSHIP_INVALID');
		const stageGoal = record.stageGoalId ? stageGoals.get(record.stageGoalId) : undefined;
		if (record.stageGoalId && stageGoal?.longTermGoalId !== record.longTermGoalId) fail('RELATIONSHIP_INVALID');
	}
	for (const draft of payload.todayDrafts) {
		const indexes = draft.slots.map((slot) => slot.slotIndex);
		if (new Set(indexes).size !== 6 || indexes.some((index) => index < 0 || index > 5)) fail('INVALID_BACKUP');
		if (draft.slots.some((slot) => slot.userCardId !== null && !cards.has(slot.userCardId))) fail('RELATIONSHIP_INVALID');
	}
	for (const batch of payload.outcomeBatches) {
		if (batch.items.some((item) => !cards.has(item.userCardId) || !isSafePositive(item.quantityBaseValue)
			|| !isText(item.baseUnit) || !isText(item.displayUnit) || !isSafePositive(item.basePerDisplayUnit))) fail('RELATIONSHIP_INVALID');
	}
}

export async function backupFingerprint(payload: BackupPayloadV1, digest: DigestText): Promise<string> {
	return digest(stableStringify(payload));
}

export async function validatePlainBackup(input: unknown, currentDefinitions: TemplateDefinitionRef[], digest: DigestText): Promise<ValidatedBackup> {
	if (!isRecord(input) || input.format !== BACKUP_FORMAT) fail('INVALID_BACKUP');
	if (typeof input.backupSchemaVersion !== 'number') fail('INVALID_BACKUP');
	if (input.backupSchemaVersion > BACKUP_SCHEMA_VERSION) fail('BACKUP_VERSION_TOO_NEW');
	if (input.backupSchemaVersion < BACKUP_SCHEMA_VERSION) fail('BACKUP_VERSION_TOO_OLD');
	if (typeof input.databaseSchemaVersion !== 'number') fail('INVALID_BACKUP');
	if (input.databaseSchemaVersion > 1) fail('DATABASE_VERSION_TOO_NEW');
	if (input.databaseSchemaVersion !== 1 || !isText(input.appVersion) || !isIso(input.exportedAt)
		|| !isRecord(input.definitionRefs) || !Array.isArray(input.definitionRefs.cardTemplates)
		|| !isRecord(input.checksum) || input.checksum.algorithm !== 'SHA-256' || !isText(input.checksum.value)) fail('INVALID_BACKUP');
	assertPayloadShape(input.data);
	const fingerprint = await backupFingerprint(input.data, digest);
	if (fingerprint !== input.checksum.value) fail('CHECKSUM_MISMATCH');
	const refs = input.definitionRefs.cardTemplates;
	if (refs.some((ref) => !isRecord(ref) || !isText(ref.id) || !isSafePositive(ref.version))) fail('INVALID_BACKUP');
	assertRelationships(input.data, refs as TemplateDefinitionRef[], currentDefinitions);
	const envelope = input as unknown as BackupEnvelopeV1;
	return {
		envelope,
		fingerprint,
		preview: {
			userCards: envelope.data.userCards.length,
			longTermGoals: envelope.data.longTermGoals.length,
			stageGoals: envelope.data.stageGoals.length,
			goalRevisions: envelope.data.goalRevisions.length,
			todayDrafts: envelope.data.todayDrafts.length,
			actionRecords: envelope.data.actionRecords.length,
			outcomeBatches: envelope.data.outcomeBatches.length,
			settings: envelope.data.settings.length,
			exportedAt: envelope.exportedAt,
			appVersion: envelope.appVersion,
			encrypted: false,
		},
		[validatedBackupBrand]: true,
	};
}
