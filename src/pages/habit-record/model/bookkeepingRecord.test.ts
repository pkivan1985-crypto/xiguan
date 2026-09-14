import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { RepeatOutcomeDatabase } from '@shared/lib/db';
import { buildBookkeepingEntry, bookkeepingTotals, saveBookkeepingEntry } from './bookkeepingRecord';

let database: RepeatOutcomeDatabase;
beforeEach(() => { database = new RepeatOutcomeDatabase(`bookkeeping-${crypto.randomUUID()}`); });
afterEach(async () => { database.close(); await database.delete(); });

describe('bookkeeping records', () => {
	it('builds a dated transaction and calculates signed monthly totals', () => {
		const entry = buildBookkeepingEntry({ type: 'expense', amount: '38.50', categoryId: 'food', categoryLabel: '餐饮', accountId: 'wechat', accountLabel: '微信', item: '午餐', note: '', localDate: '2026-09-14', occurredTime: '12:30' }, { id: 'a', nowIso: '2026-09-14T04:30:00.000Z' });
		expect(entry).toMatchObject({ amountCents: 3850, localDate: '2026-09-14', occurredTime: '12:30' });
		expect(bookkeepingTotals([entry!, { ...entry!, id: 'b', type: 'income', amountCents: 820000 }])).toEqual({ incomeCents: 820000, expenseCents: 3850, balanceCents: 816150 });
	});

	it('stores multiple entries in the single daily action record', async () => {
		await database.table('userCards').add({ id: 'ledger', officialCardId: 'bookkeeping', title: '记账', status: 'active', sortOrder: 0, createdAt: '2026-09-14T00:00:00.000Z', updatedAt: '2026-09-14T00:00:00.000Z' });
		for (const [id, amount] of [['a', 3850], ['b', 9000]] as const) await saveBookkeepingEntry(database, { userCardId: 'ledger', entry: { id, type: 'expense', amountCents: amount, categoryId: 'food', categoryLabel: '餐饮', accountId: 'cash', accountLabel: '现金', localDate: '2026-09-14', occurredTime: id === 'a' ? '12:30' : '18:20', createdAt: '2026-09-14T00:00:00.000Z', updatedAt: '2026-09-14T00:00:00.000Z' }, nowIso: '2026-09-14T12:00:00.000Z', submissionId: id });
		const record = await database.table('actionRecords').get('ledger:2026-09-14');
		expect(record).toMatchObject({ quantityBaseValue: 2, details: { kind: 'bookkeeping', entries: [{ id: 'a' }, { id: 'b' }] } });
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
