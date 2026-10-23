import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RepeatOutcomeDatabase } from '@shared/lib/db';
import type { ActionRecord } from '@entities/action-record';
import { externalMoneyEntries } from '@shared/lib/money-schema/sources';
import { seedSystemDefinitions, SYSTEM_CARD_TEMPLATES } from '@entities/card-template';
import { buildBackup } from '@features/data-management/export-backup/model/exportBackup';
import { inspectBackupText } from '@features/data-management/inspect-backup/model/inspectBackup';
import { restoreBackup } from '@features/data-management/restore-backup/model/restoreBackup';
import { buildBookkeepingEntry, bookkeepingTotals, saveBookkeepingEntry } from './bookkeepingRecord';

let database: RepeatOutcomeDatabase;
beforeEach(() => { database = new RepeatOutcomeDatabase(`bookkeeping-${crypto.randomUUID()}`); });
afterEach(async () => { database.close(); await database.delete(); });

describe('bookkeeping records', () => {
	it.each([undefined, 'test-only-password'])('preserves linked reflection and one money charge through backup/restore (%s)', async (password) => {
		const nowIso = '2026-10-10T04:30:00.000Z';
		await seedSystemDefinitions(database);
		for (const [id, officialCardId] of [['ledger', 'bookkeeping'], ['extra', 'extra-expense']]) await database.table('userCards').add({ id, officialCardId, title: id, status: 'active', sortOrder: 0, createdAt: nowIso, updatedAt: nowIso });
		const entry = buildBookkeepingEntry({ type: 'expense', amount: '8.05', categoryId: 'food', categoryLabel: '餐饮', accountId: 'cash', accountLabel: '现金', item: '奶茶', note: '', localDate: '2026-10-09', occurredTime: '12:30' }, { id: 'tea', nowIso })!;
		await saveBookkeepingEntry(database, { userCardId: 'ledger', entry, nowIso, submissionId: 'backup', addToExtraExpense: true });
		const backup = await buildBackup(database, { nowIso, appVersion: '3.0.0-rc.22', password });
		const inspected = await inspectBackupText(backup.contents, SYSTEM_CARD_TEMPLATES.map(({ id, version }) => ({ id, version })), password);
		if (inspected.kind !== 'ready') throw new Error('BACKUP_NOT_READY');
		const target = new RepeatOutcomeDatabase(`bookkeeping-restored-${crypto.randomUUID()}`);
		try {
			await seedSystemDefinitions(target);
			await restoreBackup(target, inspected.backup);
			const restored = await target.tableFor<ActionRecord>('actionRecords').toArray();
			expect(restored).toHaveLength(2);
			expect(externalMoneyEntries(restored).map(({ amountCents }) => amountCents)).toEqual([805]);
		} finally { target.close(); await target.delete(); }
	});
	it('rolls the added reflection back if the bookkeeping write fails', async () => {
		const nowIso = '2026-10-10T04:30:00.000Z';
		for (const [id, officialCardId] of [['ledger', 'bookkeeping'], ['extra', 'extra-expense']]) await database.table('userCards').add({ id, officialCardId, title: id, status: 'active', sortOrder: 0, createdAt: nowIso, updatedAt: nowIso });
		const entry = buildBookkeepingEntry({ type: 'expense', amount: '8.05', categoryId: 'food', categoryLabel: '餐饮', accountId: 'cash', accountLabel: '现金', item: '', note: '', localDate: '2026-10-09', occurredTime: '12:30' }, { id: 'a', nowIso })!;
		const table = database.tableFor<ActionRecord>('actionRecords');
		const put = table.put.bind(table);
		const spy = vi.spyOn(table, 'put').mockImplementation((record) => { if (record.userCardId === 'ledger') throw new Error('TEST_WRITE_FAILURE'); return put(record); });
		try { await expect(saveBookkeepingEntry(database, { userCardId: 'ledger', entry, nowIso, submissionId: 'fail', addToExtraExpense: true })).rejects.toThrow('TEST_WRITE_FAILURE'); } finally { spy.mockRestore(); }
		expect(await table.count()).toBe(0);
	});
	it('adds one editable expense reflection atomically and never duplicates the charge or overwrites reflection on retry', async () => {
		const nowIso = '2026-10-10T04:30:00.000Z';
		for (const [id, officialCardId] of [['ledger', 'bookkeeping'], ['extra', 'extra-expense']]) await database.table('userCards').add({ id, officialCardId, title: id, status: 'active', sortOrder: 0, createdAt: nowIso, updatedAt: nowIso });
		const entry = buildBookkeepingEntry({ type: 'expense', amount: '38.50', categoryId: 'food', categoryLabel: '餐饮', accountId: 'cash', accountLabel: '现金', item: '奶茶', note: '', localDate: '2026-10-09', occurredTime: '12:30' }, { id: 'tea', nowIso })!;
		const input = { userCardId: 'ledger', entry, nowIso, submissionId: 'linked', addToExtraExpense: true };
		await saveBookkeepingEntry(database, input);
		const records = database.tableFor<ActionRecord>('actionRecords');
		const reflection = (await records.get('extra:2026-10-09'))!;
		expect(reflection).toMatchObject({ quantityBaseValue: 3850, details: { kind: 'extra-expense', entries: [{ item: '奶茶', amountCents: 3850, occurredTime: '12:30', reason: '待填写购买原因' }] } });
		if (reflection.details?.kind !== 'extra-expense' || !('entries' in reflection.details)) throw new Error('missing reflection');
		reflection.details.entries[0]!.reason = '自己的反思';
		await records.put(reflection);
		await saveBookkeepingEntry(database, input);
		expect((await records.get(reflection.id))?.details).toMatchObject({ entries: [{ reason: '自己的反思' }] });
		expect(externalMoneyEntries(await records.toArray())).toHaveLength(1);
		expect(externalMoneyEntries(await records.toArray())[0]?.amountCents).toBe(3850);
	});
	it('does not partially save bookkeeping when the requested expense card is unavailable, and does not link income', async () => {
		const nowIso = '2026-10-10T04:30:00.000Z';
		await database.table('userCards').add({ id: 'ledger', officialCardId: 'bookkeeping', title: '记账', status: 'active', sortOrder: 0, createdAt: nowIso, updatedAt: nowIso });
		const entry = buildBookkeepingEntry({ type: 'expense', amount: '8.05', categoryId: 'food', categoryLabel: '餐饮', accountId: 'cash', accountLabel: '现金', item: '', note: '', localDate: '2026-10-09', occurredTime: '12:30' }, { id: 'a', nowIso })!;
		await expect(saveBookkeepingEntry(database, { userCardId: 'ledger', entry, nowIso, submissionId: 'missing', addToExtraExpense: true })).rejects.toThrow('EXTRA_EXPENSE_CARD_NOT_AVAILABLE');
		expect(await database.table('actionRecords').count()).toBe(0);
		await expect(saveBookkeepingEntry(database, { userCardId: 'ledger', entry: { ...entry, type: 'income' }, nowIso, submissionId: 'income', addToExtraExpense: true })).rejects.toThrow('EXTRA_EXPENSE_REQUIRES_EXPENSE');
	});
	it('builds a dated transaction and calculates signed monthly totals', () => {
		const entry = buildBookkeepingEntry({ type: 'expense', amount: '38.50', categoryId: 'food', categoryLabel: '餐饮', accountId: 'wechat', accountLabel: '微信', item: '午餐', note: '', localDate: '2026-09-14', occurredTime: '12:30' }, { id: 'a', nowIso: '2026-09-14T04:30:00.000Z' });
		expect(entry).toMatchObject({ amountCents: 3850, localDate: '2026-09-14', occurredTime: '12:30' });
		expect(bookkeepingTotals([entry!, { ...entry!, id: 'b', type: 'income', amountCents: 820000 }])).toEqual({ incomeCents: 820000, expenseCents: 3850, balanceCents: 816150 });
	});

	it('rejects amounts with more than two decimal places instead of rounding silently', () => {
		expect(buildBookkeepingEntry({ type: 'expense', amount: '38.505', categoryId: 'food', categoryLabel: '餐饮', accountId: 'cash', accountLabel: '现金', item: '', note: '', localDate: '2026-09-14', occurredTime: '12:30' }, { id: 'a', nowIso: '2026-09-14T04:30:00.000Z' })).toBeNull();
	});

	it('stores multiple entries in the single daily action record', async () => {
		await database.table('userCards').add({ id: 'ledger', officialCardId: 'bookkeeping', title: '记账', status: 'active', sortOrder: 0, createdAt: '2026-09-14T00:00:00.000Z', updatedAt: '2026-09-14T00:00:00.000Z' });
		for (const [id, amount] of [['a', 3850], ['b', 9000]] as const) await saveBookkeepingEntry(database, { userCardId: 'ledger', entry: { id, type: 'expense', amountCents: amount, categoryId: 'food', categoryLabel: '餐饮', accountId: 'cash', accountLabel: '现金', localDate: '2026-09-14', occurredTime: id === 'a' ? '12:30' : '18:20', createdAt: '2026-09-14T00:00:00.000Z', updatedAt: '2026-09-14T00:00:00.000Z' }, nowIso: '2026-09-14T12:00:00.000Z', submissionId: id });
		const record = await database.table('actionRecords').get('ledger:2026-09-14');
		expect(record).toMatchObject({ quantityBaseValue: 2, details: { kind: 'bookkeeping', entries: [{ id: 'a' }, { id: 'b' }] } });
	});

	it('adds a backfilled transaction to its historical day without overwriting another entry', async () => {
		await database.table('userCards').add({ id: 'ledger', officialCardId: 'bookkeeping', title: '记账', status: 'active', sortOrder: 0, createdAt: '2026-09-01T00:00:00.000Z', updatedAt: '2026-09-01T00:00:00.000Z' });
		const existing = { id: 'old', type: 'expense' as const, amountCents: 1200, categoryId: 'food', categoryLabel: '餐饮', accountId: 'cash', accountLabel: '现金', localDate: '2026-09-10', occurredTime: '08:00', createdAt: '2026-09-10T00:00:00.000Z', updatedAt: '2026-09-10T00:00:00.000Z' };
		await saveBookkeepingEntry(database, { userCardId: 'ledger', entry: existing, nowIso: existing.updatedAt, submissionId: 'old' });
		const backfilled = { ...existing, id: 'backfilled', amountCents: 3850, item: '午餐', occurredTime: '12:30', createdAt: '2026-09-15T04:30:00.000Z', updatedAt: '2026-09-15T04:30:00.000Z' };

		await saveBookkeepingEntry(database, { userCardId: 'ledger', entry: backfilled, nowIso: backfilled.updatedAt, submissionId: 'backfill' });

		expect(await database.table('actionRecords').get('ledger:2026-09-10')).toMatchObject({
			quantityBaseValue: 2,
			details: { entries: [{ id: 'old' }, { id: 'backfilled', localDate: '2026-09-10', amountCents: 3850 }] },
		});
	});

	it('moves an edited entry to its newly selected date without duplicating it', async () => {
		await database.table('userCards').add({ id: 'ledger', officialCardId: 'bookkeeping', title: '记账', status: 'active', sortOrder: 0, createdAt: '2026-09-14T00:00:00.000Z', updatedAt: '2026-09-14T00:00:00.000Z' });
		const entry = { id: 'salary', type: 'income' as const, amountCents: 820000, categoryId: 'salary', categoryLabel: '工资', accountId: 'bank', accountLabel: '银行卡', localDate: '2026-09-14', occurredTime: '09:00', createdAt: '2026-09-14T00:00:00.000Z', updatedAt: '2026-09-14T00:00:00.000Z' };
		await saveBookkeepingEntry(database, { userCardId: 'ledger', entry, nowIso: entry.updatedAt, submissionId: 'create' });
		await saveBookkeepingEntry(database, { userCardId: 'ledger', sourceLocalDate: entry.localDate, entry: { ...entry, localDate: '2026-09-01', updatedAt: '2026-09-14T01:00:00.000Z' }, nowIso: '2026-09-14T01:00:00.000Z', submissionId: 'move' });
		expect(await database.table('actionRecords').get('ledger:2026-09-14')).toBeUndefined();
		expect(await database.table('actionRecords').get('ledger:2026-09-01')).toMatchObject({ quantityBaseValue: 1, details: { entries: [{ id: 'salary', localDate: '2026-09-01' }] } });
	});
});
