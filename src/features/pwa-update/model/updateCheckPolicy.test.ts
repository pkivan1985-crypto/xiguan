import { describe, expect, it } from 'vitest';
import { AUTOMATIC_CHECK_MIN_INTERVAL_MS, shouldCheckForUpdate } from './updateCheckPolicy';

describe('shouldCheckForUpdate', () => {
	it('never checks while offline, including manual requests', () => {
		expect(shouldCheckForUpdate({ online: false, now: 50_000, manual: true })).toBe(false);
	});

	it('allows every online manual request', () => {
		expect(shouldCheckForUpdate({ online: true, now: 5_000, lastCheckedAt: 4_999, manual: true })).toBe(true);
	});

	it('deduplicates automatic checks inside the interval', () => {
		expect(shouldCheckForUpdate({ online: true, now: 5_000, lastCheckedAt: 4_500 })).toBe(false);
		expect(shouldCheckForUpdate({
			online: true,
			now: AUTOMATIC_CHECK_MIN_INTERVAL_MS,
			lastCheckedAt: 0,
		})).toBe(true);
	});

	it('allows the first automatic check', () => {
		expect(shouldCheckForUpdate({ online: true, now: 0 })).toBe(true);
	});
});
