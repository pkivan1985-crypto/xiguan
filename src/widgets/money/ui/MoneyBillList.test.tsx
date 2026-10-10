import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';

import { MoneyBillCategory, MoneyBillRow, type MoneyBillRowView } from './MoneyBillList';

const bill: MoneyBillRowView = {
	id: 'bill-1', name: '信用卡', dueDate: '2026-10-06', plannedCents: 10000,
	paidCents: 3000, remainingCents: 7000, completed: false, overdue: true,
};

function markup(view: MoneyBillRowView) {
	return renderToStaticMarkup(<MemoryRouter><MoneyBillRow bill={view} /></MemoryRouter>);
}

describe('money bill interactions', () => {
	it('keeps the row detail and rightmost payment action separate', () => {
		const html = markup(bill);
		expect(html).toContain('href="/money/bills/bill-1"');
		expect(html).toContain('href="/money/bills/bill-1/pay"');
		expect(html.match(/data-payment-circle=/g)).toHaveLength(1);
		expect(html).toContain('已付 ¥30.00');
		expect(html).toContain('待付 ¥70.00');
		expect(html).toContain('逾期');
	});

	it('opens details from a completed circle, never revokes on a second tap', () => {
		const html = markup({ ...bill, paidCents: 10000, remainingCents: 0, completed: true, overdue: false });
		expect(html.match(/href="\/money\/bills\/bill-1"/g)).toHaveLength(2);
		expect(html).not.toContain('/pay');
		expect(html).not.toContain('撤销');
		expect(html).toContain('已付清');
		expect(html.match(/data-payment-circle=/g)).toHaveLength(1);
	});

	it('keeps subtotal and unpaid information visible while folded and add does not toggle', () => {
		const onToggle = vi.fn();
		const category = MoneyBillCategory({ category: 'credit', title: '信用卡', month: '2026-10', bills: [bill], completedCount: 0, plannedCents: 10000, remainingCents: 7000, expanded: false, onToggle });
		const html = renderToStaticMarkup(<MemoryRouter>{category}</MemoryRouter>);
		expect(html).toContain('aria-expanded="false"');
		expect(html).toContain('应付小计');
		expect(html).toContain('¥100.00');
		expect(html).toContain('待付 ¥70.00');
		expect(html).toContain('/money/bills/new?category=credit&amp;month=2026-10');
		expect(html).not.toContain('data-bill-id=');
		expect(onToggle).not.toHaveBeenCalled();
	});
});
