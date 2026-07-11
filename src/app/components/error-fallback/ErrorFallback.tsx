import { getErrorMessage } from 'react-error-boundary';
import { useTranslation } from 'react-i18next';
import styles from './ErrorFallback.module.css';

interface ErrorFallbackProps {
	error: unknown;
}

/**
 * Error fallback for the whole app.
 * Provides options to reload or clear data.
 */
function ErrorFallback({ error }: ErrorFallbackProps) {
	const { t } = useTranslation();

	const handleReload = () => {
		window.location.href = import.meta.env.BASE_URL;
	};

	return (
		<main className={styles.page}>
			<div className={styles.card}>
				<span className={styles.marker}>!</span>
				<h1>{t('shell.error.title')}</h1>
				<p>{t('shell.error.description')}</p>
				<div className={styles.actions}>
					<button onClick={handleReload}>{t('shell.error.reload')}</button>
					<button className={styles.secondary} onClick={() => alert(getErrorMessage(error))}>
						{t('shell.error.details')}
					</button>
				</div>
				<small>{t('shell.error.dataNotice')}</small>
			</div>
		</main>
	);
}

export default ErrorFallback;
