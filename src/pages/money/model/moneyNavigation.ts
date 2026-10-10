import { formatLocalDate } from '@shared/lib/date';

export function currentMoneyMonth(): string {
	return formatLocalDate(new Date()).slice(0, 7);
}

export function validMoneyMonth(value: string | null | undefined): string {
	return value && /^\d{4}-(0[1-9]|1[0-2])$/.test(value) ? value : currentMoneyMonth();
}

export function adjacentMoneyMonth(month: string, direction: -1 | 1): string {
	const [year, monthNumber] = month.split('-').map(Number);
	return formatLocalDate(new Date(year, monthNumber - 1 + direction, 1, 12)).slice(0, 7);
}

export function moneyHomePath(month: string): string {
	return `/money?month=${validMoneyMonth(month)}`;
}

export function moneyMonthLabel(month: string): string {
	return `${month.slice(0, 4)}年${Number(month.slice(5, 7))}月`;
}

export interface MoneyHomeSession {
	expanded: Record<'credit' | 'loan' | 'fixed', boolean>;
	scrollY: number;
}

// Disposable UI state only; amounts and account facts never live here.
const homeSessions = new Map<string, MoneyHomeSession>();

export function readMoneyHomeSession(month: string): MoneyHomeSession {
	const existing = homeSessions.get(month);
	return existing ? { ...existing, expanded: { ...existing.expanded } } : {
		expanded: { credit: true, loan: true, fixed: true }, scrollY: 0,
	};
}

export function rememberMoneyHomeSession(month: string, session: MoneyHomeSession): void {
	homeSessions.set(month, { ...session, expanded: { ...session.expanded } });
}
export function moneyNavigationNeedsConfirmation(dirty: boolean, current: string, next: string) {
	return dirty && current !== next;
}
