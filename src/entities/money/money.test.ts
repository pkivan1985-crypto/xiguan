import { describe, expect, it } from 'vitest';
import { monthlyDueDate, parseMoneyCents, summarizeDebt, summarizeMoneyEntries, summarizeMoneyMonth } from './index';
describe('pure money rules', () => {
	it('converts decimal text with integer cents and rejects incomplete/excess/unsafe values', () => {
		for (const [text, cents] of [['8.05', 805], ['0.50', 50], ['12.30', 1230], ['8', 800]] as const) expect(parseMoneyCents(text)).toBe(cents);
		for (const text of ['', '8.', '-1', '1.001', 'Infinity', '9007199254740992']) expect(() => parseMoneyCents(text)).toThrow();
	});
	it('handles leap years and local short months without UTC conversion', () => {
		expect(monthlyDueDate('2024-02', 31)).toBe('2024-02-29');
		expect(monthlyDueDate('2026-04', 31)).toBe('2026-04-30');
		expect(() => monthlyDueDate('2026-13', 1)).toThrow();
	});
	it('does not complete empty months and distinguishes no accounts from explicitly zero balance', () => {
		expect(summarizeMoneyMonth({ bills: [], payments: [] }, '2026-06').completed).toBe(false);
		expect(summarizeDebt([])).toMatchObject({ accountCount: 0, knownDebtCents: 0, unknownCount: 0 });
		expect(summarizeDebt([{ id: 'one', category: 'loan', title: 'zero', stopped: false, balanceCents: 0 }])).toMatchObject({ accountCount: 1, unknownCount: 0 });
	});
	it('separates actual-month income, consumption and repayment and rejects overflow', () => {
		const base = { id: 'one', sourceId: 'one', time: '10:00', date: '2026-07-01', item: 'item', categoryLabel: '', accountLabel: '', note: '', amountCents: 100 };
		expect(summarizeMoneyEntries([{ ...base, type: 'income' }, { ...base, type: 'expense' }, { ...base, type: 'repayment' }], '2026-07'))
			.toEqual({ incomeCents: 100, expenseCents: 100, repaymentCents: 100 });
		expect(summarizeMoneyEntries([{ ...base, type: 'repayment' }], '2026-06').repaymentCents).toBe(0);
		expect(() => summarizeMoneyEntries([{ ...base, type: 'expense', amountCents: Number.MAX_SAFE_INTEGER }, { ...base, type: 'expense' }], '2026-07')).toThrow('MONEY_TOTAL_OVERFLOW');
	});
});
