import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router';

import type { DailyHabitsModel } from '@features/load-daily-habits';

import { todayErrorKey } from '../model/todayPage';
import * as todayPageModel from '../model/todayPage';
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
	'shell.today.overviewProgressLabel': '今日完成进度',
	'shell.today.overviewProgressValue': '{{completed}} / {{total}}',
	'shell.today.recordHabit': '记录{{title}}',
	'shell.today.restDay': '今日休息',
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
	scheduledCount: 1,
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
	}],
};

interface QueueState {
	pendingIds: ReadonlySet<string>;
	saveErrorIds: ReadonlySet<string>;
}

type TodaySaveQueueFactory = (
	onStateChange: (state: QueueState) => void,
) => {
	enqueue<T>(habitId: string, operation: () => Promise<T>): Promise<T> | undefined;
};

function deferred<T>() {
	let resolve!: (value: T | PromiseLike<T>) => void;
	let reject!: (reason?: unknown) => void;
	const promise = new Promise<T>((resolvePromise, rejectPromise) => {
		resolve = resolvePromise;
		reject = rejectPromise;
	});
	return { promise, reject, resolve };
}

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
					onCompleteHabit={vi.fn()}
					onDeleteHabit={vi.fn()}
					onSaveActual={vi.fn()}
					onSelectDate={vi.fn()}
					onToggleCompleted={vi.fn()}
				/>
			</MemoryRouter>,
		);

		expect(html).toContain('<h1>今天</h1>');
		expect(html).toContain('7月25日 周六');
		expect(html).toContain('>1 / 1</strong>');
		expect(html).not.toContain('>已完成 1 / 1</strong>');
		expect(html).toContain('role="progressbar"');
		expect(html).toContain('aria-label="今日完成进度"');
		expect(html).toContain('aria-valuenow="1"');
		expect(html).toContain('aria-valuetext="1 / 1"');
		expect(html).toContain('自动保存到本机');
		expect(html.match(/data-testid="today-habit-panel"/g)).toHaveLength(1);
		expect(html).toContain('href="/progress?date=2026-07-25"');
		expect(html).toContain('查看今日汇总');
		expect(html).toContain('href="/deck/new"');
		expect(html).toContain('新建习惯');
	});

	it('excludes a visible rest-day habit from the overview total', () => {
		const restHabit = {
			...model.habits[0]!,
			id: 'rest-run',
			title: '晨跑',
			quantityBaseValue: 0,
			displayValue: '0',
			recordedToday: false,
			scheduledToday: false,
		};
		const restAwareModel = {
			...model,
			habits: [model.habits[0]!, restHabit],
			scheduledCount: 1,
		};
		const html = renderToStaticMarkup(
			<MemoryRouter>
				<TodayPageContent
					model={restAwareModel}
					todayLocalDate='2026-07-25'
					completedExpanded={true}
					pendingIds={new Set()}
					saveErrorIds={new Set()}
					onChangeHabit={vi.fn()}
					onCompleteHabit={vi.fn()}
					onDeleteHabit={vi.fn()}
					onSaveActual={vi.fn()}
					onSelectDate={vi.fn()}
					onToggleCompleted={vi.fn()}
				/>
			</MemoryRouter>,
		);

		expect(html).toContain('>1 / 1</strong>');
		expect(html).toContain('data-habit-id="rest-run"');
		expect(html).toContain('今日休息');
		expect(html).not.toContain('>1 / 2</strong>');
	});

	it('serializes deferred saves while keeping queued rows pending and errors isolated', async () => {
		const createTodaySaveQueue = (
			todayPageModel as unknown as {
				createTodaySaveQueue?: TodaySaveQueueFactory;
			}
		).createTodaySaveQueue;
		expect(createTodaySaveQueue).toBeTypeOf('function');
		if (!createTodaySaveQueue) return;

		const states: Array<{ pending: string[]; errors: string[] }> = [];
		const queue = createTodaySaveQueue((state) => {
			states.push({
				pending: [...state.pendingIds],
				errors: [...state.saveErrorIds],
			});
		});
		const firstGate = deferred<void>();
		const secondGate = deferred<void>();
		const order: string[] = [];
		let active = 0;
		let maximumActive = 0;

		const firstSave = queue.enqueue('first', async () => {
			order.push('first:start');
			active += 1;
			maximumActive = Math.max(maximumActive, active);
			try {
				await firstGate.promise;
				return 'first result';
			} finally {
				active -= 1;
				order.push('first:end');
			}
		});
		const secondSave = queue.enqueue('second', async () => {
			order.push('second:start');
			active += 1;
			maximumActive = Math.max(maximumActive, active);
			try {
				await secondGate.promise;
				return 'second result';
			} finally {
				active -= 1;
				order.push('second:end');
			}
		});

		expect(firstSave).toBeDefined();
		expect(secondSave).toBeDefined();
		expect(states.at(-1)).toEqual({
			pending: ['first', 'second'],
			errors: [],
		});
		await Promise.resolve();
		expect(order).toEqual(['first:start']);

		firstGate.reject(new Error('first failed'));
		await expect(firstSave).rejects.toThrow('first failed');
		await Promise.resolve();
		expect(order).toEqual(['first:start', 'first:end', 'second:start']);
		expect(maximumActive).toBe(1);
		expect(states.at(-1)).toEqual({
			pending: ['second'],
			errors: ['first'],
		});

		secondGate.resolve();
		await expect(secondSave).resolves.toBe('second result');
		expect(order).toEqual(['first:start', 'first:end', 'second:start', 'second:end']);
		expect(states.at(-1)).toEqual({
			pending: [],
			errors: ['first'],
		});
	});

	it('keeps the English overview compact and the three columns shrinkable', () => {
		const english = JSON.parse(
			readFileSync(
				new URL('../../../shared/lib/i18n/locales/en.json', import.meta.url),
				'utf8',
			),
		) as {
			shell: {
				today: {
					autoSaveLocal: string;
					overview: string;
				};
			};
		};
		const css = readFileSync(new URL('./TodayPage.module.css', import.meta.url), 'utf8');

		expect(english.shell.today.overview).toBe('{{completed}} / {{total}} done');
		expect(english.shell.today.autoSaveLocal).toBe('Saved locally');
		expect(css).toContain(
			'grid-template-columns: minmax(38px, auto) minmax(56px, 1fr);',
		);
		expect(css).toMatch(
			/\.overview strong,\s*\.overview small\s*\{[^}]*min-width:\s*0;[^}]*overflow:\s*hidden;/s,
		);
	});

	it('maps actionable domain failures without hiding unknown errors', () => {
		expect(todayErrorKey(new Error('TODAY_DRAFT_DATE_CHANGED'))).toBe('shell.today.dateChanged');
		expect(todayErrorKey(new Error('INVALID_QUANTITY'))).toBe('shell.today.invalidValue');
		expect(todayErrorKey(new Error('unexpected'))).toBe('shell.today.submitError');
	});
});
