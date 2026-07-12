import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router';

import { GoalSummary } from './GoalSummary';
import type { HomeGoalSummary } from '@features/load-home-dashboard';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

const summary: HomeGoalSummary = {
	userCardId: 'card-1',
	cardTitle: '晨跑',
	displayUnit: 'km',
	basePerDisplayUnit: 1000,
	maxDecimalPlaces: 3,
	longTermGoal: {
		id: 'long-1', title: '长期 100 km', status: 'active',
		progress: { quantityBaseValue: 27_500, activeDays: 8, quantityRatio: 0.275, ratio: 0.275, completed: false },
	},
	stageGoal: {
		id: 'stage-1', title: '阶段 20 km', status: 'active', mode: 'quantity',
		progress: { quantityBaseValue: 7_500, activeDays: 2, quantityRatio: 0.375, ratio: 0.375, completed: false },
	},
};

describe('GoalSummary', () => {
	it('shows stage progress before long-term evidence and links to goal details', () => {
		const html = renderToStaticMarkup(<MemoryRouter><GoalSummary summaries={[summary]} /></MemoryRouter>);

		expect(html.indexOf('阶段 20 km')).toBeLessThan(html.indexOf('长期 100 km'));
		expect(html).toContain('7.50');
		expect(html).toContain('38%');
		expect(html).toContain('/goals/card-1');
	});

	it('renders a truthful no-goal state without invented progress', () => {
		const html = renderToStaticMarkup(<MemoryRouter><GoalSummary summaries={[{ ...summary, longTermGoal: null, stageGoal: null }]} /></MemoryRouter>);
		expect(html).toContain('shell.home.noGoalForCard');
		expect(html).not.toContain('0%');
	});
});
