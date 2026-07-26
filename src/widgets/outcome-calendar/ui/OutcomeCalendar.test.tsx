import { readFileSync } from 'node:fs';

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { OutcomeCalendar } from './OutcomeCalendar';

const languageState = vi.hoisted(() => ({
	language: 'zh-CN',
	resolvedLanguage: 'zh-CN' as string | undefined,
}));

vi.mock('react-i18next', () => ({ useTranslation: () => ({
	i18n: languageState,
	t: (key: string, values?: Record<string, string>) => ({
		'shell.home.previousMonth': '上个月',
		'shell.home.nextMonth': '下个月',
		'shell.home.outcomeDay': `${values?.date} 成果日`,
	}[key] ?? key),
}) }));

describe('OutcomeCalendar', () => {
	it('keeps date numbers visible and renders real outcome icons instead of text glyphs', () => {
		const html = renderToStaticMarkup(<OutcomeCalendar
			year={2026}
			monthIndex={6}
			outcomeDates={['2026-07-02', '2026-07-05']}
			todayLocalDate='2026-07-12'
			onPreviousMonth={() => undefined}
			onNextMonth={() => undefined}
			canGoNext
		/>);

		expect(html.match(/data-outcome-marker="true"/g)).toHaveLength(2);
		expect(html).toContain('>2<');
		expect(html).toContain('>5<');
		expect(html).toContain('<svg');
		expect(html).not.toContain('✓');
		expect(html).toContain('2026-07-02 成果日');
		expect(html).toContain('2026-07-05 成果日');
	});

	it('marks today without falsely marking it as an outcome day', () => {
		const html = renderToStaticMarkup(<OutcomeCalendar
			year={2026}
			monthIndex={6}
			outcomeDates={[]}
			todayLocalDate='2026-07-12'
			onPreviousMonth={() => undefined}
			onNextMonth={() => undefined}
			canGoNext={false}
		/>);

		expect(html).toContain('aria-current="date"');
		expect(html).not.toContain('data-outcome-marker="true"');
		expect(html).toContain('disabled=""');
	});

	it('distinguishes the selected date, today and disabled future dates', () => {
		const html = renderToStaticMarkup(<OutcomeCalendar
			year={2026}
			monthIndex={6}
			outcomeDates={['2026-07-02']}
			todayLocalDate='2026-07-25'
			selectedDate='2026-07-02'
			onSelectDate={() => undefined}
			onPreviousMonth={() => undefined}
			onNextMonth={() => undefined}
			canGoNext={false}
		/>);

		expect(html).toContain('aria-pressed="true"');
		expect(html).toContain('aria-current="date"');
		expect(html).toContain('data-selected="true"');
		expect(html).toContain('data-today="true"');
		expect(html).toContain('disabled=""');
	});

	it('formats weekdays with resolved i18n language before the configured fallback language', () => {
		languageState.resolvedLanguage = 'en-US';
		languageState.language = 'zh-CN';
		const html = renderToStaticMarkup(<OutcomeCalendar
			year={2026}
			monthIndex={6}
			outcomeDates={[]}
			todayLocalDate='2026-07-25'
			onSelectDate={() => undefined}
			onPreviousMonth={() => undefined}
			onNextMonth={() => undefined}
			canGoNext={false}
		/>);

		expect(html).toContain('>M<');
		expect(html).toContain('>S<');
		expect(html).not.toContain('>一<');
		languageState.resolvedLanguage = 'zh-CN';
	});

	it('keeps a 44px touch contract while preserving the compact visible date cell', () => {
		const css = readFileSync(new URL('./OutcomeCalendar.module.css', import.meta.url), 'utf8');

		expect(css).toMatch(/\.day\s*\{[^}]*height:\s*33px;/s);
		expect(css).toMatch(/\.day::after\s*\{[^}]*inset:\s*-6px 0 -5px;/s);
	});

	it('uses the parent mobile content width instead of a narrower desktop-only cap', () => {
		const css = readFileSync(new URL('./OutcomeCalendar.module.css', import.meta.url), 'utf8');

		expect(css).toMatch(/\.calendar\s*\{[^}]*width:\s*100%;/s);
		expect(css).not.toMatch(/\.calendar\s*\{[^}]*max-width:\s*360px;/s);
	});
});
