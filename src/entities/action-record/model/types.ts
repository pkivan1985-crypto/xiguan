import type { LocalDate } from '@shared/lib/date';

export interface ActionRecord {
	id: string;
	userCardId: string;
	localDate: LocalDate;
	quantityBaseValue: number;
	longTermGoalId?: string;
	stageGoalId?: string;
	firstSavedAt: string;
	lastSavedAt: string;
	lastSubmissionId: string;
	deletedAt?: string;
}
