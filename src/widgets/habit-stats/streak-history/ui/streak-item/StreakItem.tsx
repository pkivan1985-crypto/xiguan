import styles from './StreakItem.module.css';
import clsx from 'clsx';
import type { Streak } from '@shared/model';

interface StreakItemProps {
	streak: Streak;
}

function StreakItem({ streak }: StreakItemProps) {
	return (
		<div className={styles.card}>
			<div className={styles.left}>
				{streak.length}
			</div>

			<div className={styles.right}>
				<div className={clsx(styles.date, styles.start)}>
					<div className={clsx(styles.label, styles.start)} />
					{new Date(streak.start).toLocaleDateString()}
				</div>

				<div className={clsx(styles.date, styles.end)}>
					<div className={clsx(styles.label, styles.end)} />
					{new Date(streak.end).toLocaleDateString()}
				</div>
			</div>
		</div>
	);
}

export default StreakItem;