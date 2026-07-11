import type { StageCompletionMode } from '@entities/card-template';

export type GoalStatus = 'planned' | 'active' | 'completed' | 'expired' | 'abandoned';
export type GoalType = 'longTerm' | 'stage';

export interface GoalCompletionSnapshot {
	completedAt: string;
	mode: StageCompletionMode;
	quantityBaseValue: number;
	activeDays: number;
	targetQuantityBase?: number;
	targetActiveDays?: number;
}

export interface LongTermGoal {
	id: string;
	userCardId: string;
	title: string;
	targetQuantityBase: number;
	status: GoalStatus;
	startDate: string;
	endDate?: string;
	createdAt: string;
	updatedAt: string;
	completionSnapshot?: GoalCompletionSnapshot;
}

export interface StageGoal {
	id: string;
	longTermGoalId: string;
	title: string;
	mode: StageCompletionMode;
	targetQuantityBase?: number;
	targetActiveDays?: number;
	status: GoalStatus;
	startDate: string;
	endDate?: string;
	createdAt: string;
	updatedAt: string;
	completionSnapshot?: GoalCompletionSnapshot;
}

export interface GoalRevision {
	id: string;
	goalType: GoalType;
	goalId: string;
	createdAt: string;
	reason: 'completed';
	beforeStatus: GoalStatus;
	afterStatus: GoalStatus;
	submissionId: string;
}

export interface GoalProgressTarget {
	mode: StageCompletionMode;
	targetQuantityBase?: number;
	targetActiveDays?: number;
}

export interface GoalProgress {
	quantityBaseValue: number;
	activeDays: number;
	quantityRatio?: number;
	activeDaysRatio?: number;
	ratio: number;
	completed: boolean;
}
