import { describe, expect, it } from 'vitest';
import { adjacentMoneyMonth, moneyHomePath, readMoneyHomeSession, rememberMoneyHomeSession } from './moneyNavigation';

describe('money navigation session', () => {
	it('returns to the bill month instead of Today and moves through year boundaries', () => {
		expect(moneyHomePath('2026-06')).toBe('/money?month=2026-06');
		expect(adjacentMoneyMonth('2026-12', 1)).toBe('2027-01');
		expect(adjacentMoneyMonth('2026-01', -1)).toBe('2025-12');
	});
	it('restores folds and scroll separately for each viewed month without leaking references', () => {
		rememberMoneyHomeSession('2026-06', { expanded: { credit: false, loan: true, fixed: false }, scrollY: 624 });
		const restored = readMoneyHomeSession('2026-06');
		expect(restored).toEqual({ expanded: { credit: false, loan: true, fixed: false }, scrollY: 624 });
		expect(readMoneyHomeSession('2026-07').expanded.credit).toBe(true);
		restored.expanded.credit = true;
		expect(readMoneyHomeSession('2026-06').expanded.credit).toBe(false);
	});
});
