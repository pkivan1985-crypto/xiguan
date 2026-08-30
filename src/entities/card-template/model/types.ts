import type { QuantityConfig } from '../lib/parseQuantity';

export type StageCompletionMode = 'quantity' | 'activeDays' | 'both';
export type HabitTrackingType = 'check' | 'count' | 'quantity' | 'duration' | 'avoid' | 'checklist';

export interface CardTemplate {
	id: string;
	categoryId: string;
	title: string;
	sortOrder: number;
	enabled: boolean;
	version: number;
	defaultStageMode: StageCompletionMode;
	trackingType?: HabitTrackingType;
	iconKey?: 'activity' | 'droplet' | 'book' | 'moon' | 'shield' | 'leaf' | 'receipt';
	accent?: 'blue' | 'cyan' | 'green' | 'amber' | 'violet';
	defaultDailyTargetBase?: number;
	stepBase?: number;
	quantity: QuantityConfig;
}
