import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { PwaStatusBarViewValue } from './PwaStatusBar';
import { PwaStatusBarView } from './PwaStatusBar';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

const available: PwaStatusBarViewValue = {
	state: { kind: 'available' },
	online: true,
	dismissed: false,
	onDismiss: () => undefined,
	onApply: async () => undefined,
	onRetry: async () => undefined,
};

describe('PwaStatusBarView', () => {
	it('renders separated later and update actions in a polite live region', () => {
		const html = renderToStaticMarkup(<PwaStatusBarView value={available} />);
		expect(html).toContain('aria-live="polite"');
		expect(html).toContain('shell.pwa.later');
		expect(html).toContain('shell.pwa.updateNow');
		expect(html.match(/<button/g)).toHaveLength(2);
	});

	it('disables update while a critical operation is active', () => {
		const html = renderToStaticMarkup(<PwaStatusBarView value={{
			...available,
			state: { kind: 'blocked', operation: 'restore-backup' },
		}} />);
		expect(html).toContain('disabled');
		expect(html).toContain('shell.pwa.blocked.restore-backup');
	});

	it('shows retry only for an online failure and prioritizes offline status', () => {
		const online = renderToStaticMarkup(<PwaStatusBarView value={{
			...available,
			state: { kind: 'failed', reason: 'apply' },
		}} />);
		expect(online).toContain('shell.pwa.retry');

		const offline = renderToStaticMarkup(<PwaStatusBarView value={{
			...available,
			online: false,
			state: { kind: 'failed', reason: 'check' },
		}} />);
		expect(offline).toContain('shell.pwa.offlineTitle');
		expect(offline).not.toContain('shell.pwa.retry');
	});

	it('renders nothing when an available notice was dismissed', () => {
		expect(renderToStaticMarkup(<PwaStatusBarView value={{ ...available, dismissed: true }} />)).toBe('');
	});
});
