import { describe, expect, it } from 'vitest';

import { filledSlotsInOrder, validateTodayDraft } from './todayDraft';
import type { TodayDraft, TodaySlotAssignment } from './types';

function slot(slotIndex: number, userCardId: string | null = null): TodaySlotAssignment {
	return { slotIndex, userCardId, valueText: userCardId ? '1' : '' };
}

function draft(slots: TodaySlotAssignment[]): TodayDraft {
	return { localDate: '2026-07-11', status: 'editing', slots, updatedAt: '2026-07-11T12:00:00.000Z' };
}

describe('today draft rules', () => {
	it('requires exactly the six indexes from zero through five', () => {
		expect(() => validateTodayDraft(draft([0, 1, 2, 3, 4].map((index) => slot(index))))).toThrow('TODAY_DRAFT_REQUIRES_SIX_SLOTS');
		expect(() => validateTodayDraft(draft([0, 1, 2, 3, 4, 4].map((index) => slot(index))))).toThrow('TODAY_DRAFT_SLOT_INDEX_INVALID');
	});

	it('rejects the same user card in two slots', () => {
		expect(() => validateTodayDraft(draft([slot(0, 'card-a'), slot(1, 'card-a'), slot(2), slot(3), slot(4), slot(5)]))).toThrow('TODAY_DRAFT_CARD_DUPLICATED');
	});

	it('returns filled slots in stable slot order', () => {
		const value = draft([slot(5), slot(3, 'card-b'), slot(1, 'card-a'), slot(4), slot(0), slot(2)]);

		expect(filledSlotsInOrder(value).map(({ userCardId }) => userCardId)).toEqual(['card-a', 'card-b']);
	});

	it('rejects a draft when the frozen transaction date changed', () => {
		expect(() => validateTodayDraft(draft([0, 1, 2, 3, 4, 5].map((index) => slot(index))), '2026-07-12')).toThrow('TODAY_DRAFT_DATE_CHANGED');
	});
});
