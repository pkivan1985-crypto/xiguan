/* eslint-disable i18next/no-literal-string -- Tab, query and route identifiers are stable non-UI strings. */
import { APP_ROUTES } from '@shared/config';
import { formatLocalDate, parseLocalDate } from '@shared/lib/date';

type ProgressTab = 'calendar' | 'goals';

interface ProgressMonthState {
	year: number;
	monthIndex: number;
}

interface ProgressMonthTransition extends ProgressMonthState {
	selectedDate: string;
	dateSearch: string;
}

interface ProgressTabModel {
	tab: ProgressTab;
	selected: boolean;
	id: string;
	panelId: string;
}

function validSelectedDate(value: string | null, today: string): string {
	if (!value) return today;
	try {
		return parseLocalDate(value) <= today ? value : today;
	} catch {
		return today;
	}
}

function buildProgressDateSearch(localDate: string): string {
	return new URLSearchParams({ date: parseLocalDate(localDate) }).toString();
}

function canonicalProgressDateSearch(
	requestedDate: string | null,
	selectedDate: string,
): string | null {
	return requestedDate === selectedDate
		? null
		: buildProgressDateSearch(selectedDate);
}

function progressMonthFromDate(localDate: string): ProgressMonthState {
	const [year, monthNumber] = parseLocalDate(localDate).split('-').map(Number);
	return {
		year: year!,
		monthIndex: monthNumber! - 1,
	};
}

function buildHistoryDateHref(localDate: string): string {
	return `${APP_ROUTES.HISTORY}?${buildProgressDateSearch(localDate)}`;
}

function buildProgressTabModel(activeTab: ProgressTab): ProgressTabModel[] {
	return (['calendar', 'goals'] as const).map((tab) => ({
		tab,
		selected: tab === activeTab,
		id: `progress-${tab}-tab`,
		panelId: 'progress-tab-content',
	}));
}

function moveProgressMonth(
	current: ProgressMonthState,
	selectedDate: string,
	offset: number,
	todayLocalDate: string,
): ProgressMonthTransition {
	const selected = parseLocalDate(selectedDate);
	const today = parseLocalDate(todayLocalDate);
	const targetMonth = new Date(current.year, current.monthIndex + offset, 1, 12);
	const todayDate = new Date(`${today}T12:00:00`);
	const isFutureMonth = targetMonth.getFullYear() > todayDate.getFullYear()
		|| (
			targetMonth.getFullYear() === todayDate.getFullYear()
			&& targetMonth.getMonth() > todayDate.getMonth()
		);
	if (isFutureMonth) {
		return {
			...current,
			selectedDate: selected,
			dateSearch: buildProgressDateSearch(selected),
		};
	}

	const selectedDay = Number(selected.slice(-2));
	const targetYear = targetMonth.getFullYear();
	const targetMonthIndex = targetMonth.getMonth();
	const targetMonthLastDay = new Date(targetYear, targetMonthIndex + 1, 0, 12).getDate();
	const candidate = formatLocalDate(
		new Date(targetYear, targetMonthIndex, Math.min(selectedDay, targetMonthLastDay), 12),
	);
	const nextSelectedDate = candidate > today ? today : candidate;
	return {
		year: targetYear,
		monthIndex: targetMonthIndex,
		selectedDate: nextSelectedDate,
		dateSearch: buildProgressDateSearch(nextSelectedDate),
	};
}

export {
	buildHistoryDateHref,
	canonicalProgressDateSearch,
	buildProgressDateSearch,
	buildProgressTabModel,
	moveProgressMonth,
	progressMonthFromDate,
	validSelectedDate,
};
export type {
	ProgressMonthState,
	ProgressMonthTransition,
	ProgressTab,
	ProgressTabModel,
};
