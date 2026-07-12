import { describe, expect, it } from 'vitest';
import { appShellTitleKey } from './appShellRoute';

describe('app shell route titles', () => {
	it('keeps nested settings pages under the settings title', () => {
		expect(appShellTitleKey('/settings')).toBe('shell.nav.settings');
		expect(appShellTitleKey('/settings/data')).toBe('shell.nav.settings');
	});
});
