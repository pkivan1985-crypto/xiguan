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
	const valuePattern = new RegExp(`^(?:0|[1-9]\\d*)(?:\\.(\\d{1,${config.maxDecimalPlaces}}))?$`);
	if (!valuePattern.test(valueText)) throw new Error('INVALID_QUANTITY');
	const displayValue = Number(valueText);
	const baseValue = displayValue * config.basePerDisplayUnit;
	if (displayValue <= 0 || !Number.isSafeInteger(baseValue)) throw new Error('INVALID_QUANTITY');
	if (displayValue > config.confirmationThresholdDisplay && !options.confirmedOverLimit) {
		throw new Error('QUANTITY_CONFIRMATION_REQUIRED');
	}
	return baseValue;
}
