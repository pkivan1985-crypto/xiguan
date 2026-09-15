/* eslint-disable i18next/no-literal-string -- Bookkeeping values and error codes are stable domain identifiers. */
import type { ActionRecord, BookkeepingEntry, BookkeepingRecordDetails, HabitRecordDetails } from '@entities/action-record';
import type { UserCard } from '@entities/user-card';
import { appLifecycleCoordinator } from '@shared/lib/app-lifecycle';
import { parseLocalDate } from '@shared/lib/date';
import { appDatabase, type RepeatOutcomeDatabase } from '@shared/lib/db';
import { parseMoneyInputToCents } from '@shared/lib/money-input';

export interface BookkeepingFormValues {
	type: BookkeepingEntry['type'];
	amount: string;
	categoryId: string;
	categoryLabel: string;
	accountId: string;
	accountLabel: string;
	item: string;
	note: string;
	localDate: string;
	occurredTime: string;
}

export function normalizeBookkeepingEntries(details: HabitRecordDetails | undefined): BookkeepingEntry[] {
	return details?.kind === 'bookkeeping' ? details.entries : [];
}

export function buildBookkeepingEntry(
	values: BookkeepingFormValues,
	options: { id: string; nowIso: string; createdAt?: string },
): BookkeepingEntry | null {
	const amountCents = parseMoneyInputToCents(values.amount);
	let localDate: string;
	try { localDate = parseLocalDate(values.localDate); } catch { return null; }
	if (amountCents === undefined || amountCents <= 0
		|| !values.categoryId || !values.categoryLabel.trim()
		|| !values.accountId || !values.accountLabel.trim()
		|| !/^([01]\d|2[0-3]):[0-5]\d$/.test(values.occurredTime)) return null;
	return {
		id: options.id,
		type: values.type,
		amountCents,
		categoryId: values.categoryId,
		categoryLabel: values.categoryLabel.trim(),
		accountId: values.accountId,
		accountLabel: values.accountLabel.trim(),
		item: values.item.trim() || undefined,
		note: values.note.trim() || undefined,
		localDate,
		occurredTime: values.occurredTime,
		createdAt: options.createdAt ?? options.nowIso,
		updatedAt: options.nowIso,
	};
}

export function bookkeepingTotals(entries: readonly BookkeepingEntry[]) {
	const incomeCents = entries.filter(({ type }) => type === 'income').reduce((sum, entry) => sum + entry.amountCents, 0);
	const expenseCents = entries.filter(({ type }) => type === 'expense').reduce((sum, entry) => sum + entry.amountCents, 0);
	return { incomeCents, expenseCents, balanceCents: incomeCents - expenseCents };
}

function nextDetails(entries: BookkeepingEntry[]): BookkeepingRecordDetails | undefined {
	return entries.length ? { kind: 'bookkeeping', entries: entries.sort((a, b) => a.occurredTime.localeCompare(b.occurredTime)) } : undefined;
}

async function putDayRecord(
	database: RepeatOutcomeDatabase,
	cardId: string,
	localDate: string,
	entries: BookkeepingEntry[],
	nowIso: string,
	submissionId: string,
): Promise<void> {
	const table = database.tableFor<ActionRecord>('actionRecords');
	const id = `${cardId}:${localDate}`;
	const existing = await table.get(id);
	const details = nextDetails(entries);
	if (!details) {
		if (existing) await table.delete(id);
		return;
	}
	await table.put({
		id,
		userCardId: cardId,
		localDate,
		quantityBaseValue: entries.length,
		entryMethod: 'actual',
		details,
		firstSavedAt: existing?.firstSavedAt ?? nowIso,
		lastSavedAt: nowIso,
		lastSubmissionId: submissionId,
	});
}

export async function saveBookkeepingEntry(
	database: RepeatOutcomeDatabase,
	input: { userCardId: string; sourceLocalDate?: string; entry: BookkeepingEntry; nowIso: string; submissionId: string },
): Promise<void> {
	const cards = database.tableFor<UserCard>('userCards');
	const records = database.tableFor<ActionRecord>('actionRecords');
	const card = await cards.get(input.userCardId);
	if (!card || card.status !== 'active' || card.officialCardId !== 'bookkeeping') throw new Error('BOOKKEEPING_CARD_NOT_AVAILABLE');
	const targetDate = input.entry.localDate;
	const sourceDate = input.sourceLocalDate ?? targetDate;
	await database.transaction('rw', records, async () => {
		const source = await records.get(`${card.id}:${sourceDate}`);
		const target = sourceDate === targetDate ? source : await records.get(`${card.id}:${targetDate}`);
		const sourceEntries = normalizeBookkeepingEntries(source?.details).filter(({ id }) => id !== input.entry.id);
		const targetEntries = sourceDate === targetDate
			? [...sourceEntries, input.entry]
			: [...normalizeBookkeepingEntries(target?.details).filter(({ id }) => id !== input.entry.id), input.entry];
		if (sourceDate !== targetDate) await putDayRecord(database, card.id, sourceDate, sourceEntries, input.nowIso, input.submissionId);
		await putDayRecord(database, card.id, targetDate, targetEntries, input.nowIso, input.submissionId);
	});
}

export async function removeBookkeepingEntry(
	database: RepeatOutcomeDatabase,
	input: { userCardId: string; localDate: string; entryId: string; nowIso: string; submissionId: string },
): Promise<void> {
	const records = database.tableFor<ActionRecord>('actionRecords');
	await database.transaction('rw', records, async () => {
		const record = await records.get(`${input.userCardId}:${input.localDate}`);
		if (!record) return;
		await putDayRecord(database, input.userCardId, input.localDate,
			normalizeBookkeepingEntries(record.details).filter(({ id }) => id !== input.entryId),
			input.nowIso, input.submissionId);
	});
}

export function saveBookkeepingEntryInApp(input: Parameters<typeof saveBookkeepingEntry>[1]): Promise<void> {
	return appLifecycleCoordinator.runCriticalOperation('save-outcome', () => saveBookkeepingEntry(appDatabase, input));
}

export function removeBookkeepingEntryInApp(input: Parameters<typeof removeBookkeepingEntry>[1]): Promise<void> {
	return appLifecycleCoordinator.runCriticalOperation('save-outcome', () => removeBookkeepingEntry(appDatabase, input));
}
