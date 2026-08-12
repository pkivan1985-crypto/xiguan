import styles from './AppShell.module.css';
import { NavLink, Outlet, useLocation } from 'react-router';
import { useTranslation } from 'react-i18next';
import { PiChartBar, PiCheckSquare, PiGear, PiStack } from 'react-icons/pi';
import { APP_ROUTES } from '@shared/config';
import {
	appShellTitleKey,
	hasPageOwnedHeader,
	isSettingsPath,
} from '../model/appShellRoute';

function AppShell() {
	const { t } = useTranslation();
	const { pathname } = useLocation();
	const pageTitle = t(appShellTitleKey(pathname));
	const pageOwnsHeader = hasPageOwnedHeader(pathname);

	const navItems = [
		{ to: APP_ROUTES.HOME, label: t('shell.nav.today'), icon: PiCheckSquare, end: true },
		{ to: APP_ROUTES.PROGRESS, label: t('shell.nav.progress'), icon: PiChartBar },
		{ to: APP_ROUTES.DECK, label: t('shell.nav.habits'), icon: PiStack },
	];

	return (
		<div className={styles.shell}>
			{!pageOwnsHeader && (
				<header className={styles.header}>
					<h1 className={styles.title}>{pageTitle}</h1>
					{!isSettingsPath(pathname) && (
						<NavLink
							className={styles.settingsLink}
							to={APP_ROUTES.SETTINGS}
							aria-label={t('shell.actions.openSettings')}
						>
							<PiGear aria-hidden='true' />
						</NavLink>
					)}
				</header>
			)}

			<div className={styles.content}>
				<Outlet />
			</div>

			<nav className={styles.navigation} aria-label={t('shell.nav.primary')}>
				{navItems.map(({ to, label, icon: Icon, end }) => (
					<NavLink
						key={to}
						to={to}
						end={end}
						className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
					>
						<Icon aria-hidden='true' />
						<span className={styles.navLabel}>{label}</span>
					</NavLink>
				))}
			</nav>
		</div>
	);
}

export { AppShell };
