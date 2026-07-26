import { describe, expect, it } from 'vitest';

import { countScheduledDays, distributeEvenStages, isoWeekday, projectedCustomTotal } from './planHabit';

describe('habit planning helpers', () => {
	it('uses ISO weekdays and counts only selected execution days', () => {
		expect(isoWeekday('2026-07-27')).toBe(1);
		expect(isoWeekday('2026-08-02')).toBe(7);
		expect(countScheduledDays('2026-07-27', '2026-08-02', [1, 3, 5])).toBe(3);
	});

	it('splits the long-term target and date range without losing the remainder', () => {
		const stages = distributeEvenStages({
			totalDisplay: 10,
			startDate: '2026-07-27',
			endDate: '2026-08-05',
			stageCount: 3,
			weekdays: [1, 2, 3, 4, 5, 6, 7],
			maxDecimalPlaces: 3,
		});

		expect(stages).toHaveLength(3);
		expect(stages.map(({ targetDisplay }) => Number(targetDisplay)).reduce((sum, value) => sum + value, 0)).toBe(10);
		expect(stages[0]).toMatchObject({ startDate: '2026-07-27', endDate: '2026-07-29' });
		expect(stages[2]).toMatchObject({ startDate: '2026-08-02', endDate: '2026-08-05' });
	});

	it('projects a custom weekly plan over the long-term period', () => {
		expect(projectedCustomTotal({
			startDate: '2026-07-27',
			endDate: '2026-08-02',
			targetsByWeekday: { 1: 2, 3: 3, 5: 4 },
		})).toBe(9);
	});
});
