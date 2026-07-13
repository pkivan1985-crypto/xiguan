import styles from './WelcomeView.module.css';
import { type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { FaLock, FaPlane, FaShieldAlt } from 'react-icons/fa';
import { FaBoltLightning } from 'react-icons/fa6';
import { usePwaInstall } from '@features/pwa-install';
import { useSettingsStore } from '@entities/settings';
import { APP_NAME } from '@shared/config';
import { Button } from '@shared/ui';

const BASE_URL = import.meta.env.BASE_URL;

function WelcomeView() {
	// UI localization
	const { t } = useTranslation();

	// Handle PWA installation trigger
	const { state, install } = usePwaInstall();

	// Global stores
	const settingsDispatch = useSettingsStore((s) => s.settingsDispatch);

	/**
	 * Mark welcome screen as completed and proceed to the application.
	 */
	const handleContinue = () => {
		settingsDispatch({
			type: 'updateSettings',
			payload: { hasSeenWelcome: true }
		});
	};

	const benefits: {
		icon: ReactNode;
		title: string;
		description: string;
	}[] = [
			{
				icon: <FaShieldAlt color='#10B981' />,
				title: t('welcome.benefits.privacy.title'),
				description: t('welcome.benefits.privacy.desc')
			},
			{
				icon: <FaLock color='#3B82F6' />,
				title: t('welcome.benefits.secure.title'),
				description: t('welcome.benefits.secure.desc')
			},
			{
				icon: <FaPlane color='#F59E0B' />,
				title: t('welcome.benefits.offline.title'),
				description: t('welcome.benefits.offline.desc')
			},
			{
				icon: <FaBoltLightning color='#8B5CF6' />,
				title: t('welcome.benefits.simplicity.title'),
				description: t('welcome.benefits.simplicity.desc')
			}
		];

	return (
		<section className={styles.page}>
			<div className={styles.contentWrapper}>

				{/* Left side */}
				<div className={styles.textColumn}>
					<div className={styles.logoWrapper}>
						<img
							src={`${BASE_URL}favicon.svg`}
							alt={t('common.logo')}
							className={styles.logoImg}
						/>

						<h2>{APP_NAME}</h2>
					</div>

					<h1 className={styles.title}>
						<div>
							{t('welcome.titleLine1')}
						</div>

						<div>
							{t('welcome.titleLine2')}
						</div>
					</h1>

					<p className={styles.description}>
						{t('welcome.description')}
					</p>

					<ul className={styles.benefitsList}>
						{benefits.map((b) => (
							<li key={b.title} className={styles.benefitItem}>
								{b.icon}

								<div>
									<strong className={styles.benefitTitle}>
										{b.title}
									</strong>

									<small className={styles.benefitDescription}>
										{b.description}
									</small>
								</div>
							</li>
						))}
					</ul>

					<div className={styles.actions}>
						<Button onClick={state === 'INSTALLED' ? handleContinue : install}>
							{state === 'INSTALLED'
								? t('common.continue')
								: t('welcome.actions.install')}
						</Button>

						{state !== 'INSTALLED' && (
							<Button
								variant='text'
								style={{
									color: 'var(--color-secondary)',
									height: '36px'
								}}
								onClick={handleContinue}
							>
								{t('welcome.actions.continue')}
							</Button>
						)}
					</div>
				</div>

			</div>
		</section>
	);
}

export { WelcomeView };
