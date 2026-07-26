export type UserCardStatus = 'active' | 'archived';
export type IsoWeekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type DailyPlanMode = 'average' | 'custom';

export interface HabitDailyPlan {
	mode: DailyPlanMode;
	weekdays: IsoWeekday[];
	averageTargetBase?: number;
	customTargetsBaseByWeekday?: Partial<Record<IsoWeekday, number>>;
}

export interface UserCard {
	id: string;
	officialCardId: string;
	title: string;
	dailyPlan?: HabitDailyPlan;
	status: UserCardStatus;
	sortOrder: number;
	createdAt: string;
	updatedAt: string;
}
