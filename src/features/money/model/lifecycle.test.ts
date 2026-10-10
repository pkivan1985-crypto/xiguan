import { afterEach, expect, it, vi } from 'vitest';
import { appLifecycleCoordinator } from '@shared/lib/app-lifecycle';
import { loadMoneyInApp, saveMoneyBillInApp, saveMoneyPaymentInApp, revokeMoneyPaymentInApp, saveDebtAccountInApp, saveMoneyEntryInApp, linkMoneyPaymentInApp, saveMoneyTemplateInApp } from './money';
afterEach(() => vi.restoreAllMocks());
it('guards every in-app money operation, including load-generated bills and completion marks', async () => {
	const guard = vi.spyOn(appLifecycleCoordinator, 'runCriticalOperation').mockRejectedValue(new Error('GUARDED'));
	const actions = [
		() => loadMoneyInApp('2026-06'),
		() => saveMoneyBillInApp({ category: 'loan', title: 'loan', dueDate: '2026-06-01', amountCents: 100 }),
		() => saveMoneyPaymentInApp({ submissionId: 'test', billId: 'bill', amountCents: 100, localDate: '2026-06-01', occurredTime: '12:00' }),
		() => revokeMoneyPaymentInApp('payment'),
		() => saveDebtAccountInApp({ category: 'loan', title: 'loan' }),
		() => saveMoneyEntryInApp({ type: 'expense', item: 'test', amountCents: 100, localDate: '2026-06-01', occurredTime: '12:00' }),
		() => linkMoneyPaymentInApp({ submissionId: 'test', billId: 'bill', sourceId: 'source' }),
		() => saveMoneyTemplateInApp({ id: 'template', active: false }),
	];
	for (const action of actions) await expect(action()).rejects.toThrow('GUARDED');
	expect(guard).toHaveBeenCalledTimes(8);
	for (const call of guard.mock.calls) expect(call[0]).toBe('money-write');
});
