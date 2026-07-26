import type { StageGoal } from '../model/types';

const STATUS_PRIORITY: Record<StageGoal['status'], number> = {
	active: 0,
	planned: 1,
	completed: 2,
	expired: 3,
	abandoned: 4,
};

function stageSequence(goal: StageGoal): number {
	return goal.sequence ?? 0;
}

export function compareStageGoals(left: StageGoal, right: StageGoal): number {
	return stageSequence(left) - stageSequence(right)
		|| left.createdAt.localeCompare(right.createdAt)
		|| left.id.localeCompare(right.id);
}

export function selectCurrentStageGoal(goals: readonly StageGoal[]): StageGoal | undefined {
	return [...goals].sort((left, right) => (
		STATUS_PRIORITY[left.status] - STATUS_PRIORITY[right.status]
		|| compareStageGoals(left, right)
	))[0];
}

export function selectNextPlannedStageGoal(goals: readonly StageGoal[]): StageGoal | undefined {
	return [...goals].filter(({ status }) => status === 'planned').sort(compareStageGoals)[0];
}
