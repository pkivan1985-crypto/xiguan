import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MoneyView } from '@entities/money';
import { MoneyRecordsPage } from './MoneyRecordsPage';
import { MoneyPaymentPage } from './MoneyPaymentPage';
import { MoneyMonthPage } from './MoneyMonthPage';

let view: MoneyView;
vi.mock('../model/useMoneyView', () => ({ useMoneyView: () => ({ view, error: false, reload: vi.fn() }) }));
function page(path: string, route: string, element: React.ReactNode) {
	return renderToStaticMarkup(<MemoryRouter initialEntries={[path]}><Routes><Route path={route} element={element} /></Routes></MemoryRouter>);
}
beforeEach(() => {
	view = { accounts: [], templates: [], completedMonths: [],
		bills: [{ id: 'bill', category: 'loan', title: '贷款', month: '2026-06', dueDate: '2026-06-01', amountCents: 100, note: '' }],
		entries: [{ id: 'entry', sourceId: 'money:entry', type: 'repayment', date: '2026-06-01', time: '10:00', item: '原账目', amountCents: 100, categoryLabel: '', accountLabel: '', note: '' }],
		payments: [{ id: 'payment', billId: 'bill', amountCents: 100, localDate: '2026-06-01', occurredTime: '10:00', accountLabel: '', note: '', sourceId: 'money:entry', effective: true }] };
});
describe('money full-page editing ownership', () => {
	it('lets a linked independent money entry edit its original fact rather than redirecting back to the payment', () => {
		const html = page('/money/records?month=2026-06&entry=money%3Aentry', '/money/records', <MoneyRecordsPage />);
		expect(html).toContain('编辑收支');
		expect(html).toContain('id="entry-amount"');
		expect(html).not.toContain('编辑原记录</a>');
	});
	it('routes owned payment entries to the payment editor, never an independent duplicate', () => {
		view.payments[0].ownedEntryId = 'entry';
		const html = page('/money/records?entry=money%3Aentry', '/money/records', <MoneyRecordsPage />);
		expect(html).toContain('/money/bills/bill/pay?payment=payment');
		expect(html).not.toContain('id="entry-amount"');
	});
	it('offers the original independent entry editor for a linked payment', () => {
		const html = page('/money/bills/bill/pay?payment=payment', '/money/bills/:billId/pay', <MoneyPaymentPage />);
		expect(html).toContain('/money/records?month=2026-06&amp;entry=money%3Aentry');
		expect(html).toContain('解除付款关联');
		expect(html).not.toContain('id="payment-amount"');
	});
	it('uses source identity in query links, avoiding colliding entry ids across original records', () => {
		const html = page('/money/records?month=2026-06', '/money/records', <MoneyRecordsPage />);
		expect(html).toContain('entry=money%3Aentry');
	});
	it('never calls an empty month paid or pending payment', () => {
		view.bills = []; view.payments = []; view.completedMonths = ['2026-06'];
		const html = page('/money/month/2026-06', '/money/month/:month', <MoneyMonthPage />);
		expect(html).toContain('本月暂无账单，不计为已付清月份');
		expect(html).not.toContain('本月账单已全部付清');
	});
});
