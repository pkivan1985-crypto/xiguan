import type { QuantityConfig } from './parseQuantity';

export function formatQuantityFromBase(baseValue: number, config: QuantityConfig): string {
	if (!Number.isSafeInteger(baseValue) || baseValue < 0) throw new Error('INVALID_BASE_QUANTITY');
	if (!Number.isSafeInteger(config.basePerDisplayUnit) || config.basePerDisplayUnit <= 0) {
		throw new Error('INVALID_QUANTITY_CONFIG');
	}
	const precision = Math.max(2, config.maxDecimalPlaces);
	const fixed = (baseValue / config.basePerDisplayUnit).toFixed(precision);
	const [integer, fraction = ''] = fixed.split('.');
	const trimmedFraction = fraction.slice(0, 2) + fraction.slice(2).replace(/0+$/, '');
	return trimmedFraction ? `${integer}.${trimmedFraction}` : integer;
}
