import { describe, expect, it } from 'vitest';

import {
	formatMoneyInput,
	moneyInputFromCents,
	normalizeMoneyInput,
	parseMoneyInputToCents,
} from './moneyInput';

describe('money input', () => {
	it('accepts at most two decimal places while preserving an in-progress decimal', () => {
		expect(normalizeMoneyInput('12')).toBe('12');
		expect(normalizeMoneyInput('12.')).toBe('12.');
		expect(normalizeMoneyInput('12.3')).toBe('12.3');
		expect(normalizeMoneyInput('12.34')).toBe('12.34');
		expect(normalizeMoneyInput('12.345')).toBeUndefined();
	});

	it('normalizes common mobile decimal separators and leading decimals', () => {
		expect(normalizeMoneyInput('12,34')).toBe('12.34');
		expect(normalizeMoneyInput('.5')).toBe('0.5');
	});

	it('formats accepted values to two decimal places on blur', () => {
		expect(formatMoneyInput('12')).toBe('12.00');
		expect(formatMoneyInput('12.3')).toBe('12.30');
		expect(formatMoneyInput('12.34')).toBe('12.34');
		expect(formatMoneyInput('')).toBe('');
	});

	it('round-trips exact integer cents without floating-point drift', () => {
		expect(parseMoneyInputToCents('68.35')).toBe(6835);
		expect(parseMoneyInputToCents('68.351')).toBeUndefined();
		expect(moneyInputFromCents(6835)).toBe('68.35');
		expect(moneyInputFromCents(6800)).toBe('68.00');
	});
});
