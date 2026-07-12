import { describe, expect, it } from 'vitest';
import { APP_BUILD_ID, APP_VERSION } from './version';

describe('application version config', () => {
	it('uses package version and always exposes a non-empty build ID', () => {
		expect(APP_VERSION).toBe('0.50.0');
		expect(APP_BUILD_ID.trim()).not.toBe('');
	});
});
