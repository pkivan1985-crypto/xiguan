import type { QuantityConfig } from '../lib/parseQuantity';

export type StageCompletionMode = 'quantity' | 'activeDays' | 'both';

export interface CardTemplate {
	id: string;
	categoryId: string;
	title: string;
	sortOrder: number;
	enabled: boolean;
	version: number;
	defaultStageMode: StageCompletionMode;
	quantity: QuantityConfig;
}
