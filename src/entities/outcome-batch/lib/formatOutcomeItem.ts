import { formatQuantityFromBase } from '@entities/card-template';

import type { OutcomeBatchItem } from '../model/types';

export function formatOutcomeItem(item: OutcomeBatchItem): string {
	return formatQuantityFromBase(item.quantityBaseValue, {
		baseUnit: item.baseUnit,
		displayUnit: item.displayUnit,
		basePerDisplayUnit: item.basePerDisplayUnit,
		maxDecimalPlaces: item.maxDecimalPlaces,
		confirmationThresholdDisplay: Number.MAX_SAFE_INTEGER,
	});
}
