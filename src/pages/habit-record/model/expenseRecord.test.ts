import { describe, expect, it } from 'vitest';

import {
	buildExpenseLineItem,
	mergeExpenseLineItem,
	normalizeExpenseEntries,
	removeExpenseLineItem,
} from './expenseRecord';

describe('expense record entries', () => {
	it('builds one independently editable expense line in integer cents', () => {
		expect(buildExpenseLineItem({
			amount: '68.00',
			item: '蓝牙耳机',
			reason: '旧耳机损坏，通勤需要',
			bankBalance: '8420',
			earnBackDays: '1',
			compensation: '本周少喝 2 杯奶茶',
			necessity: 'necessary',
			occurredTime: '14:30',
		}, {
			id: 'expense-a',
			nowIso: '2026-08-26T06:30:00.000Z',
		})).toEqual({
			id: 'expense-a',
			amountCents: 6800,
			item: '蓝牙耳机',
			reason: '旧耳机损坏，通勤需要',
			bankBalanceCents: 842000,
			earnBackDays: 1,
			compensation: '本周少喝 2 杯奶茶',
			necessity: 'necessary',
			occurredTime: '14:30',
			createdAt: '2026-08-26T06:30:00.000Z',
			updatedAt: '2026-08-26T06:30:00.000Z',
		});
	});

	it('rejects an empty amount and incomplete reflection', () => {
		expect(buildExpenseLineItem({
			amount: '',
			item: '',
			reason: '',
			bankBalance: '',
			earnBackDays: '',
			compensation: '',
			necessity: 'delayable',
			occurredTime: '',
		}, { id: 'expense-a', nowIso: '2026-08-26T06:30:00.000Z' })).toBeNull();
	});

	it('merges multiple lines into one daily aggregate and edits only the selected line', () => {
		const first = buildExpenseLineItem({
			amount: '28', item: '早餐', reason: '临时外卖', bankBalance: '', earnBackDays: '',
			compensation: '', necessity: 'delayable', occurredTime: '08:10',
		}, { id: 'expense-a', nowIso: '2026-08-26T00:10:00.000Z' })!;
		const second = buildExpenseLineItem({
			amount: '35', item: '打车', reason: '赶时间', bankBalance: '', earnBackDays: '',
			compensation: '', necessity: 'necessary', occurredTime: '09:20',
		}, { id: 'expense-b', nowIso: '2026-08-26T01:20:00.000Z' })!;
		const aggregate = mergeExpenseLineItem({ kind: 'extra-expense', entries: [first] }, second);

		expect(aggregate.quantityBaseValue).toBe(6300);
		expect(aggregate.details.entries.map(({ id }) => id)).toEqual(['expense-a', 'expense-b']);
		expect(removeExpenseLineItem(aggregate.details, 'expense-a')).toMatchObject({
			quantityBaseValue: 3500,
			details: { entries: [{ id: 'expense-b' }] },
		});
	});

	it('adapts one legacy daily expense into the first line without losing reflection data', () => {
		expect(normalizeExpenseEntries({
			kind: 'extra-expense', item: '旧记录', reason: '兼容测试', necessity: 'impulse',
		}, {
			fallbackAmountCents: 1200,
			fallbackId: 'legacy-2026-08-25',
			fallbackTimestamp: '2026-08-25T08:00:00.000Z',
		})).toEqual([expect.objectContaining({
			id: 'legacy-2026-08-25', amountCents: 1200, item: '旧记录', reason: '兼容测试',
		})]);
	});
});
