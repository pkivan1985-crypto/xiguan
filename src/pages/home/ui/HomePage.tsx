import styles from './HomePage.module.css';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { FiArrowRight, FiCalendar, FiTarget } from 'react-icons/fi';
import { APP_ROUTES } from '@shared/config';
import { ShellSection } from '@shared/ui';

function HomePage() {
	const { t } = useTranslation();

	return (
		<div className={styles.page}>
			<section className={styles.scene}>
				<div className={styles.sceneTrail} aria-hidden='true'>
					<span />
					<span />
					<span />
				</div>
				<p className={styles.eyebrow}>{t('shell.home.eyebrow')}</p>
				<h2>{t('shell.home.sceneTitle')}</h2>
				<p>{t('shell.home.sceneDescription')}</p>
			</section>

			<Link className={styles.primaryAction} to={APP_ROUTES.TODAY}>
				<span className={styles.actionCopy}>
					<strong>{t('shell.home.todayAction')}</strong>
					<small>{t('shell.home.todayActionDescription')}</small>
				</span>
				<FiArrowRight aria-hidden='true' />
			</Link>

			<div className={styles.grid}>
				<ShellSection
					title={t('shell.home.goalsTitle')}
					description={t('shell.home.goalsDescription')}
				>
					<FiTarget className={styles.sectionIcon} aria-hidden='true' />
				</ShellSection>

				<ShellSection
					title={t('shell.home.calendarTitle')}
					description={t('shell.home.calendarDescription')}
				>
					<FiCalendar className={styles.sectionIcon} aria-hidden='true' />
				</ShellSection>
			</div>
		</div>
	);
}

export { HomePage };
