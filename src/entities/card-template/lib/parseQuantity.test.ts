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
});
