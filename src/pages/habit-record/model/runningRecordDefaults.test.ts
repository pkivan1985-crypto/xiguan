import { describe, expect, it } from 'vitest';

import type { DailyHabitView } from '@features/load-daily-habits';

import { currentTrainingDetails, initialRunningRecordValues, plannedRunningDistance, previousTrainingDetails } from './runningRecordDefaults';

function runningHabit(overrides: Partial<DailyHabitView> = {}): DailyHabitView {
	return {
		id: 'run',
		title: 'Morning run',
		trackingType: 'quantity',
		iconKey: 'activity',
		accent: 'green',
		quantityBaseValue: 0,
		displayValue: '0.00',
		displayUnit: 'km',
		stepBase: 500,
		basePerDisplayUnit: 1_000,
		maxDecimalPlaces: 2,
		baseDailyTargetBase: 3_600,
		dailyTargetBase: 3_600,
		carryInBaseValue: 0,
		totalQuantityBaseValue: 12_000,
		activeDays: 4,
		supportsTrainingDetails: true,
		officialCardId: 'running',
		scheduledToday: true,
		recordedToday: false,
		...overrides,
	};
}

describe('initialRunningRecordValues', () => {
	it.each([
		{
			name: 'keeps the selected-date record when one already exists',
			habit: runningHabit({ quantityBaseValue: 4_750, displayValue: '4.75', recordedToday: true }),
			want: { distance: '4.75', source: 'current' },
		},
		{
			name: 'reuses the nearest previous distance on a scheduled day',
			habit: runningHabit({ previousRecord: { quantityBaseValue: 4_200, displayValue: '4.20' } }),
			want: { distance: '4.20', source: 'previous' },
		},
		{
			name: 'falls back to the planned distance when no previous record exists',
			habit: runningHabit(),
			want: { distance: '3.60', source: 'plan' },
		},
		{
			name: 'starts blank on an unscheduled rest day',
			habit: runningHabit({ scheduledToday: false, previousRecord: { quantityBaseValue: 4_200, displayValue: '4.20' } }),
			want: { distance: '', source: 'blank' },
		},
	])('$name', ({ habit, want }) => {
		expect(initialRunningRecordValues(habit)).toEqual(want);
	});
});

describe('plannedRunningDistance', () => {
	it.each([
		{ base: 1_000, decimals: 3, want: '1.00' },
		{ base: 3_600, decimals: 3, want: '3.60' },
		{ base: 3_334, decimals: 3, want: '3.334' },
	])('keeps two useful decimals without showing needless zeros for $base', ({ base, decimals, want }) => {
		expect(plannedRunningDistance(runningHabit({ dailyTargetBase: base, maxDecimalPlaces: decimals }))).toBe(want);
	});
});

describe('previousTrainingDetails', () => {
	it('formats previous optional metrics separately so they require an explicit reuse action', () => {
		expect(previousTrainingDetails(runningHabit({
			previousRecord: {
				quantityBaseValue: 4_200,
				displayValue: '4.20',
				durationSeconds: 1_680,
				averagePaceSecondsPerKm: 400,
				averageHeartRateBpm: 152,
			},
		}))).toEqual({ duration: '28', pace: '06:40', heartRate: '152' });
	});

	it('returns blank optional metrics when there is no reusable history', () => {
		expect(previousTrainingDetails(runningHabit())).toEqual({ duration: '', pace: '', heartRate: '' });
	});
});

describe('currentTrainingDetails', () => {
	it('restores all saved optional metrics when editing the selected-date record', () => {
		expect(currentTrainingDetails(runningHabit({
			durationSeconds: 1_710,
			averagePaceSecondsPerKm: 405,
			averageHeartRateBpm: 149,
		}))).toEqual({ duration: '28.5', pace: '06:45', heartRate: '149' });
	});
});
