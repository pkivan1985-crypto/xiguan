import 'fake-indexeddb/auto';

import { afterEach, describe, expect, it } from 'vitest';

import type { CardTemplate } from '@entities/card-template';
import { validatePlainBackup } from '@entities/backup';
import type { UserCard } from '@entities/user-card';
import { RepeatOutcomeDatabase } from '@shared/lib/db';
import { isEncryptedBackupEnvelope } from '@shared/lib/crypto';
import { buildBackup } from './exportBackup';
import { downloadBackup, type BackupDownloadEnvironment } from '../lib/downloadBackup';

const digest = async (value: string) => {
	const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
	return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, '0')).join('');
};

describe('backup export', () => {
	const databases: RepeatOutcomeDatabase[] = [];
	afterEach(async () => Promise.all(databases.splice(0).map((database) => database.delete())));

	async function setup() {
		const database = new RepeatOutcomeDatabase(`export-${crypto.randomUUID()}`);
		databases.push(database);
		const running: CardTemplate = { id: 'running', categoryId: 'sport', title: '跑步', sortOrder: 0, enabled: true, version: 1, defaultStageMode: 'quantity', quantity: { baseUnit: 'm', displayUnit: 'km', basePerDisplayUnit: 1000, maxDecimalPlaces: 2, confirmationThresholdDisplay: 100 } };
		const unused: CardTemplate = { ...running, id: 'unused', title: '未使用', version: 3 };
		const card: UserCard = { id: 'card-1', officialCardId: 'running', title: '晨跑', status: 'active', sortOrder: 0, createdAt: '2026-07-12T01:00:00.000Z', updatedAt: '2026-07-12T01:00:00.000Z' };
		await database.tableFor<CardTemplate>('cardTemplates').bulkPut([running, unused]);
		await database.tableFor<UserCard>('userCards').put(card);
		return database;
	}

	it('builds a valid plain snapshot with only referenced template versions', async () => {
		const database = await setup();
		const file = await buildBackup(database, { nowIso: '2026-07-12T02:03:00.000Z', appVersion: '0.50.0', digest });
		const envelope = JSON.parse(file.contents);
		expect(file).toMatchObject({ encrypted: false, fileName: 'repeat-outcome-backup-20260712-0203.json' });
		expect(envelope.definitionRefs.cardTemplates).toEqual([{ id: 'running', version: 1 }]);
		expect((await validatePlainBackup(envelope, [{ id: 'running', version: 1 }], digest)).preview.userCards).toBe(1);
	});

	it('optionally encrypts the complete plain envelope', async () => {
		const database = await setup();
		const file = await buildBackup(database, { nowIso: '2026-07-12T02:03:00.000Z', appVersion: '0.50.0', password: '密码backup123', digest });
		expect(file.encrypted).toBe(true);
		expect(isEncryptedBackupEnvelope(JSON.parse(file.contents))).toBe(true);
		expect(file.contents).not.toContain('晨跑');
	});

	it('revokes the temporary URL even after the browser receives the download', () => {
		const calls: string[] = [];
		const anchor = { href: '', download: '', click: () => calls.push('click'), remove: () => calls.push('remove') };
		const environment: BackupDownloadEnvironment = {
			createObjectURL: () => 'blob:backup', revokeObjectURL: (url) => calls.push(`revoke:${url}`), createAnchor: () => anchor,
		};
		downloadBackup({ contents: '{}', fileName: 'backup.json', encrypted: false, preview: { userCards: 0, longTermGoals: 0, stageGoals: 0, goalRevisions: 0, todayDrafts: 0, actionRecords: 0, outcomeBatches: 0, settings: 0, exportedAt: '2026-07-12T02:03:00.000Z', appVersion: '0.50.0', encrypted: false } }, environment);
		expect(anchor).toMatchObject({ href: 'blob:backup', download: 'backup.json' });
		expect(calls).toEqual(['click', 'remove', 'revoke:blob:backup']);
	});
});
