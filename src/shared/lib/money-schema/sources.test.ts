import { expect, it } from 'vitest';
import { externalMoneyEntries, type MoneySourceRecord } from './sources';

it('uses the same legacy expense identity as the original editor and preserves it after conversion', () => {
	const record: MoneySourceRecord = { id: 'card:2026-06-01', userCardId: 'card', localDate: '2026-06-01', quantityBaseValue: 805,
		lastSavedAt: '2026-06-01T10:15:00+08:00', details: { kind: 'extra-expense', item: '旧额外开支', reason: '反思原文' } };
	const legacy = externalMoneyEntries([record])[0];
	expect(legacy.editUrl).toBe('/record/card?date=2026-06-01&entry=legacy-2026-06-01');
	expect(legacy.sourceId).toBe('extra-expense:card%3A2026-06-01:legacy-2026-06-01');
	expect(legacy).toMatchObject({ amountCents: 805, note: '反思原文' });
	const modern = externalMoneyEntries([{ ...record, details: { kind: 'extra-expense', entries: [{ id: 'legacy-2026-06-01', amountCents: 805, item: '旧额外开支', reason: '反思原文', occurredTime: legacy.time }] } }])[0];
	expect(modern).toEqual(legacy);
});
it('encodes original record and entry ids independently and excludes deleted facts', () => {
	const record: MoneySourceRecord = { id: 'card:day', userCardId: '卡片 / 一', localDate: '2026-06-01', quantityBaseValue: 1,
		details: { kind: 'bookkeeping', entries: [{ id: 'entry:one', amountCents: 50, type: 'expense', item: '记录', localDate: '2026-06-01', occurredTime: '09:00' }] } };
	const entry = externalMoneyEntries([record])[0];
	expect(entry.sourceId).toBe('bookkeeping:card%3Aday:entry%3Aone');
	expect(entry.editUrl).toContain(encodeURIComponent(record.userCardId));
	expect(externalMoneyEntries([{ ...record, deletedAt: '2026-06-02T00:00:00Z' }])).toEqual([]);
});
