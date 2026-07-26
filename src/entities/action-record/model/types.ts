import type { LocalDate } from '@shared/lib/date';

export interface ActionRecord {
	id: string;
	userCardId: string;
	localDate: LocalDate;
	quantityBaseValue: number;
	entryMethod?: 'completed' | 'actual' | 'adjustment';
	plannedQuantityBaseValue?: number;
	carryInBaseValue?: number;
	carryOutBaseValue?: number;
	durationSeconds?: number;
	averagePaceSecondsPerKm?: number;
	averageHeartRateBpm?: number;
	note?: string;
	longTermGoalId?: string;
	stageGoalId?: string;
	firstSavedAt: string;
	lastSavedAt: string;
	lastSubmissionId: string;
	deletedAt?: string;
}
