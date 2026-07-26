import type { IsoWeekday } from '@entities/user-card';
import { parseLocalDate, type LocalDate } from '@shared/lib/date';

const DAY_MS = 86_400_000;

export interface EvenStagePlan {
	startDate: LocalDate;
	endDate: LocalDate;
	targetDisplay: string;
	dailyTargetDisplay: string;
	activeDays: number;
}

function utcTimestamp(localDate: string): number {
	const parsed = parseLocalDate(localDate);
	const [year, month, day] = parsed.split('-').map(Number);
	return Date.UTC(year!, month! - 1, day);
}

function localDateFromTimestamp(timestamp: number): LocalDate {
	return parseLocalDate(new Date(timestamp).toISOString().slice(0, 10));
}

export function countCalendarDays(startDate: string, endDate: string): number {
	const start = utcTimestamp(startDate);
	const end = utcTimestamp(endDate);
	if (end < start) throw new Error('END_DATE_BEFORE_START');
	return Math.floor((end - start) / DAY_MS) + 1;
}

export function endDateFromDuration(startDate: string, durationDays: number): LocalDate {
	if (!Number.isSafeInteger(durationDays) || durationDays < 1) throw new Error('INVALID_DURATION');
	return localDateFromTimestamp(utcTimestamp(startDate) + (durationDays - 1) * DAY_MS);
}

export function isoWeekday(localDate: string): IsoWeekday {
	const day = new Date(utcTimestamp(localDate)).getUTCDay();
	return (day === 0 ? 7 : day) as IsoWeekday;
}

export function countScheduledDays(
	startDate: string,
	endDate: string,
	weekdays: readonly IsoWeekday[],
): number {
	const start = utcTimestamp(startDate);
	const end = utcTimestamp(endDate);
	if (end < start) throw new Error('END_DATE_BEFORE_START');
	const selected = new Set(weekdays);
	let count = 0;
	for (let cursor = start; cursor <= end; cursor += DAY_MS) {
		if (selected.has(isoWeekday(localDateFromTimestamp(cursor)))) count += 1;
	}
	return count;
}

function formatDisplay(value: number, decimals: number): string {
	return value.toFixed(decimals).replace(/\.?0+$/, '');
}

function ceilToPrecision(value: number, decimals: number): number {
	const factor = 10 ** decimals;
	return Math.ceil((value - Number.EPSILON) * factor) / factor;
}

export function distributeEvenStages(input: {
	totalDisplay: number;
	startDate: string;
	endDate: string;
	stageCount: number;
	weekdays: readonly IsoWeekday[];
	maxDecimalPlaces: number;
}): EvenStagePlan[] {
	const {
		totalDisplay,
		startDate,
		endDate,
		stageCount,
		weekdays,
		maxDecimalPlaces,
	} = input;
	if (!Number.isFinite(totalDisplay) || totalDisplay <= 0) throw new Error('INVALID_TOTAL_TARGET');
	if (!Number.isSafeInteger(stageCount) || stageCount < 1) throw new Error('INVALID_STAGE_COUNT');
	if (weekdays.length === 0) throw new Error('WEEKDAYS_REQUIRED');
	const start = utcTimestamp(startDate);
	const end = utcTimestamp(endDate);
	if (end < start) throw new Error('END_DATE_BEFORE_START');
	const totalCalendarDays = countCalendarDays(startDate, endDate);
	if (stageCount > totalCalendarDays) throw new Error('TOO_MANY_STAGES');

	const precision = 10 ** maxDecimalPlaces;
	const totalUnits = Math.round(totalDisplay * precision);
	const baseUnits = Math.floor(totalUnits / stageCount);
	const remainder = totalUnits % stageCount;

	return Array.from({ length: stageCount }, (_, index) => {
		const stageStartOffset = Math.floor((index * totalCalendarDays) / stageCount);
		const nextStartOffset = Math.floor(((index + 1) * totalCalendarDays) / stageCount);
		const stageStart = localDateFromTimestamp(start + stageStartOffset * DAY_MS);
		const stageEnd = localDateFromTimestamp(start + (nextStartOffset - 1) * DAY_MS);
		const target = (baseUnits + (index < remainder ? 1 : 0)) / precision;
		const activeDays = countScheduledDays(stageStart, stageEnd, weekdays);
		if (activeDays < 1) throw new Error('STAGE_HAS_NO_ACTIVE_DAY');
		const dailyTarget = ceilToPrecision(target / activeDays, maxDecimalPlaces);
		return {
			startDate: stageStart,
			endDate: stageEnd,
			targetDisplay: formatDisplay(target, maxDecimalPlaces),
			dailyTargetDisplay: formatDisplay(dailyTarget, maxDecimalPlaces),
			activeDays,
		};
	});
}

export function projectedCustomTotal(input: {
	startDate: string;
	endDate: string;
	targetsByWeekday: Partial<Record<IsoWeekday, number>>;
}): number {
	const { startDate, endDate, targetsByWeekday } = input;
	const start = utcTimestamp(startDate);
	const end = utcTimestamp(endDate);
	if (end < start) throw new Error('END_DATE_BEFORE_START');
	let total = 0;
	for (let cursor = start; cursor <= end; cursor += DAY_MS) {
		const target = targetsByWeekday[isoWeekday(localDateFromTimestamp(cursor))];
		if (target !== undefined) total += target;
	}
	return total;
}
