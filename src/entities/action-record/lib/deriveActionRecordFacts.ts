import type { LocalDate } from '@shared/lib/date';

import type { ActionRecord } from '../model/types';

export interface ActionRecordDateGroup {
	localDate: LocalDate;
	records: ActionRecord[];
}

export function effectiveActionRecords(records: readonly ActionRecord[]): ActionRecord[] {
	return records.filter(({ deletedAt }) => !deletedAt);
}

export function groupActionRecordsByLocalDate(records: readonly ActionRecord[]): ActionRecordDateGroup[] {
	const groups = new Map<LocalDate, ActionRecord[]>();

	for (const record of effectiveActionRecords(records)) {
		groups.set(record.localDate, [...(groups.get(record.localDate) ?? []), record]);
	}

	return [...groups.entries()]
		.sort(([left], [right]) => right.localeCompare(left))
		.map(([localDate, group]) => ({
			localDate,
			records: [...group].sort((left, right) => right.lastSavedAt.localeCompare(left.lastSavedAt)),
		}));
}

export function outcomeDatesForMonth(
	records: readonly ActionRecord[],
	year: number,
	monthIndex: number,
): Set<LocalDate> {
	if (!Number.isSafeInteger(year)) throw new Error('INVALID_CALENDAR_YEAR');
	if (!Number.isSafeInteger(monthIndex) || monthIndex < 0 || monthIndex > 11) {
		throw new Error('INVALID_CALENDAR_MONTH');
	}

	const prefix = `${year}-${String(monthIndex + 1).padStart(2, '0')}-`;
	return new Set(
		effectiveActionRecords(records)
			.filter(({ localDate }) => localDate.startsWith(prefix))
			.map(({ localDate }) => localDate),
	);
}
