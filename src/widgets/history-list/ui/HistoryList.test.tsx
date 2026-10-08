import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router';

import { HistoryList } from './HistoryList';
import type { HistoryModel } from '@features/load-history';

vi.mock('react-i18next', () => ({ useTranslation: () => ({
	t: (key: string, values?: Record<string, string>) => ({
		'shell.history.today': '今天',
		'shell.history.correctRecord': `修改${values?.title}`,
		'shell.history.readOnly': '只读',
		'shell.history.unavailable': '记录关系不可用',
	}[key] ?? key),
}) }));

const model: HistoryModel = {
	groups: [
		{
			localDate: '2026-07-12',
			records: [{
				id: 'today', localDate: '2026-07-12', cardTitle: '晨跑', quantityBaseValue: 7_500,
				displayValue: '7.50', displayUnit: 'km', lastSavedAt: '2026-07-12T08:42:00.000Z',
				basePerDisplayUnit: 1000, maxDecimalPlaces: 3, confirmationThresholdDisplay: 100,
				longTermGoalTitle: '累计 100 km', stageGoalTitle: '阶段 20 km', canCorrect: true, relationAvailable: true,
			}],
		},
		{
			localDate: '2026-07-10',
			records: [{
				id: 'past', localDate: '2026-07-10', cardTitle: '晨跑', quantityBaseValue: 5_000,
				displayValue: '5.00', displayUnit: 'km', lastSavedAt: '2026-07-10T19:26:00.000Z',
				basePerDisplayUnit: 1000, maxDecimalPlaces: 3, confirmationThresholdDisplay: 100,
				canCorrect: false, relationAvailable: true,
			}],
		},
	],
};

describe('HistoryList', () => {
	it('labels today, shows facts, and exposes correction only for today', () => {
		const html = renderToStaticMarkup(<HistoryList model={model} currentLocalDate='2026-07-12' onCorrect={() => undefined} />);

		expect(html).toContain('今天');
		expect(html).toContain('7.50');
		expect(html).toContain('km');
		expect(html).toContain('阶段 20 km');
		expect(html.match(/<button/g)).toHaveLength(1);
		expect(html).toContain('修改晨跑');
		expect(html).toContain('只读');
	});

	it('shows amounts and opens historical bookkeeping entries for correction', () => {
		const bookkeepingModel: HistoryModel = { groups: [{ localDate: '2026-07-10', records: [{
			id: 'ledger:2026-07-10', userCardId: 'ledger', localDate: '2026-07-10', cardTitle: '日常记账', officialCardId: 'bookkeeping',
			quantityBaseValue: 1, displayValue: '1', displayUnit: '笔', basePerDisplayUnit: 1, maxDecimalPlaces: 0,
			confirmationThresholdDisplay: Number.MAX_SAFE_INTEGER, lastSavedAt: '2026-07-10T12:30:00.000Z', canCorrect: false, relationAvailable: true,
			bookkeepingEntries: [{ id: 'meal', type: 'expense', amountCents: 3850, categoryId: 'food', categoryLabel: '餐饮', accountId: 'cash', accountLabel: '现金', item: '午餐', localDate: '2026-07-10', occurredTime: '12:30', createdAt: '2026-07-10T04:30:00.000Z', updatedAt: '2026-07-10T04:30:00.000Z' }],
		}] }] };

		const html = renderToStaticMarkup(<MemoryRouter><HistoryList model={bookkeepingModel} currentLocalDate='2026-07-12' onCorrect={() => undefined} /></MemoryRouter>);

		expect(html).toContain('−¥38.50');
		expect(html).toContain('href="/record/ledger?date=2026-07-10&amp;entry=meal"');
		expect(html).not.toContain('只读');
	});
});
