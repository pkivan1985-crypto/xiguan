import type { LocalDate } from '@shared/lib/date';

export interface WaterRecordDetails {
	kind: 'water';
	cupSizeMl?: number;
	morningCups?: number;
	afternoonCups?: number;
	eveningCups?: number;
	beverageType?: 'water' | 'tea' | 'coffee' | 'other';
}

export interface ReadingRecordDetails {
	kind: 'reading';
	bookTitle?: string;
	durationMinutes?: number;
	startPage?: number;
	endPage?: number;
	chapter?: string;
	reflection?: string;
}

export interface LightFoodRecordDetails {
	kind: 'light-food';
	checkedRuleIds: string[];
}

export interface SleepRecordDetails {
	kind: 'sleep';
	onTime?: boolean;
	bedtime?: string;
	wakeTime?: string;
	durationMinutes?: number;
	quality?: 1 | 2 | 3 | 4 | 5;
	wakeFeeling?: 'tired' | 'normal' | 'refreshed';
}

export interface ScreenFreeRecordDetails {
	kind: 'screen-free';
	screenMinutes?: number;
	shortVideoMinutes?: number;
	socialMinutes?: number;
	newsMinutes?: number;
	otherMinutes?: number;
	screenFreeMoments?: Array<'after-waking' | 'during-meals' | 'before-sleep'>;
}

export interface ExtraExpenseLineItem {
	id: string;
	amountCents: number;
	item: string;
	reason: string;
	bankBalanceCents?: number;
	earnBackDays?: number;
	compensation?: string;
	necessity: 'necessary' | 'delayable' | 'impulse';
	occurredTime: string;
	createdAt: string;
	updatedAt: string;
}

export interface ExtraExpenseRecordDetails {
	kind: 'extra-expense';
	entries: ExtraExpenseLineItem[];
}

export interface LegacyExtraExpenseRecordDetails {
	kind: 'extra-expense';
	item: string;
	reason: string;
	bankBalanceCents?: number;
	earnBackDays?: number;
	compensation?: string;
	necessity: 'necessary' | 'delayable' | 'impulse';
}

export type HabitRecordDetails =
	| WaterRecordDetails
	| ReadingRecordDetails
	| LightFoodRecordDetails
	| SleepRecordDetails
	| ScreenFreeRecordDetails
	| ExtraExpenseRecordDetails
	| LegacyExtraExpenseRecordDetails;

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
	details?: HabitRecordDetails;
	longTermGoalId?: string;
	stageGoalId?: string;
	firstSavedAt: string;
	lastSavedAt: string;
	lastSubmissionId: string;
	deletedAt?: string;
}
