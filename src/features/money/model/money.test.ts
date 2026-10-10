import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RepeatOutcomeDatabase, type SettingRecord } from '@shared/lib/db';
import type { ActionRecord } from '@entities/action-record';
import { summarizeMoneyMonth, monthlyDueDate, summarizeDebt } from '@entities/money';
import { loadMoney, saveMoneyBill, saveMoneyPayment, revokeMoneyPayment, saveDebtAccount, saveMoneyEntry, linkMoneyPayment, saveMoneyTemplate } from './money';

let db: RepeatOutcomeDatabase;
beforeEach(() => { db = new RepeatOutcomeDatabase(`money-test-${crypto.randomUUID()}`); });
afterEach(async () => { vi.restoreAllMocks(); vi.useRealTimers(); await db.delete(); });
const billInput = { category: 'fixedExpense' as const, title: 'rent', dueDate: '2026-06-30', amountCents: 10000 };
const paymentInput = { submissionId: 'submit-1', amountCents: 10000, localDate: '2026-07-01', occurredTime: '12:00' };
const original: ActionRecord = {
	id: 'record', userCardId: 'card', localDate: '2026-07-01', quantityBaseValue: 1,
	firstSavedAt: '2026-07-01T00:00:00Z', lastSavedAt: '2026-07-01T00:00:00Z', lastSubmissionId: 'old',
	details: { kind: 'bookkeeping', entries: [{ id: 'entry', type: 'expense', amountCents: 10000,
		categoryId: 'cat', categoryLabel: 'rent', accountId: 'cash', accountLabel: 'cash', item: 'rent',
		localDate: '2026-07-01', occurredTime: '10:00', createdAt: '2026-07-01T00:00:00Z', updatedAt: '2026-07-01T00:00:00Z' }] },
};

describe('money persistence and facts', () => {
	it('edits a linked independent source without duplicating it and invalidates income associations', async () => {
		const bill = await saveMoneyBill(db, { ...billInput, category: 'loan' });
		const input = { type: 'expense' as const, item: '原收支', amountCents: 10000, localDate: '2026-07-01', occurredTime: '10:00' };
		const entry = await saveMoneyEntry(db, input);
		await linkMoneyPayment(db, { submissionId: 'link-independent', billId: bill.id, sourceId: entry.sourceId });
		await saveMoneyEntry(db, { ...input, id: entry.id, amountCents: 3000, note: '纠错' });
		let view = await loadMoney(db, '2026-06');
		expect(view.entries).toHaveLength(1);
		expect(view.entries[0].editUrl).toBeUndefined();
		expect(view.payments).toHaveLength(1);
		expect(view.payments[0]).toMatchObject({ amountCents: 3000, note: '纠错', effective: true });
		expect(summarizeMoneyMonth(view, '2026-06').remainingCents).toBe(7000);
		await saveMoneyEntry(db, { ...input, id: entry.id, type: 'income' });
		view = await loadMoney(db, '2026-06');
		expect(view.payments[0]).toMatchObject({ effective: false, sourceUnavailable: true });
		expect(view.entries[0].type).toBe('income');
	});
	it('remembers original day across short months and generates a template/month once', async () => {
		expect(monthlyDueDate('2026-02', 31)).toBe('2026-02-28');
		expect(monthlyDueDate('2026-03', 31)).toBe('2026-03-31');
		await saveMoneyBill(db, { ...billInput, dueDate: '2026-01-31', repeatMonthly: true });
		await Promise.all([loadMoney(db, '2026-02'), loadMoney(db, '2026-02')]);
		const view = await loadMoney(db, '2026-03');
		expect(view.bills.map((bill) => bill.dueDate)).toEqual(['2026-01-31', '2026-02-28', '2026-03-31']);
		expect(view.templates[0].dayOfMonth).toBe(31);
	});
	it('uses per-bill remaining, partial repeated payments, edits, revocation and persistent completion marks', async () => {
		const bill = await saveMoneyBill(db, billInput);
		const first = await saveMoneyPayment(db, { ...paymentInput, billId: bill.id, amountCents: 3000 });
		expect(summarizeMoneyMonth(await loadMoney(db, '2026-06'), '2026-06').remainingCents).toBe(7000);
		await saveMoneyPayment(db, { ...paymentInput, submissionId: 'submit-2', billId: bill.id, amountCents: 7000 });
		expect((await loadMoney(db, '2026-06')).completedMonths).toEqual(['2026-06']);
		await saveMoneyPayment(db, { ...paymentInput, submissionId: 'edit-1', id: first.id, billId: bill.id, amountCents: 8000, note: 'changed' });
		await saveMoneyBill(db, { ...billInput, title: 'utilities' });
		let view = await loadMoney(db, '2026-06');
		expect(summarizeMoneyMonth(view, '2026-06')).toMatchObject({ paidCents: 15000, remainingCents: 10000, completed: false });
		expect(view.completedMonths).toEqual(['2026-06']);
		await revokeMoneyPayment(db, first.id);
		view = await loadMoney(db, '2026-07');
		expect(view.entries.filter((entry) => entry.type === 'expense').map((entry) => entry.amountCents)).toEqual([7000]);
	});
	it('serializes concurrent duplicate submissions and rolls back failures', async () => {
		const bill = await saveMoneyBill(db, billInput);
		const input = { ...paymentInput, billId: bill.id };
		await Promise.all([saveMoneyPayment(db, input), saveMoneyPayment(db, input)]);
		let view = await loadMoney(db, '2026-06');
		expect(view.payments).toHaveLength(1); expect(view.entries).toHaveLength(1);
		const table = db.tableFor<SettingRecord>('settings');
		const before = await table.get('money-v1');
		vi.spyOn(table, 'put').mockRejectedValueOnce(new Error('DISK_FULL'));
		await expect(saveMoneyPayment(db, { ...input, submissionId: 'other' })).rejects.toThrow('DISK_FULL');
		expect(await table.get('money-v1')).toEqual(before);
		view = await loadMoney(db, '2026-06'); expect(view.payments).toHaveLength(1);
	});
	it('counts debt accounts once, retains unknown and zero, does not infer balance from repayments', async () => {
		const account = await saveDebtAccount(db, { category: 'loan', title: 'loan', balanceCents: 1200000 });
		await saveDebtAccount(db, { category: 'creditCard', title: 'unknown' });
		await saveDebtAccount(db, { category: 'creditCard', title: 'zero', balanceCents: 0 });
		const bill = await saveMoneyBill(db, { ...billInput, category: 'loan', accountId: account.id, repeatMonthly: true });
		await saveMoneyPayment(db, { ...paymentInput, billId: bill.id });
		const view = await loadMoney(db, '2026-07');
		expect(summarizeDebt(view.accounts)).toMatchObject({ knownDebtCents: 1200000, unknownCount: 1 });
		expect(view.entries[0].type).toBe('repayment');
	});
	it('resolves linked original edits live without copying or rewriting any action facts and rejects double links', async () => {
		await db.tableFor<ActionRecord>('actionRecords').put(original);
		const bill = await saveMoneyBill(db, { ...billInput, category: 'loan' });
		const sourceId = (await loadMoney(db, '2026-07')).entries[0].sourceId;
		const payment = await linkMoneyPayment(db, { submissionId: 'linked', billId: bill.id, sourceId });
		const other = await saveMoneyBill(db, billInput);
		await expect(linkMoneyPayment(db, { submissionId: 'linked-other', billId: other.id, sourceId })).rejects.toThrow('SOURCE_ALREADY_LINKED');
		const changed = structuredClone(original);
		if (changed.details?.kind === 'bookkeeping') { changed.details.entries[0].amountCents = 5000; changed.details.entries[0].localDate = '2026-08-02'; }
		await db.tableFor<ActionRecord>('actionRecords').put(changed);
		const view = await loadMoney(db, '2026-08');
		expect(view.payments[0]).toMatchObject({ amountCents: 5000, localDate: '2026-08-02' });
		expect(view.entries).toHaveLength(1); expect(view.entries[0].type).toBe('repayment');
		expect(summarizeMoneyMonth({ bills: view.bills.filter(({ id }) => id === bill.id), payments: view.payments }, '2026-06').remainingCents).toBe(5000);
		await expect(saveMoneyPayment(db, { ...paymentInput, submissionId: 'edit', id: payment.id, billId: bill.id })).rejects.toThrow('SOURCE_EDIT_REQUIRED');
		await revokeMoneyPayment(db, payment.id);
		expect(await db.tableFor<ActionRecord>('actionRecords').get(original.id)).toEqual(changed);
		expect((await loadMoney(db, '2026-08')).entries[0].type).toBe('expense');
	});
	it('persists standalone entries without creating habits and rejects invalid money, dates, future facts and unsafe month moves', async () => {
		await saveMoneyEntry(db, { type: 'income', item: 'salary', amountCents: 120030, localDate: '2026-06-01', occurredTime: '09:00' });
		expect(await db.table('userCards').count()).toBe(0);
		expect((await loadMoney(db, '2026-06')).entries[0]).toMatchObject({ amountCents: 120030, type: 'income' });
		await expect(saveMoneyBill(db, { ...billInput, amountCents: 0.1 })).rejects.toThrow();
		await expect(saveMoneyBill(db, { ...billInput, dueDate: '2026-02-31' })).rejects.toThrow();
		const bill = await saveMoneyBill(db, billInput);
		await expect(saveMoneyPayment(db, { ...paymentInput, billId: bill.id, localDate: '2099-01-01' })).rejects.toThrow('FUTURE_FACT');
		await saveMoneyPayment(db, { ...paymentInput, billId: bill.id });
		await expect(saveMoneyBill(db, { ...billInput, id: bill.id, dueDate: '2026-07-01' })).rejects.toThrow('CONFIRM_MONTH_CHANGE');
	});
	it.each(['record-deleted', 'entry-deleted', 'income'])('invalidates linked source %s without losing completion history', async (fault) => {
		const record = structuredClone(original); record.id = 'card:2026-07-01';
		await db.tableFor<ActionRecord>('actionRecords').put(record);
		const bill = await saveMoneyBill(db, billInput);
		const sourceId = (await loadMoney(db, '2026-07')).entries[0].sourceId;
		expect(sourceId).toContain('card%3A2026-07-01');
		await linkMoneyPayment(db, { submissionId: 'linked', billId: bill.id, sourceId });
		if (fault === 'record-deleted') record.deletedAt = '2026-07-02T00:00:00Z';
		if (record.details?.kind === 'bookkeeping') {
			if (fault === 'entry-deleted') record.details.entries = [];
			if (fault === 'income') record.details.entries[0].type = 'income';
		}
		await db.tableFor<ActionRecord>('actionRecords').put(record);
		const view = await loadMoney(db, '2026-06');
		expect(view.payments[0]).toMatchObject({ effective: false, sourceUnavailable: true });
		expect(view.completedMonths).toEqual(['2026-06']);
		expect(summarizeMoneyMonth(view, '2026-06')).toMatchObject({ remainingCents: 10000, completed: false });
	});
	it('moves a lone completed bill across months only after confirmation and preserves the empty old month marker', async () => {
		const bill = await saveMoneyBill(db, billInput);
		await saveMoneyPayment(db, { ...paymentInput, billId: bill.id });
		await saveMoneyBill(db, { ...billInput, id: bill.id, dueDate: '2026-07-30', confirmMonthChange: true });
		const view = await loadMoney(db, '2026-07');
		expect(summarizeMoneyMonth(view, '2026-06')).toMatchObject({ billCount: 0, completed: false });
		expect(summarizeMoneyMonth(view, '2026-07')).toMatchObject({ paidCents: 10000, completed: true });
		expect(view.completedMonths).toEqual(['2026-07', '2026-06']);
		expect(view.payments[0].localDate).toBe('2026-07-01');
	});
	it('accepts explicitly confirmed same-minute balance but never overwrites a newer balance with backfill', async () => {
		vi.spyOn(Date, 'now').mockReturnValue(new Date('2026-10-10T08:30:45Z').getTime());
		// Mock the constructor too: business dates are local, not UTC slicing.
		const now = new Date('2026-10-10T08:30:45Z');
		vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(now);
		const localDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
		const occurredTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
		const account = await saveDebtAccount(db, { category: 'loan', title: 'loan', balanceCents: 100000 });
		const bill = await saveMoneyBill(db, { ...billInput, category: 'loan', accountId: account.id });
		await saveMoneyPayment(db, { ...paymentInput, submissionId: 'current', billId: bill.id, localDate, occurredTime, remainingDebtCents: 90000 });
		let view = await loadMoney(db, '2026-06'); expect(view.accounts[0].balanceCents).toBe(90000);
		await saveMoneyPayment(db, { ...paymentInput, submissionId: 'history', billId: bill.id, remainingDebtCents: 200000 });
		view = await loadMoney(db, '2026-06');
		expect(view.accounts[0]).toMatchObject({ balanceCents: 90000, confirmedAt: now.toISOString() });
	});
	it('stops only future ungenerated repeats and edits future defaults without rewriting existing bills', async () => {
		const bill = await saveMoneyBill(db, { ...billInput, repeatMonthly: true });
		await loadMoney(db, '2026-07');
		await saveMoneyTemplate(db, { id: bill.templateId!, amountCents: 20000, dayOfMonth: 31 });
		let view = await loadMoney(db, '2026-08');
		expect(view.bills.find(({ month }) => month === '2026-07')!.amountCents).toBe(10000);
		expect(view.bills.find(({ month }) => month === '2026-08')).toMatchObject({ amountCents: 20000, dueDate: '2026-08-31' });
		await saveMoneyTemplate(db, { id: bill.templateId!, active: false });
		view = await loadMoney(db, '2026-09'); expect(view.bills).toHaveLength(3);
	});
	it('keeps the original 31st when only changing a short-month amount for future defaults', async () => {
		await saveMoneyBill(db, { ...billInput, dueDate: '2026-01-31', repeatMonthly: true });
		const february = (await loadMoney(db, '2026-02')).bills.find(({ month }) => month === '2026-02')!;
		await saveMoneyBill(db, { ...billInput, id: february.id, dueDate: february.dueDate, amountCents: 20000, updateFutureTemplate: true });
		expect((await loadMoney(db, '2026-03')).bills.find(({ month }) => month === '2026-03')).toMatchObject({ dueDate: '2026-03-31', amountCents: 20000 });
	});
});
