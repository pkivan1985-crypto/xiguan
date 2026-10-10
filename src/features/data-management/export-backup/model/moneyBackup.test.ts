import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import { RepeatOutcomeDatabase, type SettingRecord } from '@shared/lib/db';
import { emptyMoneyState, MONEY_SETTING_KEY } from '@shared/lib/money-schema';
import { buildBackup } from './exportBackup';
import { inspectBackupText } from '../../inspect-backup/model/inspectBackup';
import { restoreBackup } from '../../restore-backup/model/restoreBackup';
import { loadMoney, saveMoneyBill, saveMoneyPayment, saveDebtAccount, saveMoneyEntry, linkMoneyPayment } from '@features/money';
import type { CardTemplate } from '@entities/card-template';
import type { UserCard } from '@entities/user-card';
import type { ActionRecord } from '@entities/action-record';
import { backupFingerprint } from '@entities/backup';

const databases: RepeatOutcomeDatabase[] = [];
const db = () => { const database = new RepeatOutcomeDatabase(`money-backup-${crypto.randomUUID()}`); databases.push(database); return database; };
afterEach(async () => { await Promise.all(databases.splice(0).map((database) => database.delete())); });
const options = { nowIso: '2026-10-10T08:00:00.000Z', appVersion: '3.0.0-rc.22' };
describe('money backup complete validation and compatibility', () => {
	it.each([undefined, 'test-only-password'])('restores a moved lone paid bill without losing the original month marker (%s)', async (password) => {
		const source = db(); const target = db();
		const bill = await saveMoneyBill(source, { title: '六月账单', category: 'fixedExpense', dueDate: '2026-06-30', amountCents: 1000 });
		await saveMoneyPayment(source, { submissionId: 'moved-one', billId: bill.id, amountCents: 1000, localDate: '2026-07-01', occurredTime: '12:00' });
		await saveMoneyBill(source, { ...bill, dueDate: '2026-07-01', confirmMonthChange: true });
		const file = await buildBackup(source, { ...options, password });
		const inspected = await inspectBackupText(file.contents, [], password);
		if (inspected.kind !== 'ready') throw new Error('NOT_READY');
		await restoreBackup(target, inspected.backup);
		const view = await loadMoney(target, '2026-06');
		expect(view.completedMonths).toEqual(['2026-07', '2026-06']);
		expect(view.bills.filter((item) => item.month === '2026-06')).toHaveLength(0);
		expect(view.bills[0]).toMatchObject({ id: bill.id, month: '2026-07' });
		expect(view.payments[0]).toMatchObject({ localDate: '2026-07-01', effective: true, amountCents: 1000 });
	});
	it.each([undefined, 'test-only-password'])('roundtrips all facts and completion markers with password %s', async (password) => {
		const source = db(); const target = db();
		const account = await saveDebtAccount(source, { title: 'loan', category: 'loan', balanceCents: 50000 });
		const bill = await saveMoneyBill(source, { title: 'payment', category: 'loan', accountId: account.id, dueDate: '2026-06-30', amountCents: 1000, repeatMonthly: true });
		await saveMoneyPayment(source, { submissionId: 'one', billId: bill.id, amountCents: 1000, localDate: '2026-07-01', occurredTime: '12:00' });
		await saveMoneyEntry(source, { type: 'income', item: 'salary', amountCents: 5000, localDate: '2026-07-01', occurredTime: '09:00' });
		const before = await loadMoney(source, '2026-07');
		const file = await buildBackup(source, { ...options, password });
		const result = await inspectBackupText(file.contents, [], password);
		if (result.kind !== 'ready') throw new Error('NOT_READY');
		await restoreBackup(target, result.backup);
		expect(await loadMoney(target, '2026-07')).toEqual(before);
		expect(target.verno).toBe(1);
	});
	it('reads old backups without money key using an empty safe default', async () => {
		const file = await buildBackup(db(), options); const result = await inspectBackupText(file.contents, []);
		if (result.kind !== 'ready') throw new Error('NOT_READY');
		const target = db(); await restoreBackup(target, result.backup);
		expect(await loadMoney(target, '2026-06')).toEqual({ accounts: [], templates: [], bills: [], payments: [], entries: [], completedMonths: [] });
	});
	it.each(['decimal', 'missing-bill', 'missing-source', 'duplicate-source'])('rejects corrupt money facts: %s', async (fault) => {
		const source = db();
		const bill = await saveMoneyBill(source, { category: 'fixedExpense', title: 'rent', dueDate: '2026-06-01', amountCents: 1000 });
		await saveMoneyPayment(source, { submissionId: 'one', billId: bill.id, amountCents: 1000, localDate: '2026-06-01', occurredTime: '12:00' });
		const setting = await source.tableFor<SettingRecord>('settings').get(MONEY_SETTING_KEY);
		const state = setting!.value as ReturnType<typeof emptyMoneyState>;
		if (fault === 'decimal') state.bills[0].amountCents = 0.1;
		if (fault === 'missing-bill') state.payments[0].billId = 'missing';
		if (fault === 'missing-source') state.entries = [];
		if (fault === 'duplicate-source') state.payments.push({ ...state.payments[0], id: 'duplicate' });
		await source.tableFor<SettingRecord>('settings').put({ ...setting!, value: state });
		await expect(buildBackup(source, options)).rejects.toThrow();
	});
	it.each(['javascript:alert(1)', 'https://example.org', '/arbitrary/path'])('rejects backup-controlled stored edit URL %s', async (editUrl) => {
		const source = db();
		await saveMoneyEntry(source, { type: 'expense', item: 'test', amountCents: 100, localDate: '2026-06-01', occurredTime: '10:00' });
		const setting = await source.tableFor<SettingRecord>('settings').get(MONEY_SETTING_KEY);
		const state = setting!.value as ReturnType<typeof emptyMoneyState>;
		Object.assign(state.entries[0], { editUrl });
		await source.tableFor<SettingRecord>('settings').put(setting!);
		await expect(buildBackup(source, options)).rejects.toThrow('UNSAFE_MONEY_EDIT_URL');
	});
	it.each(['deleted', 'income'])('normalizes external %s before export without writing the source database', async (fault) => {
		const source = db();
		const template: CardTemplate = { id: 'bookkeeping', categoryId: 'life', title: 'bookkeeping', enabled: true, sortOrder: 0, version: 1,
			defaultStageMode: 'quantity', quantity: { baseUnit: 'entry', displayUnit: 'entry', basePerDisplayUnit: 1, maxDecimalPlaces: 0, confirmationThresholdDisplay: 100 } };
		await source.tableFor<CardTemplate>('cardTemplates').put(template);
		await source.tableFor<UserCard>('userCards').put({ id: 'card', officialCardId: template.id, title: 'bookkeeping', status: 'active', sortOrder: 0, createdAt: options.nowIso, updatedAt: options.nowIso });
		const record: ActionRecord = { id: 'card:2026-06-01', userCardId: 'card', localDate: '2026-06-01', quantityBaseValue: 1,
			firstSavedAt: options.nowIso, lastSavedAt: options.nowIso, lastSubmissionId: 'original', details: { kind: 'bookkeeping', entries: [{
				id: 'entry:one', type: 'expense', amountCents: 100, categoryId: 'cat', categoryLabel: 'rent', accountId: 'cash', accountLabel: 'cash',
				item: 'rent', localDate: '2026-06-01', occurredTime: '10:00', createdAt: options.nowIso, updatedAt: options.nowIso }] } };
		await source.tableFor<ActionRecord>('actionRecords').put(record);
		const bill = await saveMoneyBill(source, { title: 'rent', category: 'fixedExpense', amountCents: 100, dueDate: '2026-06-01' });
		await linkMoneyPayment(source, { submissionId: 'link', billId: bill.id, sourceId: (await loadMoney(source, '2026-06')).entries[0].sourceId });
		const cached = await source.tableFor<SettingRecord>('settings').get(MONEY_SETTING_KEY);
		if (fault === 'deleted') record.deletedAt = options.nowIso;
		else if (record.details?.kind === 'bookkeeping') record.details.entries[0].type = 'income';
		await source.tableFor<ActionRecord>('actionRecords').put(record);
		const file = await buildBackup(source, options);
		expect(await source.tableFor<SettingRecord>('settings').get(MONEY_SETTING_KEY)).toEqual(cached);
		const result = await inspectBackupText(file.contents, [{ id: template.id, version: 1 }]);
		if (result.kind !== 'ready') throw new Error('NOT_READY');
		const restoredState = result.backup.envelope.data.settings.find(({ key }) => key === MONEY_SETTING_KEY)!.value as ReturnType<typeof emptyMoneyState>;
		expect(restoredState.payments[0]).toMatchObject({ effective: false, sourceUnavailable: true });
		expect(restoredState.completedMonths).toEqual(['2026-06']);
		// Recomputed checksum cannot bless a forged effective dangling link.
		const tampered = JSON.parse(file.contents);
		const money = tampered.data.settings.find((setting: SettingRecord) => setting.key === MONEY_SETTING_KEY).value;
		money.payments[0].effective = true; money.payments[0].sourceUnavailable = false;
		const digest = async (value: string) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))), (byte) => byte.toString(16).padStart(2, '0')).join('');
		tampered.checksum.value = await backupFingerprint(tampered.data, digest);
		await expect(inspectBackupText(JSON.stringify(tampered), [{ id: template.id, version: 1 }])).rejects.toMatchObject({ code: 'RELATIONSHIP_INVALID' });
	});
});
