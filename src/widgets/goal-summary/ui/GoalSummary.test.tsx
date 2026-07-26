import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router';

import { GoalSummary } from './GoalSummary';
import type { HomeGoalSummary } from '@features/load-home-dashboard';

vi.mock('react-i18next', () => ({ useTranslation: () => ({
	t: (key: string, values: Record<string, string | number> = {}) => {
		const templates: Record<string, string> = {
			'shell.home.noGoalForCard': 'This card has no goal yet',
			'shell.progress.activeDaysCurrent': '{{current}} days',
			'shell.progress.activeDaysProgress': '{{current}} / {{target}} days',
			'shell.progress.currentProgress': '{{current}} {{unit}}',
			'shell.progress.quantityProgress': '{{current}} / {{target}} {{unit}}',
		};
		return Object.entries(values).reduce(
			(result, [name, value]) => result.replace(`{{${name}}}`, String(value)),
			templates[key] ?? key,
		);
	},
}) }));

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
	it('shows truthful long-term and stage values on one compact goal track', () => {
		const html = renderToStaticMarkup(<MemoryRouter><GoalSummary summaries={[summary]} /></MemoryRouter>);

		expect(html.indexOf('长期 100 km')).toBeLessThan(html.indexOf('阶段 20 km'));
		expect(html).toContain('27.50 / 100.00 km');
		expect(html).toContain('7.50');
		expect(html).toContain('7.50 / 20.00 km');
		expect(html.match(/role="progressbar"/g)).toHaveLength(2);
		expect(html).toContain('/goals/card-1');
	});

	it('renders a truthful no-goal state without invented progress', () => {
		const html = renderToStaticMarkup(<MemoryRouter><GoalSummary summaries={[{ ...summary, longTermGoal: null, stageGoal: null }]} /></MemoryRouter>);
		expect(html).toContain('This card has no goal yet');
		expect(html).not.toContain('0%');
	});
});
