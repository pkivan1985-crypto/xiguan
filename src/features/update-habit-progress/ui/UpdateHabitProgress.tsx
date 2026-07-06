import styles from './UpdateHabitProgress.module.css';
import 'react-circular-progressbar/dist/styles.css';
import clsx from 'clsx';
import { useEffect, useState } from 'react';
import { CircularProgressbarWithChildren, buildStyles } from 'react-circular-progressbar';
import { useLongPress } from '@uidotdev/usehooks';
import { FaCheck } from 'react-icons/fa';
import RadialSeparators from './radial-separators/RadialSeparators';
import { type Habit, useHabitsStore, getTodayProgress } from '@entities/habit';
import { Button } from '@shared/ui';

interface Props {
	habit: Habit;
}

/**
 * Updates progress for a specific habit.
 * Manages click animations, haptic feedback, and progress visualization.
 */
function UpdateHabitProgress({ habit }: Props) {
	const {
		id,
		frequency
	} = habit;

	// Local state for trigger-based animations
	const [animation, setAnimation] = useState<'completed' | 'updated' | null>(null);

	const habitsDispatch = useHabitsStore((s) => s.habitsDispatch);

	// Current day stats from the domain helper
	const { progress, percentage, isCompleted } = getTodayProgress(habit);

	const handleUpdateProgress = (isLongPress?: boolean) => {
		// Trigger visual feedback
		const isFinalStep = habit.frequency - progress === 1;
		setAnimation((isFinalStep || isLongPress) ? 'completed' : 'updated');

		// Haptic feedback
		try {
			navigator?.vibrate(isFinalStep ? [10, 10, 10, 10, 10] : 10);
		} catch (e) {
			console.warn('Vibration not supported or failed.', e);
		}

		// Prevent updating already completed habits via long press
		if (isLongPress && habit.frequency === progress) return;

		habitsDispatch({
			type: 'updateProgress',
			payload: { habitId: id, isLongPress }
		});
	};

	const attrs = useLongPress(() => handleUpdateProgress(true), { threshold: 300 });

	// Cleanup animation classes after they finish playing
	useEffect(() => {
		if (!animation) return;

		const timer = setTimeout(() => setAnimation(null), 200);
		return () => clearTimeout(timer);
	}, [animation]);

	return (
		<div
			className={clsx(
				styles.wrapper,
				animation === 'completed' && styles.completed,
				animation === 'updated' && styles.updated
			)}
		>
			<Button
				style={{
					backgroundColor: isCompleted
						? 'var(--habit-color-base)'
						: 'var(--habit-color-dark)'
				}}
				className={styles.button}
				{...attrs}
				onClick={() => handleUpdateProgress()}
			>
				{/* Render check for completed habits */}
				{isCompleted && (
					<FaCheck color="var(--color-primary)" />
				)}

				{/* Render faint check for uncompleted single-step habits */}
				{(!isCompleted && frequency === 1) && (
					<FaCheck color="var(--habit-color-soft)" />
				)}

				{/* Render progress bar for active multi-step habits */}
				{(!isCompleted && frequency > 1) && (
					<CircularProgressbarWithChildren
						value={percentage}
						strokeWidth={18}
						styles={{
							...buildStyles({
								strokeLinecap: 'butt',
								pathColor: 'var(--habit-color-base)',
								trailColor: 'var(--habit-color-soft)',
								textColor: 'var(--color-primary)',
							}),
							root: {
								width: '36px',
								height: '36px'
							}
						}}
					>
						<RadialSeparators
							count={frequency}
							style={{
								background: 'var(--habit-color-dark)',
								width: '2px',
								// This needs to be equal to props.strokeWidth
								height: `${18}%`
							}}
						/>
					</CircularProgressbarWithChildren>
				)}
			</Button>
		</div>
	);
}

export { UpdateHabitProgress };