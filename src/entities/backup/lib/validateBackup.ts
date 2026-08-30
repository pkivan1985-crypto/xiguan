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

function isOptionalText(value: unknown, maximum: number): boolean {
	return value === undefined || (typeof value === 'string' && value.length <= maximum);
}

function isOptionalSafeNonNegative(value: unknown): boolean {
	return value === undefined || isSafeNonNegative(value);
}

function assertHabitConfig(value: unknown): void {
	if (!isRecord(value) || value.kind !== 'light-food' || !Array.isArray(value.rules)
		|| value.rules.length === 0 || value.rules.length > 50) fail('INVALID_BACKUP');
	for (const rule of value.rules) {
		if (!isRecord(rule) || !isText(rule.id) || !isText(rule.label)
			|| rule.label.length > 80 || typeof rule.builtIn !== 'boolean') fail('INVALID_BACKUP');
	}
	assertUnique(value.rules.map((rule) => String((rule as Record<string, unknown>).id)));
}

function assertRecordDetails(value: unknown): void {
	if (!isRecord(value) || !isText(value.kind)) fail('INVALID_BACKUP');
	if (value.kind === 'water') {
		if (value.cupSizeMl !== undefined && (!isSafePositive(value.cupSizeMl) || value.cupSizeMl > 5_000)) fail('INVALID_BACKUP');
		if (![value.morningCups, value.afternoonCups, value.eveningCups].every(isOptionalSafeNonNegative)) fail('INVALID_BACKUP');
		if (value.beverageType !== undefined && !['water', 'tea', 'coffee', 'other'].includes(String(value.beverageType))) fail('INVALID_BACKUP');
		return;
	}
	if (value.kind === 'reading') {
		if (!isOptionalText(value.bookTitle, 120) || !isOptionalText(value.chapter, 120) || !isOptionalText(value.reflection, 1_000)) fail('INVALID_BACKUP');
		if (value.durationMinutes !== undefined && !isSafePositive(value.durationMinutes)) fail('INVALID_BACKUP');
		if (![value.startPage, value.endPage].every(isOptionalSafeNonNegative)) fail('INVALID_BACKUP');
		if (isSafeNonNegative(value.startPage) && isSafeNonNegative(value.endPage) && value.endPage < value.startPage) fail('INVALID_BACKUP');
		return;
	}
	if (value.kind === 'light-food') {
		if (!Array.isArray(value.checkedRuleIds) || value.checkedRuleIds.some((id) => !isText(id))
			|| new Set(value.checkedRuleIds).size !== value.checkedRuleIds.length) fail('INVALID_BACKUP');
		return;
	}
	if (value.kind === 'sleep') {
		if (value.onTime !== undefined && typeof value.onTime !== 'boolean') fail('INVALID_BACKUP');
		if (![value.bedtime, value.wakeTime].every((time) => time === undefined || (typeof time === 'string' && /^\d{2}:\d{2}$/.test(time)))) fail('INVALID_BACKUP');
		if (value.durationMinutes !== undefined && !isSafePositive(value.durationMinutes)) fail('INVALID_BACKUP');
		if (value.quality !== undefined && ![1, 2, 3, 4, 5].includes(Number(value.quality))) fail('INVALID_BACKUP');
		if (value.wakeFeeling !== undefined && !['tired', 'normal', 'refreshed'].includes(String(value.wakeFeeling))) fail('INVALID_BACKUP');
		return;
	}
	if (value.kind === 'screen-free') {
		if (![value.screenMinutes, value.shortVideoMinutes, value.socialMinutes, value.newsMinutes, value.otherMinutes].every(isOptionalSafeNonNegative)) fail('INVALID_BACKUP');
		if (value.screenFreeMoments !== undefined && (!Array.isArray(value.screenFreeMoments)
			|| value.screenFreeMoments.some((moment) => !['after-waking', 'during-meals', 'before-sleep'].includes(String(moment)))
			|| new Set(value.screenFreeMoments).size !== value.screenFreeMoments.length)) fail('INVALID_BACKUP');
		return;
	}
	if (value.kind === 'extra-expense') {
		if ('entries' in value) {
			if (!Array.isArray(value.entries) || value.entries.length === 0) fail('INVALID_BACKUP');
			for (const entry of value.entries) {
				if (!isRecord(entry) || !isText(entry.id) || !isSafePositive(entry.amountCents)
					|| !isText(entry.item) || entry.item.length > 80
					|| !isText(entry.reason) || entry.reason.length > 280
					|| !isOptionalSafeNonNegative(entry.bankBalanceCents)
					|| !isOptionalSafeNonNegative(entry.earnBackDays)
					|| !isOptionalText(entry.compensation, 280)
					|| !['necessary', 'delayable', 'impulse'].includes(String(entry.necessity))
					|| typeof entry.occurredTime !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(entry.occurredTime)
					|| !isIso(entry.createdAt) || !isIso(entry.updatedAt)) fail('INVALID_BACKUP');
			}
			assertUnique(value.entries.map((entry) => String((entry as Record<string, unknown>).id)));
			return;
		}
		if (!isText(value.item) || value.item.length > 80
			|| !isText(value.reason) || value.reason.length > 280
			|| !isOptionalSafeNonNegative(value.bankBalanceCents)
			|| !isOptionalSafeNonNegative(value.earnBackDays)
			|| !isOptionalText(value.compensation, 280)
			|| !['necessary', 'delayable', 'impulse'].includes(String(value.necessity))) fail('INVALID_BACKUP');
		return;
	}
	fail('INVALID_BACKUP');
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
		if (card.dailyPlan !== undefined) {
			if (!isRecord(card.dailyPlan)
				|| !['average', 'custom'].includes(String(card.dailyPlan.mode))
				|| !Array.isArray(card.dailyPlan.weekdays)
				|| card.dailyPlan.weekdays.length === 0
				|| card.dailyPlan.weekdays.some((day) => !Number.isSafeInteger(day) || day < 1 || day > 7)
				|| new Set(card.dailyPlan.weekdays).size !== card.dailyPlan.weekdays.length) fail('INVALID_BACKUP');
			if (card.dailyPlan.averageTargetBase !== undefined && !isSafePositive(card.dailyPlan.averageTargetBase)) {
				fail('INVALID_BACKUP');
			}
			if (card.dailyPlan.mode === 'custom') {
				if (!isRecord(card.dailyPlan.customTargetsBaseByWeekday)) fail('INVALID_BACKUP');
				for (const day of card.dailyPlan.weekdays) {
					if (!isSafePositive(card.dailyPlan.customTargetsBaseByWeekday[day])) fail('INVALID_BACKUP');
				}
			}
		}
		if (card.habitConfig !== undefined) assertHabitConfig(card.habitConfig);
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
		if (goal.sequence !== undefined && !isSafeNonNegative(goal.sequence)) fail('INVALID_BACKUP');
		if (goal.dailyTargetBase !== undefined && !isSafePositive(goal.dailyTargetBase)) fail('INVALID_BACKUP');
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
		if (record.entryMethod !== undefined
			&& !['completed', 'actual', 'adjustment'].includes(String(record.entryMethod))) fail('INVALID_BACKUP');
		if (record.plannedQuantityBaseValue !== undefined && !isSafePositive(record.plannedQuantityBaseValue)) fail('INVALID_BACKUP');
		if (record.carryInBaseValue !== undefined && !isSafeNonNegative(record.carryInBaseValue)) fail('INVALID_BACKUP');
		if (record.carryOutBaseValue !== undefined && !isSafeNonNegative(record.carryOutBaseValue)) fail('INVALID_BACKUP');
		if (record.durationSeconds !== undefined && !isSafePositive(record.durationSeconds)) fail('INVALID_BACKUP');
		if (record.averagePaceSecondsPerKm !== undefined && !isSafePositive(record.averagePaceSecondsPerKm)) fail('INVALID_BACKUP');
		if (record.averageHeartRateBpm !== undefined
			&& (!Number.isSafeInteger(record.averageHeartRateBpm) || record.averageHeartRateBpm < 30 || record.averageHeartRateBpm > 240)) fail('INVALID_BACKUP');
		if (record.note !== undefined && (typeof record.note !== 'string' || record.note.length > 280)) fail('INVALID_BACKUP');
		if (record.details !== undefined) {
			assertRecordDetails(record.details);
			if (isRecord(record.details) && record.details.kind === 'extra-expense' && Array.isArray(record.details.entries)) {
				const total = record.details.entries.reduce(
					(sum, entry) => sum + Number((entry as Record<string, unknown>).amountCents),
					0,
				);
				if (total !== record.quantityBaseValue) fail('INVALID_BACKUP');
			}
		}
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
	const activeStageCounts = new Map<string, number>();
	for (const goal of payload.stageGoals.filter(({ status }) => status === 'active')) {
		const count = (activeStageCounts.get(goal.longTermGoalId) ?? 0) + 1;
		if (count > 1) fail('RELATIONSHIP_INVALID');
		activeStageCounts.set(goal.longTermGoalId, count);
	}
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
