import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import type { DailyHabitView } from '@features/load-daily-habits';
import { BookkeepingRecordPage } from './BookkeepingRecordPage';

const historicalLedger = {
	id: 'ledger', title: '日常记账', officialCardId: 'bookkeeping', trackingType: 'count', iconKey: 'wallet', accent: 'amber',
	quantityBaseValue: 1, displayValue: '1', displayUnit: '笔', stepBase: 1, basePerDisplayUnit: 1, maxDecimalPlaces: 0,
	baseDailyTargetBase: 1, dailyTargetBase: 1, carryInBaseValue: 0, totalQuantityBaseValue: 1, activeDays: 1,
	supportsTrainingDetails: false, habitConfig: { kind: 'bookkeeping', startDate: '2026-07-01', reminderEnabled: false, accounts: [{ id: 'cash', label: '现金' }], categories: [{ id: 'food', label: '餐饮' }], budgetReminderEnabled: false },
	details: { kind: 'bookkeeping', entries: [{ id: 'meal', type: 'expense', amountCents: 3850, categoryId: 'food', categoryLabel: '餐饮', accountId: 'cash', accountLabel: '现金', item: '午餐', localDate: '2026-07-10', occurredTime: '12:30', createdAt: '2026-07-10T04:30:00.000Z', updatedAt: '2026-07-10T04:30:00.000Z' }] },
	scheduledToday: false, recordedToday: true,
} as DailyHabitView;

describe('BookkeepingRecordPage compact presentation', () => {
	it('uses the app accent and keeps the daily ledger dense on mobile', () => {
		const css = readFileSync(new URL('./BookkeepingRecordPage.module.css', import.meta.url), 'utf8');

		expect(css).toMatch(/\.page\s*\{[^}]*gap:\s*10px;/s);
		expect(css).toMatch(/\.header\s*\{[^}]*min-height:\s*58px;/s);
		expect(css).toMatch(/\.entryPage\s*\{[^}]*grid-template-rows:\s*auto auto;[^}]*align-content:\s*start;/s);
		expect(css).toMatch(/\.header > button\s*\{[^}]*appearance:\s*none;[^}]*background:\s*transparent;/s);
		expect(css).toMatch(/\.summary\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\) minmax\(0, 1fr\) auto;/s);
		expect(css).toMatch(/\.list > button\s*\{[^}]*min-height:\s*60px;[^}]*background:\s*transparent;/s);
		expect(css).toMatch(/\.ledgerActions button:first-child, \.save\s*\{[^}]*background:\s*var\(--accent-color\);/s);
	});

	it('labels past dates accurately and keeps historical amounts visible', () => {
		const html = renderToStaticMarkup(createElement(MemoryRouter, { initialEntries: ['/record/ledger?date=2026-07-10'] },
			createElement(BookkeepingRecordPage, { habit: historicalLedger, localDate: '2026-07-10' }),
		));

		expect(html).toContain('<h1>账本</h1>');
		expect(html).toContain('当日支出');
		expect(html).toContain('-¥38.50');
		expect(html).not.toContain('今日账本');
		expect(html).not.toContain('今日支出');
	});
});
