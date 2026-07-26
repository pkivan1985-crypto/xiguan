import { readFileSync } from 'node:fs';

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router';

import { GoalSummary } from './GoalSummary';
import type { HomeGoalSummary } from '@features/load-home-dashboard';

vi.mock('react-i18next', () => ({ useTranslation: () => ({
	t: (key: string, values: Record<string, string | number> = {}) => {
		const templates: Record<string, string> = {
			'shell.goalDetails.status.completed': 'Completed',
			'shell.home.noGoalForCard': 'This card has no goal yet',
			'shell.progress.activeDaysCurrent': '{{current}} days',
			'shell.progress.activeDaysProgress': '{{current}} / {{target}} days',
			'shell.progress.combinedConditions': '{{quantity}}; {{activeDays}}',
			'shell.progress.currentProgress': '{{current}} {{unit}}',
			'shell.progress.longTermProgressLabel': '{{title}} long-term progress',
			'shell.progress.quantityProgress': '{{current}} / {{target}} {{unit}}',
			'shell.progress.stageProgressLabel': '{{title}} stage progress',
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
		targetQuantityBase: 100_000,
		progress: { quantityBaseValue: 27_500, activeDays: 8, quantityRatio: 0.275, ratio: 0.275, completed: false },
	},
	stageGoal: {
		id: 'stage-1', title: '阶段 20 km', status: 'active', mode: 'quantity',
		targetQuantityBase: 20_000,
		progress: { quantityBaseValue: 7_500, activeDays: 2, quantityRatio: 0.375, ratio: 0.375, completed: false },
	},
};

describe('GoalSummary', () => {
	it('uses source targets and exposes long-term and stage as independent labelled progressbars', () => {
		const html = renderToStaticMarkup(<MemoryRouter><GoalSummary summaries={[summary]} /></MemoryRouter>);

		expect(html.indexOf('阶段 20 km')).toBeLessThan(html.indexOf('长期 100 km'));
		expect(html).toContain('27.50 / 100.00 km');
		expect(html).toContain('7.50 / 20.00 km');
		expect(html).toContain('role="group"');
		expect(html).toContain('role="progressbar" aria-label="长期 100 km long-term progress"');
		expect(html).toContain('role="progressbar" aria-label="阶段 20 km stage progress"');
		expect(html).toContain('aria-valuenow="28"');
		expect(html).toContain('aria-valuenow="38"');
		const longProgressStart = html.indexOf('role="progressbar" aria-label="长期 100 km long-term progress"');
		const stageProgressStart = html.indexOf('role="progressbar" aria-label="阶段 20 km stage progress"');
		const stageProgressEnd = html.indexOf('</span>', stageProgressStart);
		expect(stageProgressEnd).toBeLessThan(longProgressStart);
		expect(html).toContain('/goals/card-1');
	});

	it('shows explicit zero targets without hiding them behind ratio inference', () => {
		const zero = {
			...summary,
			longTermGoal: {
				...summary.longTermGoal!,
				progress: {
					quantityBaseValue: 0,
					activeDays: 0,
					quantityRatio: 0,
					ratio: 0,
					completed: false,
				},
			},
			stageGoal: {
				...summary.stageGoal!,
				progress: {
					quantityBaseValue: 0,
					activeDays: 0,
					quantityRatio: 0,
					ratio: 0,
					completed: false,
				},
			},
		};
		const html = renderToStaticMarkup(<MemoryRouter><GoalSummary summaries={[zero]} /></MemoryRouter>);

		expect(html).toContain('0.00 / 100.00 km');
		expect(html).toContain('0.00 / 20.00 km');
		expect(html).toContain('aria-valuenow="0"');
	});

	it('keeps over-target facts visible and marks completed goal state', () => {
		const completed = {
			...summary,
			longTermGoal: {
				...summary.longTermGoal!,
				status: 'completed' as const,
				progress: {
					quantityBaseValue: 125_000,
					activeDays: 30,
					quantityRatio: 1,
					ratio: 1,
					completed: true,
				},
			},
			stageGoal: {
				...summary.stageGoal!,
				status: 'completed' as const,
				progress: {
					quantityBaseValue: 25_000,
					activeDays: 10,
					quantityRatio: 1,
					ratio: 1,
					completed: true,
				},
			},
		};
		const html = renderToStaticMarkup(<MemoryRouter><GoalSummary summaries={[completed]} /></MemoryRouter>);

		expect(html).toContain('125.00 / 100.00 km');
		expect(html).toContain('25.00 / 20.00 km');
		expect(html.match(/Completed/g)).toHaveLength(2);
		expect(html.match(/data-completed="true"/g)).toHaveLength(2);
		expect(html.match(/aria-valuenow="100"/g)).toHaveLength(2);
	});

	it('uses the source active-day target for an active-day stage', () => {
		const activeDays = {
			...summary,
			stageGoal: {
				...summary.stageGoal!,
				mode: 'activeDays' as const,
				targetQuantityBase: undefined,
				targetActiveDays: 12,
				progress: {
					quantityBaseValue: 0,
					activeDays: 4,
					activeDaysRatio: 1 / 3,
					ratio: 1 / 3,
					completed: false,
				},
			},
		};
		const html = renderToStaticMarkup(<MemoryRouter><GoalSummary summaries={[activeDays]} /></MemoryRouter>);

		expect(html).toContain('4 / 12 days');
	});

	it('shows both real conditions when quantity is complete but active days limit overall progress', () => {
		const both = {
			...summary,
			stageGoal: {
				...summary.stageGoal!,
				mode: 'both' as const,
				targetQuantityBase: 100_000,
				targetActiveDays: 4,
				progress: {
					quantityBaseValue: 100_000,
					activeDays: 2,
					quantityRatio: 1,
					activeDaysRatio: 0.5,
					ratio: 0.5,
					completed: false,
				},
			},
		};
		const html = renderToStaticMarkup(<MemoryRouter><GoalSummary summaries={[both]} /></MemoryRouter>);

		expect(html).toContain('100.00 / 100.00 km');
		expect(html).toContain('2 / 4 days');
		expect(html).toContain('data-combined="true"');
		expect(html).toContain(
			'aria-label="阶段 20 km stage progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="50" aria-valuetext="100.00 / 100.00 km; 2 / 4 days"',
		);
	});

	it('shows both real conditions when active days are complete but quantity limits overall progress', () => {
		const both = {
			...summary,
			stageGoal: {
				...summary.stageGoal!,
				mode: 'both' as const,
				targetQuantityBase: 100_000,
				targetActiveDays: 4,
				progress: {
					quantityBaseValue: 50_000,
					activeDays: 4,
					quantityRatio: 0.5,
					activeDaysRatio: 1,
					ratio: 0.5,
					completed: false,
				},
			},
		};
		const html = renderToStaticMarkup(<MemoryRouter><GoalSummary summaries={[both]} /></MemoryRouter>);

		expect(html).toContain('50.00 / 100.00 km');
		expect(html).toContain('4 / 4 days');
		expect(html).toContain(
			'aria-label="阶段 20 km stage progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="50" aria-valuetext="50.00 / 100.00 km; 4 / 4 days"',
		);
	});

	it('gives combined stage conditions a full-width wrapping row for the 390px layout', () => {
		const css = readFileSync(new URL('./GoalSummary.module.css', import.meta.url), 'utf8');
		const combinedValueRule = css.match(
			/\.goalRow\[data-combined='true'\] \.value\s*\{[^}]*\}/s,
		)?.[0] ?? '';

		expect(combinedValueRule).toContain('grid-column: 1 / -1');
		expect(combinedValueRule).toContain('flex-wrap: wrap');
		expect(combinedValueRule).toContain('white-space: normal');
	});

	it('renders a truthful no-goal state without invented progress', () => {
		const html = renderToStaticMarkup(<MemoryRouter><GoalSummary summaries={[{ ...summary, longTermGoal: null, stageGoal: null }]} /></MemoryRouter>);
		expect(html).toContain('This card has no goal yet');
		expect(html).not.toContain('0%');
	});

	it('does not repeat an inherited goal title that is identical to the habit title', () => {
		const repeatedTitle = {
			...summary,
			cardTitle: '超级夜跑',
			stageGoal: null,
			longTermGoal: {
				...summary.longTermGoal!,
				title: '超级夜跑',
			},
		};
		const html = renderToStaticMarkup(
			<MemoryRouter><GoalSummary summaries={[repeatedTitle]} /></MemoryRouter>,
		);

		expect(html).toContain('<strong>超级夜跑</strong>');
		expect(html).not.toContain('<b>超级夜跑</b>');
		expect(html).toContain('data-title-hidden="true"');
		expect(html).toContain('aria-label="超级夜跑 long-term progress"');
		const css = readFileSync(new URL('./GoalSummary.module.css', import.meta.url), 'utf8');
		expect(css).toMatch(
			/\.goalRow\[data-title-hidden='true'\] \.bar,\s*\.goalRow\[data-title-hidden='true'\] \.value\s*\{[^}]*grid-row:\s*1;/s,
		);
	});
});
