/* eslint-disable i18next/no-literal-string -- Translation keys are return-value identifiers. */
import { APP_ROUTES, PRIMARY_NAV_ROUTES } from '@shared/config';

export type AppShellTitleKey = 'shell.nav.today' | 'shell.nav.progress' | 'shell.nav.habits' | 'shell.nav.settings';

export function hasPageOwnedHeader(pathname: string): boolean {
	const normalizedPathname = normalizePathname(pathname);
	return PRIMARY_NAV_ROUTES.includes(normalizedPathname as typeof PRIMARY_NAV_ROUTES[number]);
}

export function appShellTitleKey(pathname: string): AppShellTitleKey {
	const normalizedPathname = normalizePathname(pathname);
	if (normalizedPathname === APP_ROUTES.PROGRESS || normalizedPathname === APP_ROUTES.HISTORY) return 'shell.nav.progress';
	if (normalizedPathname === APP_ROUTES.DECK) return 'shell.nav.habits';
	if (isSettingsPath(normalizedPathname)) return 'shell.nav.settings';
	return 'shell.nav.today';
}

export function isSettingsPath(pathname: string): boolean {
	const normalizedPathname = normalizePathname(pathname);
	return normalizedPathname === APP_ROUTES.SETTINGS
		|| normalizedPathname.startsWith(`${APP_ROUTES.SETTINGS}/`);
}

function normalizePathname(pathname: string): string {
	if (pathname === APP_ROUTES.HOME) return pathname;
	return pathname.replace(/\/+$/, '');
}
