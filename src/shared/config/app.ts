export const APP_NAME = '重复成果显化';
export const APP_SHORT_NAME = '成果显化';
export const APP_DESCRIPTION = '把每天真实完成的重复行动，变成可累计、可回顾的可见成果。';

export const APP_ROUTES = {
	HOME: '/',
	TODAY: '/today',
	DECK: '/deck',
	DECK_NEW: '/deck/new',
	HISTORY: '/history',
	SETTINGS: '/settings',
	DATA_MANAGEMENT: '/settings/data',
	GOAL_DETAILS_PATTERN: '/goals/:userCardId',
	goalDetails: (userCardId: string) => `/goals/${encodeURIComponent(userCardId)}`,
} as const;

export const PRIMARY_NAV_ROUTES = [
	APP_ROUTES.HOME,
	APP_ROUTES.TODAY,
	APP_ROUTES.DECK,
	APP_ROUTES.HISTORY,
] as const;
