/* eslint-disable i18next/no-literal-string -- Value sources are stable domain identifiers, not user-facing copy. */
import type { DailyHabitView } from '@features/load-daily-habits';

export type RunningRecordValueSource = 'current' | 'previous' | 'plan' | 'blank';

export interface RunningRecordInitialValues {
	distance: string;
	source: RunningRecordValueSource;
}

export interface RunningTrainingDetails {
	duration: string;
	pace: string;
	heartRate: string;
}

export function plannedRunningDistance(habit: DailyHabitView): string {
	const fixed = (habit.dailyTargetBase / habit.basePerDisplayUnit).toFixed(Math.max(2, habit.maxDecimalPlaces));
	const [whole, decimal = ''] = fixed.split('.');
	return `${whole}.${decimal.replace(/0+$/, '').padEnd(2, '0')}`;
}

function formatPace(totalSeconds?: number): string {
	if (!totalSeconds) {
		return '';
	}

	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function initialRunningRecordValues(habit: DailyHabitView): RunningRecordInitialValues {
	if (habit.recordedToday && habit.quantityBaseValue > 0) {
		return { distance: habit.displayValue, source: 'current' };
	}

	if (!habit.scheduledToday) {
		return { distance: '', source: 'blank' };
	}

	if (habit.previousRecord) {
		return { distance: habit.previousRecord.displayValue, source: 'previous' };
	}

	return {
		distance: plannedRunningDistance(habit),
		source: 'plan',
	};
}

export function previousTrainingDetails(habit: DailyHabitView): RunningTrainingDetails {
	return {
		duration: habit.previousRecord?.durationSeconds
			? String(habit.previousRecord.durationSeconds / 60)
			: '',
		pace: formatPace(habit.previousRecord?.averagePaceSecondsPerKm),
		heartRate: habit.previousRecord?.averageHeartRateBpm
			? String(habit.previousRecord.averageHeartRateBpm)
			: '',
	};
}

export function currentTrainingDetails(habit: DailyHabitView): RunningTrainingDetails {
	return {
		duration: habit.durationSeconds ? String(habit.durationSeconds / 60) : '',
		pace: formatPace(habit.averagePaceSecondsPerKm),
		heartRate: habit.averageHeartRateBpm ? String(habit.averageHeartRateBpm) : '',
	};
}
