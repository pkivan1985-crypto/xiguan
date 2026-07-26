/* eslint-disable i18next/no-literal-string -- Translation keys are return-value identifiers. */
import { APP_ROUTES, PRIMARY_NAV_ROUTES } from '@shared/config';

export type AppShellTitleKey = 'shell.nav.today' | 'shell.nav.progress' | 'shell.nav.habits' | 'shell.nav.settings';

export function hasPageOwnedHeader(pathname: string): boolean {
	return PRIMARY_NAV_ROUTES.includes(pathname as typeof PRIMARY_NAV_ROUTES[number]);
}

export function appShellTitleKey(pathname: string): AppShellTitleKey {
	if (pathname === APP_ROUTES.PROGRESS || pathname === APP_ROUTES.HISTORY) return 'shell.nav.progress';
	if (pathname === APP_ROUTES.DECK) return 'shell.nav.habits';
	if (pathname === APP_ROUTES.SETTINGS || pathname.startsWith(`${APP_ROUTES.SETTINGS}/`)) return 'shell.nav.settings';
	return 'shell.nav.today';
}
