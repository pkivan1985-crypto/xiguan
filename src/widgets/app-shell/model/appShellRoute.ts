/* eslint-disable i18next/no-literal-string -- Translation keys are return-value identifiers. */
import { APP_ROUTES } from '@shared/config';

export type AppShellTitleKey = 'shell.nav.today' | 'shell.nav.deck' | 'shell.nav.history' | 'shell.nav.settings' | 'shell.nav.home';

export function appShellTitleKey(pathname: string): AppShellTitleKey {
	if (pathname === APP_ROUTES.TODAY) return 'shell.nav.today';
	if (pathname === APP_ROUTES.DECK) return 'shell.nav.deck';
	if (pathname === APP_ROUTES.HISTORY) return 'shell.nav.history';
	if (pathname === APP_ROUTES.SETTINGS || pathname.startsWith(`${APP_ROUTES.SETTINGS}/`)) return 'shell.nav.settings';
	return 'shell.nav.home';
}
