import { describe, expect, it } from 'vitest';
import { appShellTitleKey, hasPageOwnedHeader } from './appShellRoute';

describe('app shell route titles', () => {
	it('keeps nested settings pages under the settings title', () => {
		expect(appShellTitleKey('/settings')).toBe('shell.nav.settings');
		expect(appShellTitleKey('/settings/data')).toBe('shell.nav.settings');
	});

	it('maps the three primary destinations to today, progress, and habits', () => {
		expect(appShellTitleKey('/')).toBe('shell.nav.today');
		expect(appShellTitleKey('/progress')).toBe('shell.nav.progress');
		expect(appShellTitleKey('/deck')).toBe('shell.nav.habits');
	});

	it('leaves primary route titles to their page-owned headers only', () => {
		expect(hasPageOwnedHeader('/')).toBe(true);
		expect(hasPageOwnedHeader('/progress')).toBe(true);
		expect(hasPageOwnedHeader('/deck')).toBe(true);
		expect(hasPageOwnedHeader('/settings')).toBe(false);
		expect(hasPageOwnedHeader('/settings/data')).toBe(false);
	});
});
