/* eslint-disable i18next/no-literal-string -- Stable record kinds and fallback identifiers are not user-facing. */
import type { ExtraExpenseLineItem, ExtraExpenseRecordDetails, HabitRecordDetails } from '@entities/action-record';

export interface ExpenseRecordFormValues {
	amount: string;
	item: string;
	reason: string;
	bankBalance: string;
	earnBackDays: string;
	compensation: string;
	necessity: ExtraExpenseLineItem['necessity'];
	occurredTime: string;
}

export interface ExpenseRecordEntry {
	quantityBaseValue: number;
	details: ExtraExpenseRecordDetails;
}

interface ExpenseLineOptions { id: string; nowIso: string; createdAt?: string }
interface LegacyFallback {
	id?: string;
	quantityBaseValue?: number;
	timestamp?: string;
	fallbackId?: string;
	fallbackAmountCents?: number;
	fallbackTimestamp?: string;
}

function yuanToCents(value: string): number | undefined {
	if (!value.trim()) return undefined;
	const parsed = Number(value);
	if (!Number.isFinite(parsed) || parsed < 0) return undefined;
	const cents = Math.round(parsed * 100);
	return Number.isSafeInteger(cents) ? cents : undefined;
}

function timeFromTimestamp(timestamp: string): string {
	const date = new Date(timestamp);
	if (Number.isNaN(date.getTime())) return '12:00';
	return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export function buildExpenseLineItem(values: ExpenseRecordFormValues, options: ExpenseLineOptions): ExtraExpenseLineItem | null {
	const amountCents = yuanToCents(values.amount);
	const item = values.item.trim();
	const reason = values.reason.trim();
	if (!amountCents || !item || !reason || !/^([01]\d|2[0-3]):[0-5]\d$/.test(values.occurredTime)) return null;
	const bankBalanceCents = yuanToCents(values.bankBalance);
	const earnBackDays = values.earnBackDays.trim() ? Number(values.earnBackDays) : undefined;
	if (earnBackDays !== undefined && (!Number.isSafeInteger(earnBackDays) || earnBackDays < 0)) return null;
	return {
		id: options.id,
		amountCents,
		item,
		reason,
		bankBalanceCents,
		earnBackDays,
		compensation: values.compensation.trim() || undefined,
		necessity: values.necessity,
		occurredTime: values.occurredTime,
		createdAt: options.createdAt ?? options.nowIso,
		updatedAt: options.nowIso,
	};
}

export function normalizeExpenseEntries(details: HabitRecordDetails | undefined, fallback: LegacyFallback = {}): ExtraExpenseLineItem[] {
	if (!details || details.kind !== 'extra-expense') return [];
	if ('entries' in details) {
		return [...details.entries].sort((left, right) => left.occurredTime.localeCompare(right.occurredTime) || left.createdAt.localeCompare(right.createdAt));
	}
	const timestamp = fallback.timestamp ?? fallback.fallbackTimestamp ?? new Date(0).toISOString();
	return [{
		id: fallback.id ?? fallback.fallbackId ?? 'legacy-expense',
		amountCents: fallback.quantityBaseValue ?? fallback.fallbackAmountCents ?? 0,
		item: details.item,
		reason: details.reason,
		bankBalanceCents: details.bankBalanceCents,
		earnBackDays: details.earnBackDays,
		compensation: details.compensation,
		necessity: details.necessity,
		occurredTime: timeFromTimestamp(timestamp),
		createdAt: timestamp,
		updatedAt: timestamp,
	}];
}

function aggregate(entries: ExtraExpenseLineItem[]): ExpenseRecordEntry {
	return { quantityBaseValue: entries.reduce((total, entry) => total + entry.amountCents, 0), details: { kind: 'extra-expense', entries } };
}

export function mergeExpenseLineItem(details: HabitRecordDetails | undefined, entry: ExtraExpenseLineItem, fallback?: LegacyFallback): ExpenseRecordEntry {
	const entries = normalizeExpenseEntries(details, fallback ?? { id: 'legacy-expense', quantityBaseValue: 0, timestamp: entry.createdAt });
	const nextEntries = entries.filter((candidate) => candidate.id !== entry.id);
	nextEntries.push(entry);
	nextEntries.sort((left, right) => left.occurredTime.localeCompare(right.occurredTime));
	return aggregate(nextEntries);
}

export function removeExpenseLineItem(details: HabitRecordDetails | undefined, id: string, fallback: LegacyFallback = {}): ExpenseRecordEntry {
	return aggregate(normalizeExpenseEntries(details, fallback).filter((entry) => entry.id !== id));
}

export function buildExpenseRecordEntry(values: ExpenseRecordFormValues): ExpenseRecordEntry | null {
	const nowIso = new Date().toISOString();
	const entry = buildExpenseLineItem(values, { id: crypto.randomUUID(), nowIso });
	return entry ? aggregate([entry]) : null;
}
