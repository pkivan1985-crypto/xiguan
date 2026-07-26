import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router';

import type { DailyHabitsModel } from '@features/load-daily-habits';

import { todayErrorKey } from '../model/todayPage';
import { TodayPage, TodayPageContent } from './TodayPage';

const translations: Record<string, string> = {
	'shell.actions.openSettings': '打开设置',
	'shell.nav.today': '今天',
	'shell.today.activeDayCount': '累计 {{count}} 天',
	'shell.today.autoSaveLocal': '自动保存到本机',
	'shell.today.completeHabit': '完成{{title}}',
	'shell.today.completedFold': '已完成 {{count}} 项',
	'shell.today.createHabit': '新建习惯',
	'shell.today.dailyProgress': '今日 {{current}} / {{target}} {{unit}}',
	'shell.today.decreaseHabit': '减少{{title}}',
	'shell.today.goalProgress': '累计 {{total}} {{unit}} · {{progress}}%',
	'shell.today.increaseHabit': '增加{{title}}',
	'shell.today.itemSaveError': '这项没有保存，请再试一次。',
	'shell.today.loading': '正在读取今日成果…',
	'shell.today.outcomeDate': '已有成果',
	'shell.today.overview': '已完成 {{completed}} / {{total}}',
	'shell.today.recordHabit': '记录{{title}}',
	'shell.today.todayCompleted': '今日已确认',
	'shell.today.todayPending': '今日待确认',
	'shell.today.undoHabit': '撤销{{title}}',
	'shell.today.viewTodaySummary': '查看今日汇总',
	'shell.today.weekLabel': '本周日期',
	'shell.today.weekdays.friday': '五',
	'shell.today.weekdays.monday': '一',
	'shell.today.weekdays.saturday': '六',
	'shell.today.weekdays.sunday': '日',
	'shell.today.weekdays.thursday': '四',
	'shell.today.weekdays.tuesday': '二',
	'shell.today.weekdays.wednesday': '三',
};

vi.mock('react-i18next', () => ({
	useTranslation: () => ({
		i18n: { resolvedLanguage: 'zh-CN' },
		t: (key: string, values: Record<string, string | number> = {}) => {
			const template = translations[key] ?? key;
			return Object.entries(values).reduce(
				(result, [name, value]) => result.replace(`{{${name}}}`, String(value)),
				template,
			);
		},
	}),
}));

const model: DailyHabitsModel = {
	localDate: '2026-07-25',
	outcomeDates: ['2026-07-20', '2026-07-21', '2026-07-24', '2026-07-25'],
	completedCount: 1,
	habits: [{
		id: 'sleep',
		title: '早睡',
		trackingType: 'check',
		iconKey: 'moon',
		accent: 'green',
		quantityBaseValue: 1,
		displayValue: '1',
		displayUnit: '次',
		stepBase: 1,
		dailyTargetBase: 1,
		totalQuantityBaseValue: 6,
		activeDays: 6,
	}],
};

describe('TodayPage', () => {
	it('renders a truthful loading state before IndexedDB readback', () => {
		expect(renderToStaticMarkup(<MemoryRouter><TodayPage /></MemoryRouter>)).toContain('正在读取今日成果');
	});

	it('assembles the approved today hierarchy around one unified habit panel', () => {
		const html = renderToStaticMarkup(
			<MemoryRouter>
				<TodayPageContent
					model={model}
					todayLocalDate='2026-07-25'
					completedExpanded={true}
					pendingIds={new Set()}
					saveErrorIds={new Set()}
					onChangeHabit={vi.fn()}
					onSelectDate={vi.fn()}
					onToggleCompleted={vi.fn()}
				/>
			</MemoryRouter>,
		);

		expect(html).toContain('<h1>今天</h1>');
		expect(html).toContain('7月25日 周六');
		expect(html).toContain('已完成 1 / 1');
		expect(html).toContain('role="progressbar"');
		expect(html).toContain('aria-valuenow="1"');
		expect(html).toContain('自动保存到本机');
		expect(html.match(/data-testid="today-habit-panel"/g)).toHaveLength(1);
		expect(html).toContain('href="/progress?date=2026-07-25"');
		expect(html).toContain('查看今日汇总');
		expect(html).toContain('href="/deck/new"');
		expect(html).toContain('新建习惯');
	});

	it('maps actionable domain failures without hiding unknown errors', () => {
		expect(todayErrorKey(new Error('TODAY_DRAFT_DATE_CHANGED'))).toBe('shell.today.dateChanged');
		expect(todayErrorKey(new Error('INVALID_QUANTITY'))).toBe('shell.today.invalidValue');
		expect(todayErrorKey(new Error('unexpected'))).toBe('shell.today.submitError');
	});
});
