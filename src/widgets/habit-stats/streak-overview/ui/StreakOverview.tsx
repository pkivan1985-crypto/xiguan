import styles from './StreakOverview.module.css';
import { useTranslation } from 'react-i18next';
import { FaAward } from 'react-icons/fa';
import { FaFire } from 'react-icons/fa';
import { Card } from '@shared/ui';

interface StreakOverviewProps {
	currentStreak: number;
	longestStreak: number;
}

const CURRENT_BG = '#ffb69c20';
const LONGEST_BG = '#ffe59920';

/**
 * Displays a summary card group showing current and longest habit streaks.
 */
function StreakOverview(props: StreakOverviewProps) {
	const {
		currentStreak,
		longestStreak,
	} = props;

	const { t } = useTranslation();

	return (
		<div className={styles.wrapper}>
			<Card
				title={t('habits.stats.currentStreak')}
				description={t('habits.stats.streak')}
				badgeIcon={<FaFire />}
				badgeColors={{
					bg: CURRENT_BG,
					color: '#ed602c'
				}}
				style={{ backgroundColor: CURRENT_BG }}
			>
				<div className={styles.content}>
					{currentStreak}
				</div>
			</Card>

			<Card
				title={t('habits.stats.longestStreak')}
				description={t('habits.stats.streak')}
				badgeIcon={<FaAward />}
				badgeColors={{
					bg: LONGEST_BG,
					color: '#e6b41d'
				}}
				style={{ backgroundColor: LONGEST_BG }}
			>
				<div className={styles.content}>
					{longestStreak}
				</div>
			</Card>
		</div>
	);
}

export { StreakOverview };