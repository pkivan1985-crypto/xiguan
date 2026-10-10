/* eslint-disable i18next/no-literal-string -- Stable money keys, categories and business error identifiers. */
import type { ActionRecord } from '@entities/action-record';
import { monthlyDueDate, summarizeMoneyMonth, type DebtAccount, type MoneyBill, type MoneyEntry, type MoneyPayment, type MoneyTemplate, type MoneyView } from '@entities/money';
import { appDatabase, type RepeatOutcomeDatabase, type SettingRecord } from '@shared/lib/db';
import { appLifecycleCoordinator } from '@shared/lib/app-lifecycle';
import { formatLocalDate, parseLocalDate } from '@shared/lib/date';
import { assertMoneyCents, assertMoneyMonth, assertMoneyState, emptyMoneyState, MONEY_SETTING_KEY, type MoneyState } from '@shared/lib/money-schema';
import { resolveMoneyState } from '@shared/lib/money-schema/sources';

export interface SaveMoneyBillInput {
	id?: string; category: MoneyBill['category']; title: string; dueDate: string; amountCents: number;
	accountId?: string; note?: string; repeatMonthly?: boolean; updateFutureTemplate?: boolean; confirmMonthChange?: boolean;
}
export interface SaveMoneyPaymentInput {
	id?: string; submissionId: string; billId: string; amountCents: number; localDate: string; occurredTime: string;
	accountLabel?: string; note?: string; remainingDebtCents?: number;
}
export interface SaveDebtAccountInput {
	id?: string; category: DebtAccount['category']; title: string; balanceCents?: number; confirmedAt?: string; stopped?: boolean;
}
export interface SaveMoneyEntryInput {
	id?: string; type: 'income' | 'expense'; amountCents: number; localDate: string; occurredTime: string;
	item: string; categoryLabel?: string; accountLabel?: string; note?: string;
}
export interface LinkMoneyPaymentInput { submissionId: string; billId: string; sourceId: string }
export type SaveMoneyTemplateInput = Pick<MoneyTemplate, 'id'> & Partial<Omit<MoneyTemplate, 'id'>>;

function required(value: string): string {
	if (typeof value !== 'string' || !value.trim()) throw new Error('MONEY_REQUIRED_FIELD');
	return value.trim();
}
function assertFact(localDate: string, occurredTime: string): void {
	parseLocalDate(localDate);
	if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(occurredTime)) throw new Error('INVALID_MONEY_TIME');
	const now = new Date();
	const today = formatLocalDate(now);
	const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
	if (`${localDate} ${occurredTime}` > `${today} ${currentTime}`) throw new Error('FUTURE_FACT');
}
function rememberCompletions(state: MoneyState): void {
	for (const month of new Set(state.bills.map((bill) => bill.month))) {
		if (summarizeMoneyMonth(state, month).completed && !state.completedMonths.includes(month)) state.completedMonths.push(month);
	}
	state.completedMonths.sort().reverse();
}
async function change<T>(database: RepeatOutcomeDatabase, action: (state: MoneyState, entries: MoneyEntry[]) => T): Promise<T> {
	const settings = database.tableFor<SettingRecord>('settings');
	const records = database.tableFor<ActionRecord>('actionRecords');
	return database.transaction('rw', [settings, records], async () => {
		const stored = await settings.get(MONEY_SETTING_KEY);
		const state = stored ? stored.value : emptyMoneyState();
		assertMoneyState(state);
		const sourceRecords = await records.toArray();
		const entries = resolveMoneyState(state, sourceRecords);
		// Preserve completion reached before a mutation (including added bills/month moves).
		rememberCompletions(state);
		const result = action(state, entries);
		resolveMoneyState(state, sourceRecords);
		rememberCompletions(state);
		assertMoneyState(state);
		await settings.put({ key: MONEY_SETTING_KEY, value: state, updatedAt: new Date().toISOString() });
		return structuredClone(result);
	});
}
function findBill(state: MoneyState, id: string): MoneyBill {
	const bill = state.bills.find((item) => item.id === id);
	if (!bill) throw new Error('MONEY_BILL_NOT_FOUND');
	return bill;
}
function fingerprint(input: object): string {
	return JSON.stringify(Object.fromEntries(Object.entries(input).sort(([a], [b]) => a.localeCompare(b))));
}
function existingSubmission(state: MoneyState, input: { submissionId: string }, operation: 'save' | 'link'): MoneyPayment | undefined {
	required(input.submissionId);
	const submission = state.submissions.find((item) => item.submissionId === input.submissionId);
	if (!submission) return undefined;
	if (submission.operation !== operation || submission.fingerprint !== fingerprint(input)) throw new Error('MONEY_SUBMISSION_CONFLICT');
	return state.payments.find(({ id }) => id === submission.paymentId)!;
}
function recordSubmission(state: MoneyState, input: { submissionId: string }, payment: MoneyPayment, operation: 'save' | 'link') {
	state.submissions.push({ submissionId: input.submissionId, paymentId: payment.id, operation, fingerprint: fingerprint(input) });
}
export function loadMoney(database: RepeatOutcomeDatabase, month: string): Promise<MoneyView> {
	assertMoneyMonth(month);
	return change(database, (state, entries) => {
		for (const template of state.templates) {
			if (!template.active || template.startMonth > month || state.accounts.some((account) => account.id === template.accountId && account.stopped)) continue;
			if (state.bills.some((bill) => bill.templateId === template.id && bill.month === month)) continue;
			state.bills.push({ id: `bill:${template.id}:${month}`, templateId: template.id, month,
				category: template.category, title: template.title, accountId: template.accountId, amountCents: template.amountCents,
				dueDate: monthlyDueDate(month, template.dayOfMonth), note: template.note });
		}
		state.bills.sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.id.localeCompare(b.id));
		return { accounts: state.accounts, templates: state.templates, bills: state.bills, payments: state.payments,
			entries, completedMonths: state.completedMonths };
	});
}
export function saveMoneyBill(database: RepeatOutcomeDatabase, input: SaveMoneyBillInput): Promise<MoneyBill> {
	return change(database, (state) => {
		parseLocalDate(input.dueDate); assertMoneyCents(input.amountCents);
		const old = input.id ? findBill(state, input.id) : undefined;
		const month = input.dueDate.slice(0, 7);
		if (old && old.month !== month && state.payments.some((payment) => payment.billId === old.id) && !input.confirmMonthChange) throw new Error('CONFIRM_MONTH_CHANGE');
		const bill: MoneyBill = { id: old?.id ?? crypto.randomUUID(), category: input.category, title: required(input.title),
			month, dueDate: input.dueDate, amountCents: input.amountCents, accountId: input.accountId, templateId: old?.templateId, note: input.note?.trim() ?? '' };
		if (input.repeatMonthly === true && !bill.templateId) {
			bill.templateId = crypto.randomUUID();
			state.templates.push({ id: bill.templateId, category: bill.category, title: bill.title, accountId: bill.accountId,
				dayOfMonth: Number(input.dueDate.slice(8)), amountCents: bill.amountCents, startMonth: month, active: true, note: bill.note });
		} else if (bill.templateId) {
			const template = state.templates.find(({ id }) => id === bill.templateId)!;
			if (input.repeatMonthly !== undefined) template.active = input.repeatMonthly;
			if (input.updateFutureTemplate) Object.assign(template, { category: bill.category, title: bill.title, accountId: bill.accountId,
				dayOfMonth: old?.dueDate === bill.dueDate ? template.dayOfMonth : Number(bill.dueDate.slice(8)), amountCents: bill.amountCents, note: bill.note });
		}
		if (old) Object.assign(old, bill); else state.bills.push(bill);
		return old ?? bill;
	});
}
export function saveMoneyTemplate(database: RepeatOutcomeDatabase, input: SaveMoneyTemplateInput): Promise<MoneyTemplate> {
	return change(database, (state) => {
		const template = state.templates.find(({ id }) => id === input.id);
		if (!template) throw new Error('MONEY_TEMPLATE_NOT_FOUND');
		Object.assign(template, input); template.title = required(template.title);
		return template;
	});
}
export function saveDebtAccount(database: RepeatOutcomeDatabase, input: SaveDebtAccountInput): Promise<DebtAccount> {
	return change(database, (state) => {
		const old = input.id ? state.accounts.find(({ id }) => id === input.id) : undefined;
		if (input.id && !old) throw new Error('MONEY_ACCOUNT_NOT_FOUND');
		const account: DebtAccount = { id: old?.id ?? crypto.randomUUID(), category: input.category, title: required(input.title),
			balanceCents: input.balanceCents ?? old?.balanceCents, confirmedAt: input.balanceCents !== undefined ? input.confirmedAt ?? new Date().toISOString() : old?.confirmedAt,
			stopped: input.stopped ?? old?.stopped ?? false };
		if (old?.confirmedAt && account.confirmedAt && Date.parse(account.confirmedAt) < Date.parse(old.confirmedAt)) throw new Error('STALE_DEBT_CONFIRMATION');
		if (old) Object.assign(old, account); else state.accounts.push(account);
		return old ?? account;
	});
}
export function saveMoneyEntry(database: RepeatOutcomeDatabase, input: SaveMoneyEntryInput): Promise<MoneyEntry> {
	return change(database, (state) => {
		assertMoneyCents(input.amountCents); assertFact(input.localDate, input.occurredTime);
		const old = input.id ? state.entries.find(({ id }) => id === input.id) : undefined;
		if (input.id && !old) throw new Error('MONEY_ENTRY_NOT_FOUND');
		if (old?.revokedAt) throw new Error('MONEY_ENTRY_REVOKED');
		if (old && state.payments.some((payment) => payment.ownedEntryId === old.id)) throw new Error('PAYMENT_EDIT_REQUIRED');
		const id = old?.id ?? crypto.randomUUID();
		const entry: MoneyEntry = { id, sourceId: `money:${id}`, type: input.type, amountCents: input.amountCents,
			date: input.localDate, time: input.occurredTime, item: required(input.item), categoryLabel: input.categoryLabel?.trim() ?? '',
			accountLabel: input.accountLabel?.trim() ?? '', note: input.note?.trim() ?? '' };
		if (old) Object.assign(old, entry); else state.entries.push(entry);
		return old ?? entry;
	});
}
export function saveMoneyPayment(database: RepeatOutcomeDatabase, input: SaveMoneyPaymentInput): Promise<MoneyPayment> {
	return change(database, (state) => {
		const duplicate = existingSubmission(state, input, 'save'); if (duplicate) return duplicate;
		assertMoneyCents(input.amountCents); assertFact(input.localDate, input.occurredTime);
		const bill = findBill(state, input.billId);
		const old = input.id ? state.payments.find(({ id }) => id === input.id) : undefined;
		if (input.id && !old) throw new Error('MONEY_PAYMENT_NOT_FOUND');
		if (old?.revokedAt) throw new Error('MONEY_PAYMENT_REVOKED');
		if (old && old.billId !== bill.id) throw new Error('MONEY_PAYMENT_BILL_IMMUTABLE');
		if (old && !old.ownedEntryId) throw new Error('SOURCE_EDIT_REQUIRED');
		const id = old?.id ?? crypto.randomUUID(); const entryId = old?.ownedEntryId ?? crypto.randomUUID();
		const payment: MoneyPayment = { id, billId: bill.id, sourceId: `money:${entryId}`, ownedEntryId: entryId,
			amountCents: input.amountCents, localDate: input.localDate, occurredTime: input.occurredTime,
			accountLabel: input.accountLabel?.trim() ?? '', note: input.note?.trim() ?? '', effective: true };
		const entry: MoneyEntry = { id: entryId, sourceId: payment.sourceId, type: bill.category === 'fixedExpense' ? 'expense' : 'repayment',
			date: payment.localDate, time: payment.occurredTime, item: bill.title,
			categoryLabel: { creditCard: '信用卡', loan: '贷款', fixedExpense: '固定支出' }[bill.category],
			accountLabel: payment.accountLabel, note: payment.note, amountCents: payment.amountCents };
		if (old) { Object.assign(old, payment); Object.assign(state.entries.find((item) => item.id === entryId)!, entry); }
		else { state.payments.push(payment); state.entries.push(entry); }
		if (input.remainingDebtCents !== undefined) {
			assertMoneyCents(input.remainingDebtCents, true);
			const account = state.accounts.find(({ id: accountId }) => accountId === bill.accountId);
			if (!account) throw new Error('MONEY_ACCOUNT_NOT_FOUND');
			const factAt = new Date(`${input.localDate}T${input.occurredTime}:00`).toISOString();
			// Forms record minute precision. A new confirmation in that same minute is not stale.
			if (!account.confirmedAt || Math.floor(Date.parse(factAt) / 60000) >= Math.floor(Date.parse(account.confirmedAt) / 60000)) {
				const now = new Date().toISOString();
				account.balanceCents = input.remainingDebtCents;
				account.confirmedAt = Math.floor(Date.parse(factAt) / 60000) === Math.floor(Date.parse(now) / 60000) ? now : factAt;
			}
		}
		recordSubmission(state, input, old ?? payment, 'save'); return old ?? payment;
	});
}
export function linkMoneyPayment(database: RepeatOutcomeDatabase, input: LinkMoneyPaymentInput): Promise<MoneyPayment> {
	return change(database, (state, entries) => {
		const duplicate = existingSubmission(state, input, 'link'); if (duplicate) return duplicate;
		const bill = findBill(state, input.billId);
		if (state.payments.some((payment) => payment.sourceId === input.sourceId && !payment.revokedAt)) throw new Error('SOURCE_ALREADY_LINKED');
		const source = entries.find(({ sourceId }) => sourceId === input.sourceId);
		if (!source || source.type !== 'expense') throw new Error('MONEY_SOURCE_UNAVAILABLE');
		assertFact(source.date, source.time);
		const payment: MoneyPayment = { id: crypto.randomUUID(), billId: bill.id, sourceId: source.sourceId,
			amountCents: source.amountCents, localDate: source.date, occurredTime: source.time, accountLabel: source.accountLabel, note: source.note, effective: true };
		state.payments.push(payment); recordSubmission(state, input, payment, 'link'); return payment;
	});
}
export function revokeMoneyPayment(database: RepeatOutcomeDatabase, id: string): Promise<void> {
	return change(database, (state) => {
		const payment = state.payments.find((item) => item.id === id);
		if (!payment) throw new Error('MONEY_PAYMENT_NOT_FOUND');
		if (payment.revokedAt) return;
		payment.revokedAt = new Date().toISOString(); payment.effective = false;
		if (payment.ownedEntryId) state.entries.find((entry) => entry.id === payment.ownedEntryId)!.revokedAt = payment.revokedAt;
	});
}
function inApp<T>(action: () => Promise<T>): Promise<T> {
	return appLifecycleCoordinator.runCriticalOperation('money-write', action);
}
export const loadMoneyInApp = (month: string): Promise<MoneyView> => inApp(() => loadMoney(appDatabase, month));
export const saveMoneyBillInApp = (input: SaveMoneyBillInput) => inApp(() => saveMoneyBill(appDatabase, input));
export const saveMoneyPaymentInApp = (input: SaveMoneyPaymentInput) => inApp(() => saveMoneyPayment(appDatabase, input));
export const revokeMoneyPaymentInApp = (id: string) => inApp(() => revokeMoneyPayment(appDatabase, id));
export const saveDebtAccountInApp = (input: SaveDebtAccountInput) => inApp(() => saveDebtAccount(appDatabase, input));
export const saveMoneyEntryInApp = (input: SaveMoneyEntryInput) => inApp(() => saveMoneyEntry(appDatabase, input));
export const linkMoneyPaymentInApp = (input: LinkMoneyPaymentInput) => inApp(() => linkMoneyPayment(appDatabase, input));
export const saveMoneyTemplateInApp = (input: SaveMoneyTemplateInput) => inApp(() => saveMoneyTemplate(appDatabase, input));
