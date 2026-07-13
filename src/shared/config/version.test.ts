import { describe, expect, it } from 'vitest';
import lock from '../../../package-lock.json';
import pkg from '../../../package.json';
import { APP_BUILD_ID, APP_VERSION } from './version';

describe('application version config', () => {
	it('uses package version and always exposes a non-empty build ID', () => {
		expect(APP_VERSION).toBe('3.0.0-rc.3');
		expect(APP_BUILD_ID.trim()).not.toBe('');
	});

	it('keeps package and lockfile release identity aligned without making the package public', () => {
		expect(pkg.private).toBe(true);
		expect(lock.version).toBe(pkg.version);
		expect(lock.packages[''].version).toBe(pkg.version);
	});
});
