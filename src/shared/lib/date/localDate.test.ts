import { describe, expect, it } from 'vitest';

import { formatLocalDate, parseLocalDate } from './localDate';

describe('localDate', () => {
	it('formats the local calendar date without UTC truncation', () => {
		const localLateNight = new Date(2026, 0, 2, 23, 30, 0);

		expect(formatLocalDate(localLateNight)).toBe('2026-01-02');
	});

	it('formats month-end dates with zero padding', () => {
		expect(formatLocalDate(new Date(2026, 1, 28, 12, 0, 0))).toBe('2026-02-28');
	});

	it.each(['', '2026-2-01', '2026-02-30', '2026-13-01', '2026-01-01T00:00:00Z'])(
		'rejects invalid local date %j',
		(value) => expect(() => parseLocalDate(value)).toThrow('INVALID_LOCAL_DATE'),
	);
});
