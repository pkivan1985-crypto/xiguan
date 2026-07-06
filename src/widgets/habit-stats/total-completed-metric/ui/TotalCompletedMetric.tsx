import styles from './TotalCompletedMetric.module.css';
import { useTranslation } from 'react-i18next';
import { FaHashtag } from 'react-icons/fa';
import { type CompletedDay } from '@entities/habit';
import { Card } from '@shared/ui';

interface Props {
	days: CompletedDay[];
}

const BG = '#99d3ff20';

/**
 * Displays the total number of completions for a habit over a selected period.
 */
function TotalCompletedMetric({ days }: Props) {
	const { t } = useTranslation();

	return (
		<Card
			title={t('habits.stats.totalCompletedTitle')}
			description={t('habits.stats.totalCompletedDesc')}
			badgeIcon={<FaHashtag />}
			badgeColors={{
				bg: BG,
				color: '#3d97dc'
			}}
			style={{ backgroundColor: BG }}
		>
			<div className={styles.content}>
				{days.length}
			</div>
		</Card>
	);
}

export { TotalCompletedMetric };