export type UserCardStatus = 'active' | 'archived';
export type IsoWeekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type DailyPlanMode = 'average' | 'custom';

export interface HabitDailyPlan {
	mode: DailyPlanMode;
	weekdays: IsoWeekday[];
	averageTargetBase?: number;
	customTargetsBaseByWeekday?: Partial<Record<IsoWeekday, number>>;
}

export interface LightFoodRule {
	id: string;
	label: string;
	builtIn: boolean;
}

export interface LightFoodHabitConfig {
	kind: 'light-food';
	rules: LightFoodRule[];
}

export type MediaOutputType = 'article' | 'short-video' | 'audio' | 'livestream';

export interface MediaOutputHabitConfig {
	kind: 'media-output';
	outputTypes: MediaOutputType[];
}

export interface BookkeepingOption {
	id: string;
	label: string;
}

export interface BookkeepingHabitConfig {
	kind: 'bookkeeping';
	startDate: string;
	reminderEnabled: boolean;
	reminderTime?: string;
	accounts: BookkeepingOption[];
	categories: BookkeepingOption[];
	monthlyBudgetCents?: number;
	budgetReminderEnabled: boolean;
}

export type HabitConfiguration = LightFoodHabitConfig | MediaOutputHabitConfig | BookkeepingHabitConfig;

export interface UserCard {
	id: string;
	officialCardId: string;
	title: string;
	dailyPlan?: HabitDailyPlan;
	habitConfig?: HabitConfiguration;
	status: UserCardStatus;
	sortOrder: number;
	createdAt: string;
	updatedAt: string;
}
