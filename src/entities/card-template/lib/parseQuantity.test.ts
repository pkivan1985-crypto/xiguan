import { describe, expect, it } from 'vitest';

import { parseQuantityToBase } from './parseQuantity';

const runningQuantity = {
	baseUnit: 'meter',
	displayUnit: 'km',
	basePerDisplayUnit: 1000,
	maxDecimalPlaces: 3,
	confirmationThresholdDisplay: 100,
} as const;

describe('parseQuantityToBase', () => {
	it.each([['8.05', 805], ['0.29', 29], ['12.30', 1230], ['81.01', 8101]])('converts %s money to exact integer cents for reflection edits', (input, expected) => {
		expect(parseQuantityToBase(input, { baseUnit: 'cent', displayUnit: '元', basePerDisplayUnit: 100, maxDecimalPlaces: 2, confirmationThresholdDisplay: 100000 })).toBe(expected);
	});
	it('rejects fractional base units and unsafe totals instead of silently rounding them', () => {
		expect(() => parseQuantityToBase('0.01', { ...runningQuantity, basePerDisplayUnit: 1 })).toThrow('INVALID_QUANTITY');
		expect(() => parseQuantityToBase('9007199254740992', runningQuantity, { confirmedOverLimit: true })).toThrow('INVALID_QUANTITY');
	});
	it.each([
		['1', 1000],
		['1.25', 1250],
		['0.001', 1],
		['100', 100000],
	])('converts %s km to integer meters', (input, expected) => {
		expect(parseQuantityToBase(input, runningQuantity)).toBe(expected);
	});

	it.each(['', ' ', '0', '-1', '1e2', '1.0001', 'Infinity', 'NaN', '.'])('rejects invalid quantity %j', (input) => {
		expect(() => parseQuantityToBase(input, runningQuantity)).toThrow('INVALID_QUANTITY');
	});

	it('requires confirmation only above the configured threshold', () => {
		expect(() => parseQuantityToBase('100.001', runningQuantity)).toThrow('QUANTITY_CONFIRMATION_REQUIRED');
		expect(parseQuantityToBase('100.001', runningQuantity, { confirmedOverLimit: true })).toBe(100001);
	});

	it('supports integer-only tracking presets without constructing an invalid expression', () => {
		expect(parseQuantityToBase('30', {
			baseUnit: 'minute',
			displayUnit: '分钟',
			basePerDisplayUnit: 1,
			maxDecimalPlaces: 0,
			confirmationThresholdDisplay: 720,
		})).toBe(30);
	});
});
