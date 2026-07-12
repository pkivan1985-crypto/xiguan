import type { LocalDate } from '@shared/lib/date';
import type { StageCompletionMode } from '@entities/card-template';

export type OutcomeBatchStatus = 'ready' | 'playing' | 'completed';

export interface OutcomeProgressSnapshot {
	mode: StageCompletionMode;
	quantityBaseValue: number;
	activeDays: number;
	quantityRatio?: number;
	activeDaysRatio?: number;
	completed: boolean;
}

export interface OutcomeGoalChange {
	goalId: string;
	before: OutcomeProgressSnapshot;
	after: OutcomeProgressSnapshot;
}

export interface OutcomeBatchItem {
	slotIndex: number;
	userCardId: string;
	cardTitle: string;
	quantityBaseValue: number;
	baseUnit: string;
	displayUnit: string;
	longTermChange?: OutcomeGoalChange;
	stageChange?: OutcomeGoalChange;
}

export interface OutcomeBatch {
	id: string;
	submissionId: string;
	localDate: LocalDate;
	status: OutcomeBatchStatus;
	createdAt: string;
	items: OutcomeBatchItem[];
}
