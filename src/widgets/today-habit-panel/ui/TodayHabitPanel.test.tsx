import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import type { DailyHabitView } from '@features/load-daily-habits';

import {
	nextHabitQuantity,
	TodayHabitPanel,
	toggleCompletedVisibility,
} from './TodayHabitPanel';

const translations: Record<string, string> = {
	'shell.today.activeDayCount': '累计 {{count}} 天',
	'shell.today.completeHabit': '完成{{title}}',
	'shell.today.completedFold': '已完成 {{count}} 项',
	'shell.today.dailyProgress': '今日 {{current}} / {{target}} {{unit}}',
	'shell.today.decreaseHabit': '减少{{title}}',
	'shell.today.goalProgress': '累计 {{total}} {{unit}} · {{progress}}%',
	'shell.today.increaseHabit': '增加{{title}}',
	'shell.today.itemSaveError': '这项没有保存，请再试一次。',
	'shell.today.recordHabit': '记录{{title}}',
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
		dailyTargetBase: 5_000,
		totalQuantityBaseValue: 18_400,
		activeDays: 6,
		goalTitle: '累计 30 公里',
		goalProgressRatio: 18.4 / 30,
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
		dailyTargetBase: 8,
		totalQuantityBaseValue: 42,
		activeDays: 6,
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
		dailyTargetBase: 30,
		totalQuantityBaseValue: 240,
		activeDays: 8,
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
		dailyTargetBase: 1,
		totalQuantityBaseValue: 6,
		activeDays: 6,
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
		dailyTargetBase: 1,
		totalQuantityBaseValue: 4,
		activeDays: 4,
	},
];

function renderPanel({
	completedExpanded = true,
	pendingIds = new Set<string>(),
	saveErrorIds = new Set<string>(),
}: {
	completedExpanded?: boolean;
	pendingIds?: ReadonlySet<string>;
	saveErrorIds?: ReadonlySet<string>;
} = {}): string {
	return renderToStaticMarkup(
		<TodayHabitPanel
			habits={habits}
			completedExpanded={completedExpanded}
			pendingIds={pendingIds}
			saveErrorIds={saveErrorIds}
			onChange={vi.fn()}
			onToggleCompleted={vi.fn()}
		/>,
	);
}

describe('TodayHabitPanel', () => {
	it('derives the next saved value for all five tracking controls', () => {
		expect(nextHabitQuantity(habits[0]!, 'decrease')).toBe(2_700);
		expect(nextHabitQuantity(habits[0]!, 'increase')).toBe(3_700);
		expect(nextHabitQuantity(habits[1]!, 'increase')).toBe(6);
		expect(nextHabitQuantity(habits[2]!, 'record')).toBe(25);
		expect(nextHabitQuantity(habits[3]!, 'toggle')).toBe(0);
		expect(nextHabitQuantity({ ...habits[4]!, quantityBaseValue: 0 }, 'toggle')).toBe(1);
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
		expect(html).toContain('aria-label="减少跑步"');
		expect(html).toContain('aria-label="增加喝水"');
		expect(html).toContain('aria-label="记录阅读"');
		expect(html).toContain('aria-label="撤销早睡"');
		expect(html).toContain('aria-label="撤销不刷短视频"');
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
		expect(html.match(/ disabled=""/g)).toHaveLength(1);
		expect(html.match(/role="alert"/g)).toHaveLength(1);
		expect(html).toContain('data-error-for="read"');
		expect(html).not.toContain('data-error-for="water"');
	});
});
