import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import type { DailyHabitView } from '@features/load-daily-habits';

import {
	nextHabitQuantity,
	parsePaceText,
	resolveSwipeReveal,
	TodayHabitPanel,
	toggleCompletedVisibility,
} from './TodayHabitPanel';

const translations: Record<string, string> = {
	'shell.today.activeDayCount': '累计 {{count}} 天',
	'shell.today.completeHabit': '完成{{title}}',
	'shell.today.completeAction': '打卡',
	'shell.today.completedAction': '完成',
	'shell.today.enterActual': '记录进度',
	'shell.createCard.detailAction': '逐项记录',
	'shell.today.completedFold': '已完成 {{count}} 项',
	'shell.today.dailyProgress': '今日 {{current}} / {{target}} {{unit}}',
	'shell.today.decreaseHabit': '减少{{title}}',
	'shell.today.goalProgress': '累计 {{total}} {{unit}} · {{progress}}%',
	'shell.today.increaseHabit': '增加{{title}}',
	'shell.today.itemSaveError': '这项没有保存，请再试一次。',
	'shell.today.recordHabit': '记录{{title}}',
	'shell.today.restDay': '今日休息',
	'shell.today.todayCompleted': '今日已确认',
	'shell.today.todayPending': '今日待确认',
	'shell.today.undoHabit': '撤销{{title}}',
};

vi.mock('react-i18next', () => ({
	useTranslation: () => ({
		t: (key: string, values: Record<string, string | number> = {}) => {
			const template = translations[key] ?? key;
			return Object.entries(values).reduce(
				(result, [name, value]) => result.replace(`{{${name}}}`, String(value)),
				template,
			);
		},
	}),
}));

const habits: DailyHabitView[] = [
	{
		id: 'run',
		title: '跑步',
		trackingType: 'quantity',
		iconKey: 'activity',
		accent: 'green',
		quantityBaseValue: 3_200,
		displayValue: '3.20',
		displayUnit: 'km',
		stepBase: 500,
		basePerDisplayUnit: 1000,
		maxDecimalPlaces: 2,
		baseDailyTargetBase: 5000,
		dailyTargetBase: 5_000,
		carryInBaseValue: 0,
		totalQuantityBaseValue: 18_400,
		activeDays: 6,
		supportsTrainingDetails: true,
		goalTitle: '累计 30 公里',
		goalProgressRatio: 18.4 / 30,
		scheduledToday: true,
		recordedToday: true,
	},
	{
		id: 'water',
		title: '喝水',
		trackingType: 'count',
		iconKey: 'droplet',
		accent: 'cyan',
		quantityBaseValue: 5,
		displayValue: '5',
		displayUnit: '杯',
		stepBase: 1,
		basePerDisplayUnit: 1,
		maxDecimalPlaces: 0,
		baseDailyTargetBase: 8,
		dailyTargetBase: 8,
		carryInBaseValue: 0,
		totalQuantityBaseValue: 42,
		activeDays: 6,
		supportsTrainingDetails: false,
		scheduledToday: true,
		recordedToday: false,
	},
	{
		id: 'read',
		title: '阅读',
		trackingType: 'duration',
		iconKey: 'book',
		accent: 'amber',
		quantityBaseValue: 20,
		displayValue: '20',
		displayUnit: '分钟',
		stepBase: 5,
		basePerDisplayUnit: 1,
		maxDecimalPlaces: 0,
		baseDailyTargetBase: 30,
		dailyTargetBase: 30,
		carryInBaseValue: 0,
		totalQuantityBaseValue: 240,
		activeDays: 8,
		supportsTrainingDetails: false,
		scheduledToday: true,
		recordedToday: false,
	},
	{
		id: 'sleep',
		title: '早睡',
		trackingType: 'check',
		iconKey: 'moon',
		accent: 'violet',
		quantityBaseValue: 1,
		displayValue: '1',
		displayUnit: '次',
		stepBase: 1,
		basePerDisplayUnit: 1,
		maxDecimalPlaces: 0,
		baseDailyTargetBase: 1,
		dailyTargetBase: 1,
		carryInBaseValue: 0,
		totalQuantityBaseValue: 6,
		activeDays: 6,
		supportsTrainingDetails: false,
		scheduledToday: true,
		recordedToday: true,
	},
	{
		id: 'avoid',
		title: '不刷短视频',
		trackingType: 'avoid',
		iconKey: 'shield',
		accent: 'blue',
		quantityBaseValue: 1,
		displayValue: '1',
		displayUnit: '天',
		stepBase: 1,
		basePerDisplayUnit: 1,
		maxDecimalPlaces: 0,
		baseDailyTargetBase: 1,
		dailyTargetBase: 1,
		carryInBaseValue: 0,
		totalQuantityBaseValue: 4,
		activeDays: 4,
		supportsTrainingDetails: false,
		scheduledToday: true,
		recordedToday: true,
	},
];

function renderPanel({
	renderedHabits = habits,
	completedExpanded = true,
	pendingIds = new Set<string>(),
	saveErrorIds = new Set<string>(),
	openDetails = false,
}: {
	renderedHabits?: readonly DailyHabitView[];
	completedExpanded?: boolean;
	pendingIds?: ReadonlySet<string>;
	saveErrorIds?: ReadonlySet<string>;
	openDetails?: boolean;
} = {}): string {
	return renderToStaticMarkup(
		<TodayHabitPanel
			habits={renderedHabits}
			completedExpanded={completedExpanded}
			pendingIds={pendingIds}
			saveErrorIds={saveErrorIds}
			onChange={vi.fn()}
			onComplete={vi.fn()}
			onSaveActual={vi.fn()}
			onOpenDetails={openDetails ? vi.fn() : undefined}
			onRequestDelete={vi.fn()}
			onToggleCompleted={vi.fn()}
		/>,
	);
}

describe('TodayHabitPanel', () => {
	it('parses a running pace as deterministic seconds per kilometre', () => {
		expect(parsePaceText('06:30')).toBe(390);
		expect(parsePaceText('6:75')).toBeUndefined();
		expect(parsePaceText('快跑')).toBeUndefined();
	});

	it('derives the next saved value for all five tracking controls', () => {
		expect(nextHabitQuantity(habits[0]!, 'decrease')).toBe(2_700);
		expect(nextHabitQuantity(habits[0]!, 'increase')).toBe(3_700);
		expect(nextHabitQuantity(habits[1]!, 'increase')).toBe(6);
		expect(nextHabitQuantity(habits[2]!, 'record')).toBe(25);
		expect(nextHabitQuantity(habits[3]!, 'toggle')).toBe(0);
		expect(nextHabitQuantity({ ...habits[4]!, quantityBaseValue: 0 }, 'toggle')).toBe(1);
	});

	it('reveals only after a deliberate horizontal swipe to the left', () => {
		expect(resolveSwipeReveal({ deltaX: -52, deltaY: 4, wasRevealed: false })).toBe(true);
		expect(resolveSwipeReveal({ deltaX: -18, deltaY: 2, wasRevealed: false })).toBe(false);
		expect(resolveSwipeReveal({ deltaX: -58, deltaY: 72, wasRevealed: false })).toBe(false);
		expect(resolveSwipeReveal({ deltaX: 52, deltaY: 4, wasRevealed: true })).toBe(false);
	});

	it('renders five tracking types as rows inside one unified panel', () => {
		const html = renderPanel();

		expect(html.match(/data-testid="today-habit-panel"/g)).toHaveLength(1);
		expect(html.match(/data-habit-id=/g)).toHaveLength(5);
		expect(html).toContain('data-tracking-type="quantity"');
		expect(html).toContain('data-tracking-type="count"');
		expect(html).toContain('data-tracking-type="duration"');
		expect(html).toContain('data-tracking-type="check"');
		expect(html).toContain('data-tracking-type="avoid"');
		expect(html.match(/data-swipe-habit-id=/g)).toHaveLength(5);
		expect(html.match(/data-testid="delete-habit-action"/g)).toHaveLength(5);
		expect(html).toContain('>打卡</span>');
		expect(html).toContain('>记录进度</span>');
		expect(html).toContain('aria-label="增加喝水"');
		expect(html).toContain('aria-label="记录阅读"');
		expect(html).toContain('aria-label="撤销早睡"');
		expect(html).toContain('aria-label="撤销不刷短视频"');
		expect(html.match(/aria-hidden="true"/g)?.length).toBeGreaterThanOrEqual(5);
		expect(html).not.toContain('role="img"');
	});

	it('uses check-in before saving and a completed status afterward while keeping progress editing available', () => {
		const pendingHtml = renderPanel({
			renderedHabits: [{
				...habits[0]!,
				quantityBaseValue: 0,
				displayValue: '0.00',
				recordedToday: false,
			}],
		});
		const completedHabit: DailyHabitView = {
			...habits[0]!,
			quantityBaseValue: 5_000,
			displayValue: '5.00',
		};
		const html = renderPanel({ renderedHabits: [completedHabit] });

		expect(pendingHtml).toContain('>打卡</span>');
		expect(pendingHtml).toContain('>记录进度</span>');
		expect(html).toContain('data-recorded="true"');
		expect(html).toMatch(/class="[^"]*completeAction[^"]*" disabled="" data-recorded="true"/);
		expect(html).toContain('>完成</span>');
		expect(html).toContain('>记录进度</span>');
	});

	it('keeps an explicit completed check-in locked when edited progress is below the plan', () => {
		const html = renderPanel({
			renderedHabits: [{
				...habits[0]!,
				quantityBaseValue: 3_000,
				displayValue: '3.00',
				entryMethod: 'completed',
			}],
		});

		expect(html).toContain('data-recorded="true"');
		expect(html).toMatch(/class="[^"]*completeAction[^"]*" disabled="" data-recorded="true"/);
		expect(html).toContain('>完成</span>');
	});

	it('uses the unified quick action and dedicated detail entry on the Today route', () => {
		const checklist: DailyHabitView = {
			...habits[1]!,
			id: 'light-food',
			title: '轻食计划',
			trackingType: 'checklist',
			iconKey: 'leaf',
			displayUnit: '项',
			quantityBaseValue: 2,
			displayValue: '2',
			baseDailyTargetBase: 4,
			dailyTargetBase: 4,
		};
		const html = renderPanel({ renderedHabits: [checklist], openDetails: true });

		expect(html).toContain('>打卡</span>');
		expect(html).toContain('>逐项记录</span>');
		expect(html).not.toContain('aria-label="增加轻食计划"');
	});

	it('keeps a rest-day habit visible without exposing recording controls', () => {
		const restHabit = {
			...habits[0]!,
			id: 'rest-run',
			title: '晨跑',
			quantityBaseValue: 0,
			displayValue: '0.00',
			recordedToday: false,
			scheduledToday: false,
		};
		const html = renderPanel({ renderedHabits: [restHabit] });

		expect(html).toContain('data-habit-id="rest-run"');
		expect(html).toContain('data-scheduled="false"');
		expect(html).toContain('>今日休息</small>');
		expect(html).toContain('aria-label="今日休息"');
		expect(html).not.toContain('>打卡</span>');
		expect(html).not.toContain('>记录进度</span>');
		expect(html.match(/<button/g)).toHaveLength(1);
		expect(html).toContain('data-testid="delete-habit-action"');
	});

	it('keeps the unified panel and empty-state copy when there are no habits', () => {
		const html = renderPanel({ renderedHabits: [] });

		expect(html.match(/data-testid="today-habit-panel"/g)).toHaveLength(1);
		expect(html).toContain('shell.today.emptyTitle');
		expect(html).toContain('shell.today.emptyDescription');
		expect(html).not.toContain('role="list"');
		expect(html).not.toContain('aria-expanded=');
	});

	it('omits only the unavailable goal line for quantity habits without a goal', () => {
		const quantityWithoutGoal: DailyHabitView = {
			...habits[0]!,
			goalTitle: undefined,
			goalProgressRatio: undefined,
		};
		const html = renderPanel({ renderedHabits: [quantityWithoutGoal] });

		expect(html).toContain('今日 3.20 / 5 km');
		expect(html).not.toContain('累计 18.4 km');
		expect(html).not.toContain('goalProgress');
		expect(html).toContain('data-tracking-type="quantity"');
	});

	it('collapses only completed rows and exposes a deterministic toggle state', () => {
		const html = renderPanel({ completedExpanded: false });

		expect(toggleCompletedVisibility(false)).toBe(true);
		expect(toggleCompletedVisibility(true)).toBe(false);
		expect(html.match(/data-habit-id=/g)).toHaveLength(3);
		expect(html).not.toContain('data-habit-id="sleep"');
		expect(html).not.toContain('data-habit-id="avoid"');
		expect(html).toContain('aria-expanded="false"');
		expect(html).toContain('已完成 2 项');
	});

	it('scopes pending and save error states to the matching habit row', () => {
		const html = renderPanel({
			pendingIds: new Set(['water']),
			saveErrorIds: new Set(['read']),
		});

		expect(html.match(/aria-busy="true"/g)).toHaveLength(1);
		expect(html.match(/ disabled=""/g)).toHaveLength(2);
		expect(html.match(/data-recorded="true"/g)).toBeNull();
		expect(html.match(/role="alert"/g)).toHaveLength(1);
		expect(html).toContain('data-error-for="read"');
		expect(html).not.toContain('data-error-for="water"');
	});
});
