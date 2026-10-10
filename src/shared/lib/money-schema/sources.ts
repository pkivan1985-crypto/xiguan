/* eslint-disable i18next/no-literal-string -- Stable source identifiers and derived ledger labels. */
import type { MoneyEntry, MoneyState } from './types';

export interface MoneySourceRecord {
	id: string; userCardId: string; localDate: string; quantityBaseValue: number;
	firstSavedAt?: string; lastSavedAt?: string;
	deletedAt?: string; note?: string; details?: unknown;
}
export function externalMoneyEntries(records: MoneySourceRecord[]): MoneyEntry[] {
	return records.filter((record) => !record.deletedAt).flatMap((record): MoneyEntry[] => {
		const details = record.details as { kind?: string; entries?: Array<Record<string, unknown>>; item?: string; reason?: string } | undefined;
		if (!details || !['bookkeeping', 'extra-expense'].includes(details.kind ?? '')) return [];
		const kind = details.kind!;
		const savedAt = new Date(record.lastSavedAt ?? record.firstSavedAt ?? '');
		const legacyTime = Number.isFinite(savedAt.getTime()) ? `${String(savedAt.getHours()).padStart(2, '0')}:${String(savedAt.getMinutes()).padStart(2, '0')}` : '00:00';
		const entries = Array.isArray(details.entries) ? details.entries : kind === 'extra-expense'
			? [{ id: `legacy-${record.localDate}`, occurredTime: legacyTime, amountCents: record.quantityBaseValue, item: details.item, reason: details.reason }] : [];
		return entries.map((entry): MoneyEntry => {
			const sourceId = `${kind}:${encodeURIComponent(record.id)}:${encodeURIComponent(String(entry.id))}`;
			return { id: sourceId, sourceId, type: kind === 'bookkeeping' && entry.type === 'income' ? 'income' : 'expense',
				date: kind === 'bookkeeping' ? String(entry.localDate) : record.localDate,
				time: typeof entry.occurredTime === 'string' ? entry.occurredTime : '00:00',
				item: String(entry.item ?? ''), categoryLabel: kind === 'extra-expense' ? '额外开支' : String(entry.categoryLabel ?? ''),
				accountLabel: String(entry.accountLabel ?? ''), note: String(entry.note ?? entry.reason ?? record.note ?? ''),
				amountCents: Number(entry.amountCents),
				editUrl: `/record/${encodeURIComponent(record.userCardId)}?date=${record.localDate}&entry=${encodeURIComponent(String(entry.id))}` };
		});
	});
}

/** Refresh only derived payment fields. Never writes action records or ledger facts. */
export function resolveMoneyState(state: MoneyState, records: MoneySourceRecord[]): MoneyEntry[] {
	// Only external sources need an original-route link. Independent money facts
	// are edited directly by the records page; giving them a link back to that
	// same page would create an endless details/edit redirect.
	const sources = [...externalMoneyEntries(records), ...state.entries.filter((entry) => !entry.revokedAt)];
	const byId = new Map(sources.map((entry) => [entry.sourceId, entry]));
	const bills = new Map(state.bills.map((bill) => [bill.id, bill]));
	for (const payment of state.payments) {
		const source = byId.get(payment.sourceId);
		payment.sourceUnavailable = !source || source.type === 'income';
		payment.effective = !payment.revokedAt && !payment.sourceUnavailable;
		if (source && source.type !== 'income' && !payment.revokedAt) {
			payment.amountCents = source.amountCents; payment.localDate = source.date; payment.occurredTime = source.time;
			payment.accountLabel = source.accountLabel; payment.note = source.note;
		}
	}
	const linked = new Map(state.payments.filter((payment) => payment.effective).map((payment) => [payment.sourceId, payment]));
	return sources.map((source) => {
		const payment = linked.get(source.sourceId);
		return payment ? { ...source, type: bills.get(payment.billId)?.category === 'fixedExpense' ? 'expense' as const : 'repayment' as const } : source;
	}).sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time) || a.sourceId.localeCompare(b.sourceId));
}

/** Backups may retain explicitly unavailable links, but never accept a cached effective dangling fact. */
export function assertMoneySourceRelationships(state: MoneyState, records: MoneySourceRecord[]): void {
	const copy = structuredClone(state);
	resolveMoneyState(copy, records);
	for (let index = 0; index < state.payments.length; index++) {
		const payment = state.payments[index]; const resolved = copy.payments[index];
		if (!payment.revokedAt && (payment.effective !== resolved.effective || Boolean(payment.sourceUnavailable) !== Boolean(resolved.sourceUnavailable))) throw new Error('MONEY_SOURCE_RELATIONSHIP');
		if (payment.effective && (payment.amountCents !== resolved.amountCents || payment.localDate !== resolved.localDate
			|| payment.occurredTime !== resolved.occurredTime || payment.accountLabel !== resolved.accountLabel || payment.note !== resolved.note)) throw new Error('MONEY_SOURCE_RELATIONSHIP');
	}
}
