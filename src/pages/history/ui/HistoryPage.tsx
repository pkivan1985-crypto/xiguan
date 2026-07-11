import styles from './HistoryPage.module.css';
import { useTranslation } from 'react-i18next';
import { FiClock } from 'react-icons/fi';

function HistoryPage() {
	const { t } = useTranslation();

	return (
		<section className={styles.empty}>
			<div className={styles.icon}><FiClock aria-hidden='true' /></div>
			<h2>{t('shell.history.emptyTitle')}</h2>
			<p>{t('shell.history.emptyDescription')}</p>
			<span>{t('shell.common.noFakeData')}</span>
		</section>
	);
}

export { HistoryPage };
