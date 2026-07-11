import styles from './TodayPage.module.css';
import { useTranslation } from 'react-i18next';
import { ShellSection } from '@shared/ui';

function TodayPage() {
	const { t } = useTranslation();

	return (
		<div className={styles.page}>
			<section className={styles.viewport}>
				<span className={styles.status}>{t('shell.common.shellStage')}</span>
				<h2>{t('shell.today.viewportTitle')}</h2>
				<p>{t('shell.today.viewportDescription')}</p>
			</section>

			<ShellSection
				title={t('shell.today.slotsTitle')}
				description={t('shell.today.slotsDescription')}
			>
				<div className={styles.slots} aria-label={t('shell.today.slotsLabel')}>
					{Array.from({ length: 6 }, (_, index) => (
						<div className={styles.slot} key={index}>
							<span>{index + 1}</span>
						</div>
					))}
				</div>
			</ShellSection>
		</div>
	);
}

export { TodayPage };
