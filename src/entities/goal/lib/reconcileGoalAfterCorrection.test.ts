import { describe, expect, it } from 'vitest';

import { reconcileGoalAfterCorrection } from './reconcileGoalAfterCorrection';
import type { GoalProgress, LongTermGoal } from '../model/types';

function progress(completed: boolean): GoalProgress {
	return {
		quantityBaseValue: completed ? 100_000 : 7_500,
		activeDays: completed ? 20 : 2,
		quantityRatio: completed ? 1 : 0.075,
		ratio: completed ? 1 : 0.075,
		completed,
	};
}

const longGoal: LongTermGoal = {
	id: 'long-1',
	userCardId: 'card-1',
	title: '100 km',
	targetQuantityBase: 100_000,
	status: 'completed',
	startDate: '2026-01-01',
	endDate: '2026-12-31',
	createdAt: '2026-01-01T00:00:00.000Z',
	updatedAt: '2026-07-12T00:00:00.000Z',
	completionSnapshot: {
		completedAt: '2026-07-12T00:00:00.000Z',
		mode: 'quantity',
		quantityBaseValue: 100_000,
		activeDays: 20,
		targetQuantityBase: 100_000,
	},
};

describe('reconcileGoalAfterCorrection', () => {
	it('removes completion and returns an in-window goal to active', () => {
		const result = reconcileGoalAfterCorrection(
			longGoal,
			progress(false),
			'2026-07-12',
			'2026-07-12T10:00:00.000Z',
		);

		expect(result).toMatchObject({
			status: 'active',
			completionSnapshot: undefined,
			updatedAt: '2026-07-12T10:00:00.000Z',
		});
	});

	it('marks an unmet goal expired after its end date', () => {
		expect(reconcileGoalAfterCorrection(
			{ ...longGoal, endDate: '2026-07-11' },
			progress(false),
			'2026-07-12',
			'2026-07-12T10:00:00.000Z',
		).status).toBe('expired');
	});

	it('returns a future unmet goal to planned', () => {
		expect(reconcileGoalAfterCorrection(
			{ ...longGoal, startDate: '2026-07-13' },
			progress(false),
			'2026-07-12',
			'2026-07-12T10:00:00.000Z',
		).status).toBe('planned');
	});

	it('preserves abandoned goals even if corrected facts meet the target', () => {
		const abandoned = { ...longGoal, status: 'abandoned' as const, completionSnapshot: undefined };
		expect(reconcileGoalAfterCorrection(
			abandoned,
			progress(true),
			'2026-07-12',
			'2026-07-12T10:00:00.000Z',
		)).toEqual(abandoned);
	});

	it('rebuilds a completed snapshot from corrected facts without changing original completedAt', () => {
		const result = reconcileGoalAfterCorrection(
			longGoal,
			progress(true),
			'2026-07-12',
			'2026-07-12T10:00:00.000Z',
		);

		expect(result.completionSnapshot).toMatchObject({
			completedAt: '2026-07-12T00:00:00.000Z',
			quantityBaseValue: 100_000,
			activeDays: 20,
		});
	});
});
