import type { LocalDate } from '@shared/lib/date';

export type OutcomeBatchStatus = 'ready' | 'playing' | 'completed';

export interface OutcomeBatchItem {
	slotIndex: number;
	userCardId: string;
	cardTitle: string;
	quantityBaseValue: number;
	baseUnit: string;
	longTermGoalId?: string;
	stageGoalId?: string;
	longTermProgressRatio?: number;
	stageProgressRatio?: number;
}

export interface OutcomeBatch {
	id: string;
	submissionId: string;
	localDate: LocalDate;
	status: OutcomeBatchStatus;
	createdAt: string;
	items: OutcomeBatchItem[];
}
