import 'fake-indexeddb/auto';

import { describe, expect, it, vi } from 'vitest';

import { BACKUP_FORMAT, backupFingerprint, type BackupEnvelopeV1, type BackupPayloadV1 } from '@entities/backup';
import { encryptBackupJson } from '@shared/lib/crypto';
import type { CardTemplate } from '@entities/card-template';
import { RepeatOutcomeDatabase } from '@shared/lib/db';
import { inspectBackupFile, inspectBackupText } from './inspectBackup';
import { MAX_BACKUP_FILE_BYTES, readBackupFile } from '../lib/readBackupFile';

const digest = async (value: string) => {
	const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
	return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, '0')).join('');
};

const payload: BackupPayloadV1 = { userCards: [], longTermGoals: [], stageGoals: [], goalRevisions: [], todayDrafts: [], actionRecords: [], outcomeBatches: [], settings: [] };

async function plainEnvelope(overrides: Partial<BackupEnvelopeV1> = {}) {
	return {
		format: BACKUP_FORMAT, backupSchemaVersion: 1, databaseSchemaVersion: 1,
		appVersion: '0.50.0', exportedAt: '2026-07-12T02:00:00.000Z',
		definitionRefs: { cardTemplates: [] }, checksum: { algorithm: 'SHA-256', value: await backupFingerprint(payload, digest) }, data: payload,
		...overrides,
	} as BackupEnvelopeV1;
}

describe('backup inspection', () => {
	it('returns a ready preview for a valid plain backup', async () => {
		const result = await inspectBackupText(JSON.stringify(await plainEnvelope()), [], undefined, digest);
		expect(result).toMatchObject({ kind: 'ready', preview: { encrypted: false, userCards: 0 } });
	});

	it('requests a password before decrypting an encrypted backup', async () => {
		const text = await encryptBackupJson(JSON.stringify(await plainEnvelope()), 'password123');
		const pending = await inspectBackupText(text, [], undefined, digest);
		expect(pending).toMatchObject({ kind: 'password-required' });
		const ready = await inspectBackupText(text, [], 'password123', digest);
		expect(ready).toMatchObject({ kind: 'ready', preview: { encrypted: true } });
	});

	it('maps wrong passwords and corrupted ciphertext to one stable error', async () => {
		const text = await encryptBackupJson(JSON.stringify(await plainEnvelope()), 'password123');
		await expect(inspectBackupText(text, [], 'wrong-password', digest)).rejects.toMatchObject({ code: 'PASSWORD_OR_DATA_INVALID' });
		const corrupted = JSON.parse(text);
		corrupted.data = `${corrupted.data.slice(0, -2)}AA`;
		await expect(inspectBackupText(JSON.stringify(corrupted), [], 'password123', digest)).rejects.toMatchObject({ code: 'PASSWORD_OR_DATA_INVALID' });
	});

	it('rejects invalid JSON and unrelated DoHabit formats without writing', async () => {
		await expect(inspectBackupText('{broken', [], undefined, digest)).rejects.toMatchObject({ code: 'INVALID_JSON' });
		await expect(inspectBackupText(JSON.stringify({ format: 'dohabit-encrypted-backup' }), [], undefined, digest)).rejects.toMatchObject({ code: 'UNSUPPORTED_FORMAT' });
	});

	it('rejects oversized files before reading their contents', async () => {
		const text = vi.fn(async () => '{}');
		await expect(readBackupFile({ name: 'large.json', size: MAX_BACKUP_FILE_BYTES + 1, type: 'application/json', text })).rejects.toMatchObject({ code: 'FILE_TOO_LARGE' });
		expect(text).not.toHaveBeenCalled();
	});

	it('reads JSON files at the size boundary and rejects non-JSON names', async () => {
		const text = vi.fn(async () => '{"ok":true}');
		expect(await readBackupFile({ name: 'backup.json', size: MAX_BACKUP_FILE_BYTES, type: '', text })).toBe('{"ok":true}');
		await expect(readBackupFile({ name: 'backup.html', size: 10, type: 'text/html', text })).rejects.toMatchObject({ code: 'UNSUPPORTED_FILE' });
	});

	it('loads current template definitions through the feature boundary', async () => {
		const database = new RepeatOutcomeDatabase(`inspect-${crypto.randomUUID()}`);
		await database.tableFor<CardTemplate>('cardTemplates').put({ id: 'running', categoryId: 'sport', title: '跑步', sortOrder: 0, enabled: true, version: 1, defaultStageMode: 'quantity', quantity: { baseUnit: 'm', displayUnit: 'km', basePerDisplayUnit: 1000, maxDecimalPlaces: 2, confirmationThresholdDisplay: 100 } });
		const source = await plainEnvelope({ definitionRefs: { cardTemplates: [] } });
		const result = await inspectBackupFile(database, { name: 'backup.json', size: 10, type: 'application/json', text: async () => JSON.stringify(source) }, undefined, digest);
		expect(result.kind).toBe('ready');
		await database.delete();
	});
});
