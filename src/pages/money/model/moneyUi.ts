/* eslint-disable i18next/no-literal-string -- Stable category identifiers and Chinese labels. */
import { summarizeMoneyBill, type MoneyBill, type MoneyCategory, type MoneyView } from '@entities/money';
import { formatLocalDate } from '@shared/lib/date';
import type { MoneyBillRowView } from '@widgets/money';

export const MONEY_CATEGORIES: { category: MoneyCategory; query: 'credit' | 'loan' | 'fixed'; title: string }[] = [
	{ category: 'creditCard', query: 'credit', title: '信用卡' },
	{ category: 'loan', query: 'loan', title: '贷款' },
	{ category: 'fixedExpense', query: 'fixed', title: '固定支出' },
];

const currency = new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' });
export function moneyLabel(cents: number): string { return currency.format(cents / 100); }

export function categoryFromQuery(value: string | null): MoneyCategory {
	return MONEY_CATEGORIES.find(({ category, query }) => value === category || value === query)?.category ?? 'fixedExpense';
}

export function billRowView(bill: MoneyBill, view: MoneyView): MoneyBillRowView {
	const summary = summarizeMoneyBill(bill, view.payments);
	return {
		id: bill.id, name: bill.title, dueDate: bill.dueDate, plannedCents: bill.amountCents,
		paidCents: summary.paidCents, remainingCents: summary.remainingCents,
		completed: summary.status === 'paid',
		overdue: summary.remainingCents > 0 && bill.dueDate < formatLocalDate(new Date()),
	};
}

export function localMoneyTime(): string {
	const now = new Date();
	return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}
