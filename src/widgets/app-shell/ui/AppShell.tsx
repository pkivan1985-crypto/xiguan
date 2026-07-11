import styles from './AppShell.module.css';
import { NavLink, Outlet, useLocation } from 'react-router';
import { useTranslation } from 'react-i18next';
import { FiCalendar, FiClock, FiHome, FiLayers, FiSettings } from 'react-icons/fi';
import { APP_NAME, APP_ROUTES } from '@shared/config';

function AppShell() {
	const { t } = useTranslation();
	const { pathname } = useLocation();
	const pageTitle = pathname === APP_ROUTES.TODAY
		? t('shell.nav.today')
		: pathname === APP_ROUTES.DECK
			? t('shell.nav.deck')
			: pathname === APP_ROUTES.HISTORY
				? t('shell.nav.history')
				: pathname === APP_ROUTES.SETTINGS
					? t('shell.nav.settings')
					: t('shell.nav.home');

	const navItems = [
		{ to: APP_ROUTES.HOME, label: t('shell.nav.home'), icon: FiHome, end: true },
		{ to: APP_ROUTES.TODAY, label: t('shell.nav.today'), icon: FiCalendar },
		{ to: APP_ROUTES.DECK, label: t('shell.nav.deck'), icon: FiLayers },
		{ to: APP_ROUTES.HISTORY, label: t('shell.nav.history'), icon: FiClock },
	];

	return (
		<div className={styles.shell}>
			<header className={styles.header}>
				<div>
					<p className={styles.brand}>{APP_NAME}</p>
					<h1 className={styles.title}>{pageTitle}</h1>
				</div>

				{pathname !== APP_ROUTES.SETTINGS && (
					<NavLink
						className={styles.settingsLink}
						to={APP_ROUTES.SETTINGS}
						aria-label={t('shell.actions.openSettings')}
					>
						<FiSettings aria-hidden='true' />
					</NavLink>
				)}

				<div className={styles.trail} aria-hidden='true'>
					<span />
					<span />
					<span />
					<span />
				</div>
			</header>

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
						<span>{label}</span>
					</NavLink>
				))}
			</nav>
		</div>
	);
}

export { AppShell };
