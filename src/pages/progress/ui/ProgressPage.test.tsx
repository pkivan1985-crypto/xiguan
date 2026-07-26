import type { ComponentType } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';

import type { HistoryModel } from '@features/load-history';
import type { HomeDashboardModel } from '@features/load-home-dashboard';

import {
	buildHistoryDateHref,
	buildProgressDateSearch,
	buildProgressTabModel,
	canonicalProgressDateSearch,
	moveProgressMonth,
	progressMonthFromDate,
} from '../model/progressPageState';
import * as progressPageModule from './ProgressPage';

const translations: Record<string, string> = {
	'shell.actions.openSettings': '打开设置',
	'shell.home.monthLabel': '{{year}} 年 {{month}} 月',
	'shell.home.nextMonth': '下个月',
	'shell.home.noGoalForCard': '这张卡暂时没有目标',
	'shell.home.outcomeDay': '{{date}} 成果日',
	'shell.home.previousMonth': '上个月',
	'shell.nav.progress': '进展',
	'shell.progress.activeSummary': '{{habits}} 个习惯正在推进 · 本月 {{days}} 个成果日',
	'shell.progress.calendarTab': '月历',
	'shell.progress.dailyRecord': '当日记录',
	'shell.progress.details': '查看详情',
	'shell.progress.goalsTab': '目标',
	'shell.progress.noRecords': '这一天还没有真实记录。',
	'shell.progress.plans': '总规划',
	'shell.progress.recordValue': '{{value}} {{unit}}',
	'shell.progress.selectedDayHint': '点击日期查看当天记录',
	'shell.progress.selectedDayTitle': '{{date}} · {{count}} 项成果',
	'shell.progress.tabsLabel': '进展视图',
	'shell.progress.viewAllGoals': '查看全部目标',
};

vi.mock('react-i18next', () => ({
	useTranslation: () => ({
		i18n: { language: 'zh-CN', resolvedLanguage: 'zh-CN' },
		t: (key: string, values: Record<string, string | number> = {}) => {
			const template = translations[key] ?? key;
			return Object.entries(values).reduce(
				(result, [name, value]) => result.replace(`{{${name}}}`, String(value)),
				template,
			);
		},
	}),
}));

const dashboard: HomeDashboardModel = {
	hasCards: true,
	outcomeDates: ['2026-07-02', '2026-07-25'],
	outcomeDayCount: 2,
	year: 2026,
	monthIndex: 6,
	goalSummaries: [{
		userCardId: 'run',
		cardTitle: '跑步',
		displayUnit: 'km',
		basePerDisplayUnit: 1000,
		maxDecimalPlaces: 2,
		longTermGoal: {
			id: 'run-long',
			title: '累计 100 km',
			status: 'active',
			targetQuantityBase: 100_000,
			progress: {
				quantityBaseValue: 18_400,
				activeDays: 7,
				quantityRatio: 0.184,
				ratio: 0.184,
				completed: false,
			},
		},
		stageGoal: {
			id: 'run-stage',
			title: '7 月完成 30 km',
			status: 'active',
			mode: 'quantity',
			targetQuantityBase: 30_000,
			progress: {
				quantityBaseValue: 18_400,
				activeDays: 7,
				quantityRatio: 18.4 / 30,
				ratio: 18.4 / 30,
				completed: false,
			},
		},
	}, {
		userCardId: 'read',
		cardTitle: '阅读',
		displayUnit: '本',
		basePerDisplayUnit: 1,
		maxDecimalPlaces: 0,
		longTermGoal: {
			id: 'read-long',
			title: '读完 12 本书',
			status: 'active',
			targetQuantityBase: 12,
			progress: {
				quantityBaseValue: 4,
				activeDays: 4,
				quantityRatio: 1 / 3,
				ratio: 1 / 3,
				completed: false,
			},
		},
		stageGoal: {
			id: 'read-stage',
			title: '本月读完 1 本',
			status: 'active',
			mode: 'quantity',
			targetQuantityBase: 1,
			progress: {
				quantityBaseValue: 0,
				activeDays: 0,
				quantityRatio: 0,
				ratio: 0,
				completed: false,
			},
		},
	}, {
		userCardId: 'sleep',
		cardTitle: '早睡',
		displayUnit: '次',
		basePerDisplayUnit: 1,
		maxDecimalPlaces: 0,
		longTermGoal: null,
		stageGoal: null,
	}, {
		userCardId: 'water',
		cardTitle: '喝水',
		displayUnit: '杯',
		basePerDisplayUnit: 1,
		maxDecimalPlaces: 0,
		longTermGoal: null,
		stageGoal: null,
	}, {
		userCardId: 'focus',
		cardTitle: '不刷短视频',
		displayUnit: '次',
		basePerDisplayUnit: 1,
		maxDecimalPlaces: 0,
		longTermGoal: null,
		stageGoal: null,
	}],
};

const history: HistoryModel = {
	groups: [{
		localDate: '2026-07-25',
		records: [{
			id: 'record-run',
			localDate: '2026-07-25',
			cardTitle: '跑步',
			quantityBaseValue: 3200,
			displayValue: '3.2',
			displayUnit: 'km',
			basePerDisplayUnit: 1000,
			maxDecimalPlaces: 2,
			confirmationThresholdDisplay: 100,
			lastSavedAt: '2026-07-25T08:00:00.000Z',
			longTermGoalTitle: '累计 100 km',
			stageGoalTitle: '7 月完成 30 km',
			canCorrect: true,
			relationAvailable: true,
		}],
	}],
};

type ProgressPageContentProps = {
	activeTab: 'calendar' | 'goals';
	dashboard: HomeDashboardModel;
	history: HistoryModel;
	selectedDate: string;
	todayLocalDate: string;
	canGoNext: boolean;
	onChangeTab: (tab: 'calendar' | 'goals') => void;
	onNextMonth: () => void;
	onPreviousMonth: () => void;
	onSelectDate: (localDate: string) => void;
};

function progressContent(): ComponentType<ProgressPageContentProps> | undefined {
	return (
		progressPageModule as unknown as {
			ProgressPageContent?: ComponentType<ProgressPageContentProps>;
		}
	).ProgressPageContent;
}

describe('ProgressPage', () => {
	it('builds deterministic tab state and date deep links without DOM state', () => {
		expect(buildProgressDateSearch('2026-07-25')).toBe('date=2026-07-25');
		expect(canonicalProgressDateSearch('2026-07-25', '2026-07-25')).toBeNull();
		expect(canonicalProgressDateSearch('not-a-date', '2026-07-25')).toBe(
			'date=2026-07-25',
		);
		expect(canonicalProgressDateSearch(null, '2026-07-25')).toBe(
			'date=2026-07-25',
		);
		expect(buildHistoryDateHref('2026-07-25')).toBe('/history?date=2026-07-25');
		expect(progressMonthFromDate('2026-07-25')).toEqual({ year: 2026, monthIndex: 6 });
		expect(buildProgressTabModel('goals')).toEqual([
			{
				tab: 'calendar',
				selected: false,
				id: 'progress-calendar-tab',
				panelId: 'progress-tab-content',
			},
			{
				tab: 'goals',
				selected: true,
				id: 'progress-goals-tab',
				panelId: 'progress-tab-content',
			},
		]);
	});

	it('moves the selected day and date query with the month, clamping missing and future days', () => {
		expect(moveProgressMonth(
			{ year: 2026, monthIndex: 0 },
			'2026-01-31',
			1,
			'2026-07-25',
		)).toEqual({
			year: 2026,
			monthIndex: 1,
			selectedDate: '2026-02-28',
			dateSearch: 'date=2026-02-28',
		});
		expect(moveProgressMonth(
			{ year: 2026, monthIndex: 5 },
			'2026-06-30',
			1,
			'2026-07-25',
		)).toEqual({
			year: 2026,
			monthIndex: 6,
			selectedDate: '2026-07-25',
			dateSearch: 'date=2026-07-25',
		});
		expect(moveProgressMonth(
			{ year: 2026, monthIndex: 6 },
			'2026-07-25',
			1,
			'2026-07-25',
		)).toEqual({
			year: 2026,
			monthIndex: 6,
			selectedDate: '2026-07-25',
			dateSearch: 'date=2026-07-25',
		});
	});

	it('assembles the approved calendar-first hierarchy without legacy metric tiles', () => {
		const ProgressPageContent = progressContent();
		expect(ProgressPageContent).toBeTypeOf('function');
		if (!ProgressPageContent) return;

		const html = renderToStaticMarkup(
			<MemoryRouter>
				<ProgressPageContent
					activeTab='calendar'
					dashboard={dashboard}
					history={history}
					selectedDate='2026-07-25'
					todayLocalDate='2026-07-25'
					canGoNext={false}
					onChangeTab={vi.fn()}
					onNextMonth={vi.fn()}
					onPreviousMonth={vi.fn()}
					onSelectDate={vi.fn()}
				/>
			</MemoryRouter>,
		);

		expect(html).toContain('<h1>进展</h1>');
		expect(html).toContain('href="/settings"');
		expect(html).toContain('role="tablist"');
		expect(html).toContain('aria-selected="true">月历</button>');
		expect(html).toContain('data-testid="progress-calendar-panel"');
		expect(html).toContain('7月25日 · 1 项成果');
		expect(html).toContain('跑步');
		expect(html).toContain('3.2');
		expect(html).toContain('查看详情');
		expect(html).toContain('data-testid="progress-plan-panel"');
		expect(html).toContain('5 个习惯正在推进 · 本月 2 个成果日');
		expect(html).toContain('累计 100 km');
		expect(html).toContain('读完 12 本书');
		expect(html).not.toContain('早睡');
		expect(html).not.toContain('所选记录');
		expect(html).not.toContain('长期规划');
	});

	it('keeps the goals tab on the same route data while hiding only the calendar panel', () => {
		const ProgressPageContent = progressContent();
		expect(ProgressPageContent).toBeTypeOf('function');
		if (!ProgressPageContent) return;

		const html = renderToStaticMarkup(
			<MemoryRouter>
				<ProgressPageContent
					activeTab='goals'
					dashboard={dashboard}
					history={history}
					selectedDate='2026-07-25'
					todayLocalDate='2026-07-25'
					canGoNext={false}
					onChangeTab={vi.fn()}
					onNextMonth={vi.fn()}
					onPreviousMonth={vi.fn()}
					onSelectDate={vi.fn()}
				/>
			</MemoryRouter>,
		);

		expect(html).toContain('aria-selected="true">目标</button>');
		expect(html).not.toContain('data-testid="progress-calendar-panel"');
		expect(html).toContain('data-testid="progress-plan-panel"');
	});
});
