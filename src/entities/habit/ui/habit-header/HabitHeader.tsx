import styles from './HabitHeader.module.css';
import { type ReactNode } from 'react';
import { FaFire } from 'react-icons/fa';
import { type Habit, HABIT_ICONS_MAP } from '@entities/habit';

interface HabitHeaderProps {
	habit: Habit;
	action?: ReactNode;
	currentStreak?: number;
}

function HabitHeader(props: HabitHeaderProps) {
	const {
		habit,
		action,
		currentStreak,
	} = props;

	// Get icon by title or use default fallback
	const Icon = HABIT_ICONS_MAP[habit.iconTitle]?.icon
		?? HABIT_ICONS_MAP['default']?.icon;

	return (
		<div className={styles.header}>
			<div className={styles.iconWrapper}>
				{Icon && <Icon />}
			</div>

			<div className={styles.titleWrapper} >
				<h4 className={styles.title}>
					{habit.title}
				</h4>

				{currentStreak !== undefined && (
					<div className={styles.description}>
						<div
							style={{
								backgroundColor: 'var(--habit-color-dark)',
								color: 'var(--habit-color-base)'
							}}
							className={styles.badge}
						>
							<FaFire size={14} />

							<small>
								{currentStreak}
							</small>
						</div>
					</div>
				)}
			</div>

			<div
				className={styles.actionWrapper}
				onClick={(e) => e.stopPropagation()}
				onPointerDownCapture={((e) => e.stopPropagation())}
			>
				{action}
			</div>
		</div>
	);
}

export default HabitHeader;