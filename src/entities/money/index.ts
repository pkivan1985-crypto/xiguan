/* eslint-disable i18next/no-literal-string -- Money types and state identifiers are domain values. */
import type { MoneyBill, MoneyPayment, MoneyView, DebtAccount } from '@shared/lib/money-schema';
import { assertMoneyMonth } from '@shared/lib/money-schema';
export type * from '@shared/lib/money-schema';
export function parseMoneyCents(input: string): number {
	const text = input.trim();
	if (!/^\d+(\.\d{1,2})?$/.test(text)) throw new Error('INVALID_MONEY_CENTS');
	const [whole, fraction = ''] = text.split('.');
	const result = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
	if (!Number.isSafeInteger(result)) throw new Error('INVALID_MONEY_CENTS');
	return result;
}
export function monthlyDueDate(month: string, day: number): string {
	assertMoneyMonth(month);
	if (!Number.isInteger(day) || day < 1 || day > 31) throw new Error('INVALID_MONEY_DAY');
	const [year, monthNumber] = month.split('-').map(Number);
	const last = new Date(year, monthNumber, 0).getDate();
	return `${month}-${String(Math.min(day, last)).padStart(2, '0')}`;
}
function safeSum(values: number[]): number {
	const sum = values.reduce((total, value) => total + value, 0);
	if (!Number.isSafeInteger(sum)) throw new Error('MONEY_TOTAL_OVERFLOW');
	return sum;
}
export function summarizeMoneyBill(bill: MoneyBill, payments: MoneyPayment[]) {
	const paidCents = safeSum(payments.filter((payment) => payment.billId === bill.id && payment.effective && !payment.revokedAt).map(({ amountCents }) => amountCents));
	const remainingCents = Math.max(bill.amountCents - paidCents, 0);
	return { paidCents, remainingCents, status: remainingCents === 0 ? 'paid' as const : paidCents > 0 ? 'partial' as const : 'pending' as const };
}
export function summarizeMoneyMonth(view: Pick<MoneyView, 'bills' | 'payments'>, month: string) {
	assertMoneyMonth(month);
	const bills = view.bills.filter((bill) => bill.month === month);
	const summaries = bills.map((bill) => summarizeMoneyBill(bill, view.payments));
	const paidCount = summaries.filter(({ remainingCents }) => remainingCents === 0).length;
	return { plannedCents: safeSum(bills.map(({ amountCents }) => amountCents)), paidCents: safeSum(summaries.map(({ paidCents }) => paidCents)),
		remainingCents: safeSum(summaries.map(({ remainingCents }) => remainingCents)), paidCount, billCount: bills.length,
		completed: bills.length > 0 && paidCount === bills.length };
}
export function summarizeDebt(accounts: DebtAccount[]) {
	const distinct = [...new Map(accounts.map((account) => [account.id, account])).values()];
	return { knownDebtCents: safeSum(distinct.map(({ balanceCents }) => balanceCents ?? 0)),
		unknownCount: distinct.filter(({ balanceCents }) => balanceCents === undefined).length,
		accountCount: distinct.length, latestConfirmedAt: distinct.map(({ confirmedAt }) => confirmedAt ?? '').sort().at(-1) || undefined };
}
export function summarizeMoneyEntries(entries: MoneyView['entries'], month: string) {
	assertMoneyMonth(month);
	const matching = entries.filter(({ date }) => date.slice(0, 7) === month);
	return { incomeCents: safeSum(matching.filter(({ type }) => type === 'income').map(({ amountCents }) => amountCents)),
		expenseCents: safeSum(matching.filter(({ type }) => type === 'expense').map(({ amountCents }) => amountCents)),
		repaymentCents: safeSum(matching.filter(({ type }) => type === 'repayment').map(({ amountCents }) => amountCents)) };
}
