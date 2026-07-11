import type { LocalDate } from '@shared/lib/date';

export type TodayDraftStatus = 'editing' | 'submitted';

export interface TodaySlotAssignment {
	slotIndex: number;
	userCardId: string | null;
	valueText: string;
}

export interface TodayDraft {
	localDate: LocalDate;
	status: TodayDraftStatus;
	slots: TodaySlotAssignment[];
	updatedAt: string;
	lastSubmissionId?: string;
}
