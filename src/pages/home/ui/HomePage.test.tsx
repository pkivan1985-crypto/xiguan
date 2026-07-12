import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router';

import { HomeDashboardContent, HomePage } from './HomePage';
import { homeErrorKey } from '../model/homePage';
import type { HomeDashboardModel } from '@features/load-home-dashboard';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@features/load-home-dashboard', async (importOriginal) => ({
	...await importOriginal<typeof import('@features/load-home-dashboard')>(),
	loadHomeDashboardInApp: vi.fn(() => new Promise(() => undefined)),
}));

const freshModel: HomeDashboardModel = {
	hasCards: false,
	goalSummaries: [],
	outcomeDates: [],
	outcomeDayCount: 0,
	year: 2026,
	monthIndex: 6,
};

describe('HomePage', () => {
	it('renders a truthful loading state before IndexedDB readback', () => {
		expect(renderToStaticMarkup(<HomePage />)).toContain('shell.home.loading');
	});

	it('orders scene, primary action, goals, then compact calendar', () => {
		const html = renderToStaticMarkup(<MemoryRouter><HomeDashboardContent
			model={freshModel}
			todayLocalDate='2026-07-12'
			onPreviousMonth={() => undefined}
			onNextMonth={() => undefined}
			canGoNext={false}
		/></MemoryRouter>);

		expect(html.indexOf('shell.home.sceneTitle')).toBeLessThan(html.indexOf('shell.home.createFirstCard'));
		expect(html.indexOf('shell.home.createFirstCard')).toBeLessThan(html.indexOf('shell.home.goalsTitle'));
		expect(html.indexOf('shell.home.goalsTitle')).toBeLessThan(html.indexOf('shell.home.calendarTitle'));
		expect(html).not.toMatch(/\d+%/);
	});

	it('maps relationship failures to a specific retry message', () => {
		expect(homeErrorKey(new Error('HOME_RELATIONSHIP_INVALID'))).toBe('shell.home.relationshipError');
		expect(homeErrorKey(new Error('unexpected'))).toBe('shell.home.loadError');
	});
});
