import { describe, expect, it } from 'vitest';

import { calculateGoalProgress } from './calculateGoalProgress';
import type { ActionRecord } from '@entities/action-record';

function record(localDate: string, quantityBaseValue: number, deletedAt?: string): ActionRecord {
	return {
		id: `card-a:${localDate}`,
		userCardId: 'card-a',
		localDate,
		quantityBaseValue,
		firstSavedAt: `${localDate}T08:00:00.000Z`,
		lastSavedAt: `${localDate}T08:00:00.000Z`,
		lastSubmissionId: `submission-${localDate}`,
		deletedAt,
	};
}

const records = [record('2026-07-10', 3000), record('2026-07-11', 2000), record('2026-07-09', 9000, '2026-07-11T09:00:00.000Z')];

describe('calculateGoalProgress', () => {
	it('derives quantity progress from effective action records and caps ratio at one', () => {
		expect(calculateGoalProgress(records, { mode: 'quantity', targetQuantityBase: 4000 })).toMatchObject({
			quantityBaseValue: 5000,
			activeDays: 2,
			ratio: 1,
			completed: true,
		});
	});

	it('derives active-day progress from unique local dates', () => {
		expect(calculateGoalProgress(records, { mode: 'activeDays', targetActiveDays: 3 })).toMatchObject({ ratio: 2 / 3, completed: false });
	});

	it('requires both targets and uses the lower ratio instead of an average', () => {
		expect(calculateGoalProgress(records, { mode: 'both', targetQuantityBase: 10000, targetActiveDays: 2 })).toMatchObject({ ratio: 0.5, completed: false });
	});

	it('returns null when there is no goal', () => {
		expect(calculateGoalProgress(records, null)).toBeNull();
	});
});
