import { formatLocalDate } from '@shared/lib/date';

export interface MonthCell {
	key: string;
	day: number;
	localDate?: string;
}

export function buildMonthCells(year: number, monthIndex: number): MonthCell[] {
	const leading = (new Date(year, monthIndex, 1).getDay() + 6) % 7;
	const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
	return [
		...Array.from({ length: leading }, (_, index) => ({ key: `leading-${index}`, day: 0 })),
		...Array.from({ length: daysInMonth }, (_, index) => {
			const date = new Date(year, monthIndex, index + 1);
			return { key: formatLocalDate(date), day: index + 1, localDate: formatLocalDate(date) };
		}),
	];
}
