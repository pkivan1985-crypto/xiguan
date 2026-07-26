import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { WeekStrip } from '../ui/WeekStrip';
import { buildWeekDayState, buildWeekDays } from './buildWeekDays';

vi.mock('react-i18next', () => ({
	useTranslation: () => ({
		t: (key: string) => {
			const translations: Record<string, string> = {
				'shell.today.outcomeDate': '已有成果',
				'shell.today.weekLabel': '本周日期',
				'shell.today.weekdays.friday': '五',
				'shell.today.weekdays.monday': '一',
				'shell.today.weekdays.saturday': '六',
				'shell.today.weekdays.sunday': '日',
				'shell.today.weekdays.thursday': '四',
				'shell.today.weekdays.tuesday': '二',
				'shell.today.weekdays.wednesday': '三',
			};
			return translations[key] ?? key;
		},
	}),
}));

describe('buildWeekDays', () => {
	it('builds a Monday-first week around the selected local date', () => {
		expect(buildWeekDays('2026-07-25').map(({ localDate }) => localDate)).toEqual([
			'2026-07-20',
			'2026-07-21',
			'2026-07-22',
			'2026-07-23',
			'2026-07-24',
			'2026-07-25',
			'2026-07-26',
		]);
	});

	it('marks real outcome dates in the seven-day model', () => {
		expect(buildWeekDays('2026-07-25', ['2026-07-20', '2026-07-24']).map(({ localDate, hasOutcome }) => ({
			localDate,
			hasOutcome,
		}))).toEqual([
			{ localDate: '2026-07-20', hasOutcome: true },
			{ localDate: '2026-07-21', hasOutcome: false },
			{ localDate: '2026-07-22', hasOutcome: false },
			{ localDate: '2026-07-23', hasOutcome: false },
			{ localDate: '2026-07-24', hasOutcome: true },
			{ localDate: '2026-07-25', hasOutcome: false },
			{ localDate: '2026-07-26', hasOutcome: false },
		]);
	});

	it('keeps past dates selectable and disables future dates', () => {
		expect(buildWeekDayState(
			{ localDate: '2026-07-20', dayOfMonth: 20, weekdayIndex: 0, hasOutcome: true },
			'2026-07-25',
			'2026-07-25',
		)).toEqual({ selected: false, disabled: false, hasOutcome: true });
		expect(buildWeekDayState(
			{ localDate: '2026-07-26', dayOfMonth: 26, weekdayIndex: 6, hasOutcome: false },
			'2026-07-25',
			'2026-07-25',
		)).toEqual({ selected: false, disabled: true, hasOutcome: false });
	});

	it('renders seven dates, a selected state, real outcome icons, and a disabled future date', () => {
		const html = renderToStaticMarkup(createElement(WeekStrip, {
			selectedLocalDate: '2026-07-25',
			todayLocalDate: '2026-07-25',
			outcomeDates: ['2026-07-20', '2026-07-24', '2026-07-25'],
			onSelect: vi.fn(),
		}));

		expect(html.match(/<button/g)).toHaveLength(7);
		expect(html).toContain('aria-pressed="true"');
		expect(html.match(/aria-label="已有成果"/g)).toHaveLength(3);
		expect(html.match(/<svg/g)).toHaveLength(3);
		expect(html).toMatch(/<button[^>]*disabled=""[^>]*>.*?<strong>26<\/strong>/);
		expect(html).toMatch(/<button(?![^>]*disabled)[^>]*>.*?<strong>20<\/strong>/);
	});
});
