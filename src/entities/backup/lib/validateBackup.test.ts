import { describe, expect, it } from 'vitest';

import {
	BACKUP_FORMAT,
	type BackupEnvelopeV1,
	type BackupPayloadV1,
	BackupValidationError,
	backupFingerprint,
	stableStringify,
	validatePlainBackup,
} from '../index';

const digest = async (value: string) => {
	const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
	return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, '0')).join('');
};

const payload: BackupPayloadV1 = {
	userCards: [{ id: 'card-1', officialCardId: 'running', title: '晨跑', status: 'active', sortOrder: 0, createdAt: '2026-07-12T01:00:00.000Z', updatedAt: '2026-07-12T01:00:00.000Z' }],
	longTermGoals: [{ id: 'long-1', userCardId: 'card-1', title: '累计100公里', targetQuantityBase: 100_000, status: 'active', startDate: '2026-07-01', createdAt: '2026-07-12T01:00:00.000Z', updatedAt: '2026-07-12T01:00:00.000Z' }],
	stageGoals: [{ id: 'stage-1', longTermGoalId: 'long-1', title: '阶段20公里', mode: 'quantity', targetQuantityBase: 20_000, status: 'active', startDate: '2026-07-01', createdAt: '2026-07-12T01:00:00.000Z', updatedAt: '2026-07-12T01:00:00.000Z' }],
	goalRevisions: [],
	todayDrafts: [],
	actionRecords: [{ id: 'record-1', userCardId: 'card-1', localDate: '2026-07-12', quantityBaseValue: 5_000, longTermGoalId: 'long-1', stageGoalId: 'stage-1', firstSavedAt: '2026-07-12T01:00:00.000Z', lastSavedAt: '2026-07-12T01:00:00.000Z', lastSubmissionId: 'submission-1' }],
	outcomeBatches: [],
	settings: [{ key: 'repeat-outcome-ui-settings', value: '{"state":{}}', updatedAt: '2026-07-12T01:00:00.000Z' }],
};

async function envelope(overrides: Partial<BackupEnvelopeV1> = {}): Promise<BackupEnvelopeV1> {
	return {
		format: BACKUP_FORMAT,
		backupSchemaVersion: 1,
		databaseSchemaVersion: 1,
		appVersion: '0.50.0',
		exportedAt: '2026-07-12T02:00:00.000Z',
		definitionRefs: { cardTemplates: [{ id: 'running', version: 1 }] },
		checksum: { algorithm: 'SHA-256', value: await backupFingerprint(payload, digest) },
		data: structuredClone(payload),
		...overrides,
	};
}

const definitions = [{ id: 'running', version: 1 }];

describe('backup V1 validation', () => {
	it('validates a related payload and derives a private preview', async () => {
		const validated = await validatePlainBackup(await envelope(), definitions, digest);
		expect(validated.preview).toMatchObject({ userCards: 1, longTermGoals: 1, stageGoals: 1, actionRecords: 1, encrypted: false });
		expect(validated.fingerprint).toHaveLength(64);
	});

	it('serializes object keys deterministically and rejects non-finite values', () => {
		expect(stableStringify({ z: 1, a: { d: 4, b: 2 } })).toBe('{"a":{"b":2,"d":4},"z":1}');
		expect(() => stableStringify({ value: Number.NaN })).toThrow('UNSUPPORTED_BACKUP_VALUE');
	});

	it('rejects a backup version newer than this app', async () => {
		await expect(validatePlainBackup(await envelope({ backupSchemaVersion: 2 as 1 }), definitions, digest))
			.rejects.toMatchObject({ code: 'BACKUP_VERSION_TOO_NEW' });
	});

	it('rejects checksum tampering before accepting a restore plan', async () => {
		const invalid = await envelope();
		invalid.data.actionRecords[0].quantityBaseValue = 9_000;
		await expect(validatePlainBackup(invalid, definitions, digest)).rejects.toMatchObject({ code: 'CHECKSUM_MISMATCH' });
	});

	it('rejects duplicate card/day records after checksum validation', async () => {
		const invalidPayload = structuredClone(payload);
		invalidPayload.actionRecords.push({ ...invalidPayload.actionRecords[0], id: 'record-2' });
		const invalid = await envelope({ data: invalidPayload, checksum: { algorithm: 'SHA-256', value: await backupFingerprint(invalidPayload, digest) } });
		await expect(validatePlainBackup(invalid, definitions, digest)).rejects.toMatchObject({ code: 'DUPLICATE_KEY' });
	});

	it('rejects broken goal ownership and unsupported templates', async () => {
		const broken = structuredClone(payload);
		broken.longTermGoals[0].userCardId = 'missing-card';
		const invalid = await envelope({ data: broken, checksum: { algorithm: 'SHA-256', value: await backupFingerprint(broken, digest) } });
		await expect(validatePlainBackup(invalid, definitions, digest)).rejects.toMatchObject({ code: 'RELATIONSHIP_INVALID' });
		await expect(validatePlainBackup(await envelope(), [{ id: 'running', version: 2 }], digest)).rejects.toMatchObject({ code: 'TEMPLATE_INCOMPATIBLE' });
	});

	it('rejects multiple active stages for one long-term goal', async () => {
		const broken = structuredClone(payload);
		broken.stageGoals.push({
			...broken.stageGoals[0],
			id: 'stage-2',
			sequence: 1,
			title: '阶段30公里',
		});
		const invalid = await envelope({ data: broken, checksum: { algorithm: 'SHA-256', value: await backupFingerprint(broken, digest) } });
		await expect(validatePlainBackup(invalid, definitions, digest)).rejects.toMatchObject({ code: 'RELATIONSHIP_INVALID' });
	});

	it('accepts a compatible daily plan and rejects an invalid weekday', async () => {
		const planned = await envelope();
		planned.data.userCards[0].dailyPlan = {
			mode: 'average',
			weekdays: [1, 3, 5],
		};
		planned.data.stageGoals[0].dailyTargetBase = 2_000;
		planned.checksum.value = await backupFingerprint(planned.data, digest);
		await expect(validatePlainBackup(planned, definitions, digest)).resolves.toBeDefined();

		const broken = structuredClone(planned);
		broken.data.userCards[0].dailyPlan!.weekdays = [0 as never];
		broken.checksum.value = await backupFingerprint(broken.data, digest);
		await expect(validatePlainBackup(broken, definitions, digest)).rejects.toMatchObject({ code: 'INVALID_BACKUP' });
	});

	it('uses stable error objects instead of translated entity messages', () => {
		const error = new BackupValidationError('INVALID_BACKUP');
		expect(error.code).toBe('INVALID_BACKUP');
	});
});
