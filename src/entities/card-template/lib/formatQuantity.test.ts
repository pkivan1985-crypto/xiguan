import { describe, expect, it } from 'vitest';

import type { QuantityConfig } from './parseQuantity';
import { formatQuantityFromBase } from './formatQuantity';

const RUNNING_QUANTITY: QuantityConfig = {
	baseUnit: 'meter',
	displayUnit: 'km',
	basePerDisplayUnit: 1000,
	maxDecimalPlaces: 3,
	confirmationThresholdDisplay: 100,
};

describe('formatQuantityFromBase', () => {
	it('formats integer base values without floating-point drift', () => {
		expect(formatQuantityFromBase(5200, RUNNING_QUANTITY)).toBe('5.20');
		expect(formatQuantityFromBase(5250, RUNNING_QUANTITY)).toBe('5.25');
		expect(formatQuantityFromBase(5225, RUNNING_QUANTITY)).toBe('5.225');
	});

	it('rejects negative, fractional, and unsafe base quantities', () => {
		expect(() => formatQuantityFromBase(-1, RUNNING_QUANTITY)).toThrow('INVALID_BASE_QUANTITY');
		expect(() => formatQuantityFromBase(1.5, RUNNING_QUANTITY)).toThrow('INVALID_BASE_QUANTITY');
		expect(() => formatQuantityFromBase(Number.MAX_SAFE_INTEGER + 1, RUNNING_QUANTITY)).toThrow('INVALID_BASE_QUANTITY');
	});
});
