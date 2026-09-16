import { describe, expect, it } from 'vitest';
import type { BookkeepingEntry } from '@entities/action-record';
import { searchBookkeepingEntries } from './searchBookkeepingEntries';

const entries: BookkeepingEntry[] = [
	{ id: 'a', type: 'expense', amountCents: 3850, categoryId: 'food', categoryLabel: '餐饮', accountId: 'wechat', accountLabel: '微信', item: '午餐', note: '和朋友', localDate: '2026-09-15', occurredTime: '12:30', createdAt: '', updatedAt: '' },
	{ id: 'b', type: 'income', amountCents: 120000, categoryId: 'salary', categoryLabel: '工资', accountId: 'bank', accountLabel: '银行卡', item: '兼职', note: '', localDate: '2026-08-20', occurredTime: '09:00', createdAt: '', updatedAt: '' },
];

describe('searchBookkeepingEntries', () => {
	it('returns the whole history when the query is empty, not only the selected statistics month', () => {
		expect(searchBookkeepingEntries(entries, '  ')).toEqual(entries);
	});
	it.each(['午餐', '餐饮', '微信', '朋友', '2026-09-15', '38.50', '支出'])('finds the expense by %s', (query) => {
		expect(searchBookkeepingEntries(entries, query).map(({ id }) => id)).toEqual(['a']);
	});
	it.each(['兼职', '银行卡', '2026-08', '1200.00', '收入'])('finds a record in an earlier month by %s', (query) => {
		expect(searchBookkeepingEntries(entries, query).map(({ id }) => id)).toEqual(['b']);
	});
	it('does not mutate the source entries when no result matches', () => {
		expect(searchBookkeepingEntries(entries, '不存在')).toEqual([]);
		expect(entries).toHaveLength(2);
	});
});
