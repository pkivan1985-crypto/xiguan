export { calculateGoalProgress } from './lib/calculateGoalProgress';
export { reconcileGoalAfterCorrection } from './lib/reconcileGoalAfterCorrection';
export {
	compareStageGoals,
	selectCurrentStageGoal,
	selectNextPlannedStageGoal,
} from './lib/orderStageGoals';
export type {
	GoalCompletionSnapshot,
	GoalProgress,
	GoalProgressTarget,
	GoalRevision,
	GoalStatus,
	GoalType,
	LongTermGoal,
	StageGoal,
} from './model/types';
