/* eslint-disable i18next/no-literal-string -- Goal modes and statuses are domain identifiers. */
import { parseLocalDate } from '@shared/lib/date';

import type {
	GoalCompletionSnapshot,
	GoalProgress,
	LongTermGoal,
	StageGoal,
} from '../model/types';

type Goal = LongTermGoal | StageGoal;

function completionSnapshot(
	goal: Goal,
	progress: GoalProgress,
	nowIso: string,
): GoalCompletionSnapshot {
	return {
		completedAt: goal.completionSnapshot?.completedAt ?? nowIso,
		mode: 'mode' in goal ? goal.mode : 'quantity',
		quantityBaseValue: progress.quantityBaseValue,
		activeDays: progress.activeDays,
		targetQuantityBase: goal.targetQuantityBase,
		targetActiveDays: 'targetActiveDays' in goal ? goal.targetActiveDays : undefined,
	};
}

export function reconcileGoalAfterCorrection<T extends Goal>(
	goal: T,
	progress: GoalProgress,
	currentLocalDate: string,
	nowIso: string,
): T {
	parseLocalDate(currentLocalDate);
	if (Number.isNaN(Date.parse(nowIso))) throw new Error('INVALID_NOW_ISO');
	if (goal.status === 'abandoned') return goal;

	if (progress.completed) {
		return {
			...goal,
			status: 'completed',
			updatedAt: nowIso,
			completionSnapshot: completionSnapshot(goal, progress, nowIso),
		};
	}

	const status = goal.startDate > currentLocalDate
		? 'planned'
		: goal.endDate && goal.endDate < currentLocalDate
			? 'expired'
			: 'active';

	return {
		...goal,
		status,
		updatedAt: nowIso,
		completionSnapshot: undefined,
	};
}
