/* eslint-disable i18next/no-literal-string -- Search terms include stable locale and bookkeeping type keywords. */
import type { BookkeepingEntry } from '@entities/action-record';

export function searchBookkeepingEntries(entries: readonly BookkeepingEntry[], query: string): BookkeepingEntry[] {
	const term = query.trim().toLocaleLowerCase('zh-CN');
	if (!term) return [...entries];
	return entries.filter((entry) => [
		entry.item, entry.categoryLabel, entry.accountLabel, entry.note, entry.localDate,
		entry.occurredTime, (entry.amountCents / 100).toFixed(2), entry.type === 'income' ? '收入' : '支出',
	].some((value) => value?.toLocaleLowerCase('zh-CN').includes(term)));
}
