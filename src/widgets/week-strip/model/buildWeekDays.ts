import { formatLocalDate, parseLocalDate } from '@shared/lib/date';

export interface WeekDay {
	localDate: string;
	dayOfMonth: number;
	weekdayIndex: number;
}

export function buildWeekDays(localDate: string): WeekDay[] {
	parseLocalDate(localDate);
	const [year, month, day] = localDate.split('-').map(Number);
	const selected = new Date(year!, month! - 1, day!, 12);
	const mondayOffset = (selected.getDay() + 6) % 7;
	const monday = new Date(selected);
	monday.setDate(selected.getDate() - mondayOffset);
	return Array.from({ length: 7 }, (_, weekdayIndex) => {
		const date = new Date(monday);
		date.setDate(monday.getDate() + weekdayIndex);
		return {
			localDate: formatLocalDate(date),
			dayOfMonth: date.getDate(),
			weekdayIndex,
		};
	});
}
