import { describe, expect, it } from 'vitest';

import { buildWeekDays } from './buildWeekDays';

describe('buildWeekDays', () => {
	it('builds a Monday-first week around the selected local date', () => {
		expect(buildWeekDays('2026-07-25').map(({ localDate }) => localDate)).toEqual([
			'2026-07-20',
			'2026-07-21',
			'2026-07-22',
			'2026-07-23',
			'2026-07-24',
			'2026-07-25',
			'2026-07-26',
		]);
	});
});
