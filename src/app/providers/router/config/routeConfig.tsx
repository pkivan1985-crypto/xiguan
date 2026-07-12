import { Navigate, type RouteObject } from 'react-router';
import { HomePage } from '@pages/home';
import { TodayPage } from '@pages/today';
import { DeckPage } from '@pages/deck';
import { HistoryPage } from '@pages/history';
import { SettingsPage } from '@pages/settings';
import { CreateRunningCardPage } from '@pages/create-running-card';
import { GoalDetailsPage } from '@pages/habit-statistics';
import { DataManagementPage } from '@pages/data-management';
import { APP_ROUTES } from '@shared/config';
import { AppShell } from '@widgets/app-shell';

/**
 * Global route configuration.
 *
 * Note: Most functional pages are rendered as sub-routes
 * inside ModalLayout via React Router Outlet.
 *
 * @see {@link ROUTES}
 */
export const routeConfig: RouteObject[] = [
	{
		path: APP_ROUTES.HOME,
		element: <AppShell />,
		children: [
			{ index: true, element: <HomePage /> },
			{ path: APP_ROUTES.TODAY.slice(1), element: <TodayPage /> },
			{ path: APP_ROUTES.DECK.slice(1), element: <DeckPage /> },
			{ path: APP_ROUTES.HISTORY.slice(1), element: <HistoryPage /> },
			{ path: APP_ROUTES.SETTINGS.slice(1), element: <SettingsPage /> },
			{ path: APP_ROUTES.DATA_MANAGEMENT.slice(1), element: <DataManagementPage /> },
			{ path: APP_ROUTES.GOAL_DETAILS_PATTERN.slice(1), element: <GoalDetailsPage /> },
		],
	},
	{
		path: APP_ROUTES.DECK_NEW,
		element: <CreateRunningCardPage />,
	},
	{
		path: '*',
		element: <Navigate to={APP_ROUTES.HOME} replace />,
	},
];
