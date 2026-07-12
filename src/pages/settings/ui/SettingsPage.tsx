import styles from './SettingsPage.module.css';
import { useTranslation } from 'react-i18next';
import { FiDownload, FiExternalLink, FiGithub, FiHardDrive, FiMoon, FiSun } from 'react-icons/fi';
import { Link } from 'react-router';
import pkg from '../../../../package.json';
import { useSettingsStore } from '@entities/settings';
import { usePwaInstall } from '@features/pwa-install';
import { ShellSection } from '@shared/ui';
import { APP_ROUTES } from '@shared/config';

const UPSTREAM_SOURCE_URL = 'https://github.com/iNikAnn/DoHabit';

function SettingsPage() {
	const { t } = useTranslation();
	const settings = useSettingsStore((state) => state.settings);
	const settingsDispatch = useSettingsStore((state) => state.settingsDispatch);
	const { state, install } = usePwaInstall();
	const pwaStatusDescription = state === 'INSTALLED'
		? t('shell.settings.pwaStatus.INSTALLED')
		: state === 'CAN_PROMPT'
			? t('shell.settings.pwaStatus.CAN_INSTALL')
			: state === 'IOS_MANUAL'
				? t('shell.settings.pwaStatus.IOS_MANUAL')
				: t('shell.settings.pwaStatus.BROWSER_ONLY');

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

			<ShellSection
				title={t('shell.settings.installTitle')}
				description={pwaStatusDescription}
			>
				<button className={styles.actionButton} onClick={install} disabled={state === 'INSTALLED'}>
					<FiDownload aria-hidden='true' />
					{state === 'INSTALLED' ? t('shell.settings.installed') : t('shell.settings.installAction')}
				</button>
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
				<a className={styles.linkRow} href={UPSTREAM_SOURCE_URL} target='_blank' rel='noreferrer'>
					<FiGithub aria-hidden='true' />
					<span>
						<strong>{t('shell.settings.sourceCode')}</strong>
						<small>{t('shell.settings.license')}</small>
					</span>
					<FiExternalLink aria-hidden='true' />
				</a>
				<p className={styles.pending}>{t('shell.settings.projectSourcePending')}</p>
				<p className={styles.version}>{t('shell.settings.version', { version: pkg.version })}</p>
			</ShellSection>
		</div>
	);
}

export { SettingsPage };
