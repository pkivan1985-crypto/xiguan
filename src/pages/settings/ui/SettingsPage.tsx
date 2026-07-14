import styles from './SettingsPage.module.css';
import { useTranslation } from 'react-i18next';
import { FiDownload, FiExternalLink, FiGithub, FiHardDrive, FiMoon, FiRefreshCw, FiSun, FiWifi, FiWifiOff } from 'react-icons/fi';
import { Link } from 'react-router';
import { useSettingsStore } from '@entities/settings';
import { usePwaInstall } from '@features/pwa-install';
import { usePwaUpdate } from '@features/pwa-update';
import { ShellSection } from '@shared/ui';
import { APP_ROUTES, PROJECT_SOURCE, UPSTREAM_SOURCE_URL } from '@shared/config';

function SettingsPage() {
	const { t } = useTranslation();
	const settings = useSettingsStore((state) => state.settings);
	const settingsDispatch = useSettingsStore((state) => state.settingsDispatch);
	const { state, iosDevice, install } = usePwaInstall();
	const update = usePwaUpdate();
	const pwaStatusDescription = state === 'INSTALLED'
		? t('shell.settings.pwaStatus.INSTALLED')
		: state === 'CAN_PROMPT'
			? t('shell.settings.pwaStatus.CAN_INSTALL')
			: state === 'IOS_MANUAL'
				? t('shell.settings.pwaStatus.IOS_MANUAL')
			: state === 'BROWSER_MENU'
				? t('shell.settings.pwaStatus.BROWSER_MENU')
				: t('shell.settings.pwaStatus.UNAVAILABLE');
	const updateDescription = !update.online
		? t('shell.settings.offlineNow')
		: update.state.kind === 'checking'
			? t('shell.settings.updateChecking')
			: update.state.kind === 'available'
				? t('shell.settings.updateAvailable')
				: update.state.kind === 'blocked'
					? t('shell.settings.updateBlocked')
					: update.state.kind === 'applying'
						? t('shell.settings.updateApplying')
						: update.state.kind === 'failed'
							? t('shell.settings.updateFailed')
							: update.offlineReady
								? t('shell.settings.offlineReady')
								: t('shell.settings.offlinePreparing');
	const offlineDescription = !update.online
		? t('shell.settings.offlineNow')
		: update.offlineReady
			? t('shell.settings.offlineReady')
			: t('shell.settings.offlinePreparing');

	const setTheme = (theme?: 'light' | 'dark') => {
		settingsDispatch({ type: 'updateSettings', payload: { theme } });
	};

	return (
		<div className={styles.page}>
			<ShellSection title={t('shell.settings.appearanceTitle')}>
				<div className={styles.segmented} role='group' aria-label={t('shell.settings.themeLabel')}>
					<button className={!settings.theme ? styles.selected : ''} onClick={() => setTheme()}>
						{t('shell.settings.themeSystem')}
					</button>
					<button className={settings.theme === 'light' ? styles.selected : ''} onClick={() => setTheme('light')}>
						<FiSun aria-hidden='true' /> {t('shell.settings.themeLight')}
					</button>
					<button className={settings.theme === 'dark' ? styles.selected : ''} onClick={() => setTheme('dark')}>
						<FiMoon aria-hidden='true' /> {t('shell.settings.themeDark')}
					</button>
				</div>

				<label className={styles.settingRow}>
					<span>
						<strong>{t('shell.settings.reduceMotion')}</strong>
						<small>{t('shell.settings.reduceMotionDescription')}</small>
					</span>
					<input
						type='checkbox'
						checked={!settings.isAnimationsEnabled}
						onChange={() => settingsDispatch({
							type: 'updateSettings',
							payload: { isAnimationsEnabled: !settings.isAnimationsEnabled },
						})}
					/>
				</label>
			</ShellSection>

			<ShellSection title={t('shell.settings.appTitle')} description={t('shell.settings.appDescription')}>
				<div className={styles.appFacts}>
					<p><FiDownload aria-hidden='true' /><span><strong>{t('shell.settings.installTitle')}</strong><small>{pwaStatusDescription}</small></span></p>
					<p>{update.online ? <FiWifi aria-hidden='true' /> : <FiWifiOff aria-hidden='true' />}<span><strong>{t('shell.settings.offlineTitle')}</strong><small>{offlineDescription}</small></span></p>
					<p><FiRefreshCw aria-hidden='true' /><span><strong>{t('shell.settings.updateTitle')}</strong><small>{updateDescription}</small></span></p>
				</div>
				<div className={styles.appActions}>
					<button onClick={install} disabled={state === 'INSTALLED'}>
						<FiDownload aria-hidden='true' />
						{state === 'INSTALLED' ? t('shell.settings.installed') : t('shell.settings.installAction')}
					</button>
					<button
						className={update.state.kind === 'available' ? styles.primaryAction : ''}
						disabled={!update.online || update.state.kind === 'checking' || update.state.kind === 'blocked' || update.state.kind === 'applying'}
						onClick={() => void (update.state.kind === 'available' ? update.applyUpdate() : update.checkForUpdate())}
					>
						<FiRefreshCw aria-hidden='true' />
						{update.state.kind === 'available' ? t('shell.pwa.updateNow') : update.state.kind === 'failed' ? t('shell.pwa.retry') : t('shell.settings.checkUpdate')}
					</button>
				</div>
				{iosDevice && (state === 'IOS_MANUAL' || state === 'INSTALLED') && (
					<Link className={styles.iosTransferNotice} to={APP_ROUTES.DATA_MANAGEMENT}>
						<FiHardDrive aria-hidden='true' />
						<span>{t(state === 'IOS_MANUAL'
							? 'shell.settings.iosStorageBeforeInstall'
							: 'shell.settings.iosStorageAfterInstall')}</span>
					</Link>
				)}
				<p className={styles.version}>{update.buildId === update.currentVersion
					? t('shell.settings.version', { version: update.currentVersion })
					: t('shell.settings.buildVersion', { version: update.currentVersion, build: update.buildId })}</p>
			</ShellSection>

			<ShellSection
				title={t('shell.settings.dataTitle')}
				description={t('shell.settings.dataDescription')}
			>
				<Link className={styles.notice} to={APP_ROUTES.DATA_MANAGEMENT}>
					<FiHardDrive aria-hidden='true' />
					<span>{t('shell.settings.dataAction')}</span>
				</Link>
			</ShellSection>

			<ShellSection title={t('shell.settings.openSourceTitle')}>
				{PROJECT_SOURCE.status === 'available' ? (
					<a className={styles.linkRow} href={PROJECT_SOURCE.url} target='_blank' rel='noreferrer'>
						<FiGithub aria-hidden='true' />
						<span><strong>{t('shell.settings.projectSourceCode')}</strong></span>
						<FiExternalLink aria-hidden='true' />
					</a>
				) : (
					<div className={styles.linkRow}>
						<FiGithub aria-hidden='true' />
						<span>
							<strong>{t('shell.settings.projectSourceCode')}</strong>
							<small>{t('shell.settings.projectSourcePending')}</small>
						</span>
					</div>
				)}
				<a className={styles.linkRow} href={UPSTREAM_SOURCE_URL} target='_blank' rel='noreferrer'>
					<FiGithub aria-hidden='true' />
					<span>
						<strong>{t('shell.settings.upstreamSourceCode')}</strong>
						<small>{t('shell.settings.license')}</small>
					</span>
					<FiExternalLink aria-hidden='true' />
				</a>
			</ShellSection>
		</div>
	);
}

export { SettingsPage };
