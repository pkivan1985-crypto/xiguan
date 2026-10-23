export interface QuantityConfig {
	baseUnit: string;
	displayUnit: string;
	basePerDisplayUnit: number;
	maxDecimalPlaces: number;
	confirmationThresholdDisplay: number;
}

export function parseQuantityToBase(
	valueText: string,
	config: QuantityConfig,
	options: { confirmedOverLimit?: boolean } = {},
): number {
	const decimalPart = config.maxDecimalPlaces > 0 ? `(?:\\.(\\d{1,${config.maxDecimalPlaces}}))?` : '';
	const valuePattern = new RegExp(`^(?:0|[1-9]\\d*)${decimalPart}$`);
	if (!valuePattern.test(valueText)) throw new Error('INVALID_QUANTITY');
	const displayValue = Number(valueText);
	if (!Number.isSafeInteger(config.basePerDisplayUnit) || config.basePerDisplayUnit <= 0) throw new Error('INVALID_QUANTITY');
	// Convert decimal digits exactly: floating multiplication makes 8.05 * 100 non-integer.
	const [whole, fraction = ''] = valueText.split('.');
	const scale = 10n ** BigInt(fraction.length);
	const numerator = BigInt(whole! + fraction) * BigInt(config.basePerDisplayUnit);
	if (numerator % scale !== 0n || numerator / scale > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error('INVALID_QUANTITY');
	const baseValue = Number(numerator / scale);
	if (displayValue <= 0 || !Number.isSafeInteger(baseValue)) throw new Error('INVALID_QUANTITY');
	if (displayValue > config.confirmationThresholdDisplay && !options.confirmedOverLimit) {
		throw new Error('QUANTITY_CONFIRMATION_REQUIRED');
	}
	return baseValue;
}
