export type LocalDate = string;

const LOCAL_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export function parseLocalDate(value: string): LocalDate {
	const match = LOCAL_DATE_PATTERN.exec(value);
	if (!match) throw new Error('INVALID_LOCAL_DATE');
	const [, yearText, monthText, dayText] = match;
	const year = Number(yearText);
	const month = Number(monthText);
	const day = Number(dayText);
	const candidate = new Date(year, month - 1, day);
	if (candidate.getFullYear() !== year || candidate.getMonth() !== month - 1 || candidate.getDate() !== day) {
		throw new Error('INVALID_LOCAL_DATE');
	}
	return value;
}

export function formatLocalDate(date: Date): LocalDate {
	const year = String(date.getFullYear()).padStart(4, '0');
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return parseLocalDate(`${year}-${month}-${day}`);
}
