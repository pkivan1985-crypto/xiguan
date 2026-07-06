import styles from './StreakHistory.module.css';
import { useState } from 'react';
import { FaBinoculars } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import StreakItem from './streak-item/StreakItem';
import { type Streak } from '@shared/model';
import { Button, Card } from '@shared/ui';

interface StreakHistoryProps {
	streaks: Streak[];
}

const BG = '#99ffc720';

/**
 * Renders a list of habit streaks recorded over a specific period.
 */
function StreakHistory({ streaks }: StreakHistoryProps) {
	const { t } = useTranslation();
	const [listLength, setListLength] = useState(5);
	const streakList = streaks.slice(0, listLength);

	// 1. Handle empty state
	if (streakList.length === 0) {
		return null;
	}

	// 2. Render list
	return (
		<Card
			title={t('habits.stats.streakHistoryTitle')}
			description={t('habits.stats.streakHistoryDesc')}
			badgeIcon={<FaBinoculars />}
			badgeColors={{
				bg: BG,
				color: '#3cb371',
			}}
			style={{ backgroundColor: BG }}
		>
			<div className={styles.history}>
				<ul className={styles.list}>
					{streakList.map((s) => (
						<li key={s.length + s.start + s.end}>
							<StreakItem streak={s} />
						</li>
					))}
				</ul>

				{listLength < streaks.length && (
					<div className={styles.buttonWrapper}>
						<Button
							variant='text'
							onClick={() => setListLength((curr) => curr + 5)}
						>
							{t('common.showMore')}
						</Button>
					</div>
				)}
			</div>
		</Card>
	);
}

export { StreakHistory };