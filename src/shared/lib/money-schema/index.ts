/* eslint-disable i18next/no-literal-string -- Money schema identifiers and validation errors are protocol values. */
import { parseLocalDate } from '@shared/lib/date';
import type { MoneyState } from './types';
export type * from './types';
export const MONEY_SETTING_KEY = 'money-v1';
export function emptyMoneyState(): MoneyState {
	return { version: 1, accounts: [], templates: [], bills: [], payments: [], entries: [], completedMonths: [], submissions: [] };
}
export function assertMoneyMonth(value: string): void {
	if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) throw new Error('INVALID_MONEY_MONTH');
	parseLocalDate(`${value}-01`);
}
export function assertMoneyCents(value: number, allowZero = false): void {
	if (!Number.isSafeInteger(value) || value < (allowZero ? 0 : 1)) throw new Error('INVALID_MONEY_CENTS');
}
function object(value: unknown): asserts value is Record<string, unknown> {
	if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('INVALID_MONEY_STATE');
}
function text(value: unknown, nonempty = false): asserts value is string {
	if (typeof value !== 'string' || value.length > 1000 || (nonempty && !value.trim())) throw new Error('INVALID_MONEY_TEXT');
}
function optionalText(value: unknown): void { if (value !== undefined) text(value, true); }
function bool(value: unknown): void { if (typeof value !== 'boolean') throw new Error('INVALID_MONEY_STATE'); }
function iso(value: unknown): void {
	text(value, true); if (!Number.isFinite(Date.parse(value))) throw new Error('INVALID_MONEY_TIME');
}
function date(value: unknown): void { text(value, true); parseLocalDate(value); }
function time(value: unknown): void {
	text(value, true); if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) throw new Error('INVALID_MONEY_TIME');
}
function unique(values: string[]): void {
	if (new Set(values).size !== values.length) throw new Error('DUPLICATE_MONEY_ID');
}
function category(value: unknown): void {
	if (!['creditCard', 'loan', 'fixedExpense'].includes(String(value))) throw new Error('INVALID_MONEY_CATEGORY');
}
export function assertMoneyState(value: unknown): asserts value is MoneyState {
	object(value);
	if (value.version !== 1) throw new Error('INVALID_MONEY_VERSION');
	for (const key of ['accounts', 'templates', 'bills', 'payments', 'entries', 'submissions', 'completedMonths']) {
		if (!Array.isArray(value[key])) throw new Error('INVALID_MONEY_STATE');
	}
	const state = value as unknown as MoneyState;
	for (const collection of [state.accounts, state.templates, state.bills, state.payments, state.entries]) {
		for (const item of collection) { object(item); text(item.id, true); }
		unique(collection.map(({ id }) => id));
	}
	for (const account of state.accounts) {
		category(account.category); if (account.category === ('fixedExpense' as string)) throw new Error('INVALID_MONEY_CATEGORY');
		text(account.title, true); bool(account.stopped);
		if (account.balanceCents !== undefined) { assertMoneyCents(account.balanceCents, true); iso(account.confirmedAt); }
		else if (account.confirmedAt !== undefined) throw new Error('INVALID_MONEY_BALANCE');
	}
	const accounts = new Map(state.accounts.map((account) => [account.id, account]));
	for (const item of [...state.templates, ...state.bills]) {
		category(item.category); text(item.title, true); text(item.note); assertMoneyCents(item.amountCents);
		optionalText(item.accountId);
		if (item.accountId !== undefined && (String(accounts.get(item.accountId)?.category) !== item.category || item.category === 'fixedExpense')) throw new Error('MONEY_ACCOUNT_RELATIONSHIP');
	}
	for (const template of state.templates) {
		assertMoneyMonth(template.startMonth); bool(template.active);
		if (!Number.isInteger(template.dayOfMonth) || template.dayOfMonth < 1 || template.dayOfMonth > 31) throw new Error('INVALID_MONEY_DAY');
	}
	const templates = new Set(state.templates.map(({ id }) => id));
	for (const bill of state.bills) {
		assertMoneyMonth(bill.month); date(bill.dueDate); optionalText(bill.templateId);
		if (bill.dueDate.slice(0, 7) !== bill.month || (bill.templateId !== undefined && !templates.has(bill.templateId))) throw new Error('MONEY_BILL_RELATIONSHIP');
	}
	unique(state.bills.filter((bill) => bill.templateId).map((bill) => `${bill.templateId}\u0000${bill.month}`));
	const bills = new Map(state.bills.map((bill) => [bill.id, bill]));
	for (const entry of state.entries) {
		text(entry.sourceId, true); if (entry.sourceId !== `money:${entry.id}`) throw new Error('MONEY_SOURCE_RELATIONSHIP');
		if (!['income', 'expense', 'repayment'].includes(entry.type)) throw new Error('INVALID_MONEY_ENTRY_TYPE');
		date(entry.date); time(entry.time); assertMoneyCents(entry.amountCents);
		for (const field of [entry.item, entry.categoryLabel, entry.accountLabel, entry.note]) text(field);
		text(entry.item, true);
		if ('editUrl' in entry) throw new Error('UNSAFE_MONEY_EDIT_URL');
		if (entry.revokedAt !== undefined) iso(entry.revokedAt);
	}
	const entries = new Map(state.entries.map((entry) => [entry.id, entry]));
	for (const payment of state.payments) {
		if (!bills.has(payment.billId)) throw new Error('MONEY_PAYMENT_RELATIONSHIP');
		assertMoneyCents(payment.amountCents); date(payment.localDate); time(payment.occurredTime);
		text(payment.accountLabel); text(payment.note); text(payment.sourceId, true); bool(payment.effective);
		if (payment.sourceUnavailable !== undefined) bool(payment.sourceUnavailable);
		if (payment.revokedAt !== undefined) iso(payment.revokedAt);
		optionalText(payment.ownedEntryId);
		if (payment.ownedEntryId !== undefined) {
			const entry = entries.get(payment.ownedEntryId);
			if (!entry || entry.sourceId !== payment.sourceId || entry.type === 'income'
				|| Boolean(entry.revokedAt) !== Boolean(payment.revokedAt)) throw new Error('MONEY_SOURCE_RELATIONSHIP');
			if (entry.amountCents !== payment.amountCents || entry.date !== payment.localDate || entry.time !== payment.occurredTime
				|| entry.accountLabel !== payment.accountLabel || entry.note !== payment.note) throw new Error('MONEY_SOURCE_RELATIONSHIP');
		} else if (!/^(bookkeeping|extra-expense):[^:]+:[^:]+$/.test(payment.sourceId) && !/^money:.+$/.test(payment.sourceId)) throw new Error('MONEY_SOURCE_RELATIONSHIP');
		if ((payment.revokedAt || payment.sourceUnavailable) && payment.effective) throw new Error('MONEY_PAYMENT_STATUS');
	}
	unique(state.payments.filter((payment) => !payment.revokedAt).map(({ sourceId }) => sourceId));
	for (const submission of state.submissions) {
		object(submission); text(submission.submissionId, true); text(submission.paymentId, true);
		// Fingerprints include full form fields and are not user-facing text.
		if (typeof submission.fingerprint !== 'string' || !submission.fingerprint) throw new Error('INVALID_MONEY_SUBMISSION');
		if (!['save', 'link'].includes(submission.operation) || !state.payments.some(({ id }) => id === submission.paymentId)) throw new Error('MONEY_SUBMISSION_RELATIONSHIP');
	}
	unique(state.submissions.map(({ submissionId }) => submissionId));
	for (const month of state.completedMonths) { text(month, true); assertMoneyMonth(month); }
	unique(state.completedMonths);
}
