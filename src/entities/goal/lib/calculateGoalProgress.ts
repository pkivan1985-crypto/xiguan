import type { ActionRecord } from '@entities/action-record';

import type { GoalProgress, GoalProgressTarget } from '../model/types';

function ratio(value: number, target: number | undefined, errorCode: string): number {
	if (!target || target <= 0 || !Number.isSafeInteger(target)) throw new Error(errorCode);
	return Math.min(value / target, 1);
}

export function calculateGoalProgress(
	records: readonly ActionRecord[],
	target: GoalProgressTarget | null,
): GoalProgress | null {
	if (!target) return null;
	const effectiveRecords = records.filter(({ deletedAt }) => !deletedAt);
	const quantityBaseValue = effectiveRecords.reduce((total, record) => total + record.quantityBaseValue, 0);
	const activeDays = new Set(effectiveRecords.map(({ localDate }) => localDate)).size;
	const quantityRatio = target.mode === 'activeDays' ? undefined : ratio(quantityBaseValue, target.targetQuantityBase, 'INVALID_QUANTITY_TARGET');
	const activeDaysRatio = target.mode === 'quantity' ? undefined : ratio(activeDays, target.targetActiveDays, 'INVALID_ACTIVE_DAYS_TARGET');
	const progressRatio = target.mode === 'quantity'
		? quantityRatio!
		: target.mode === 'activeDays'
			? activeDaysRatio!
			: Math.min(quantityRatio!, activeDaysRatio!);
	return {
		quantityBaseValue,
		activeDays,
		quantityRatio,
		activeDaysRatio,
		ratio: progressRatio,
		completed: progressRatio >= 1,
	};
}
