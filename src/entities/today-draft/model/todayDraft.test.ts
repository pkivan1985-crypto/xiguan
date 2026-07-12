import { describe, expect, it } from 'vitest';

import {
	assignTodayCard,
	createEmptyTodayDraft,
	filledSlotsInOrder,
	removeTodayCard,
	swapTodaySlots,
	updateTodayValue,
	validateTodayDraft,
} from './todayDraft';
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

	it('creates exactly six empty slots for a new local date', () => {
		const value = createEmptyTodayDraft('2026-07-12', '2026-07-12T08:00:00.000Z');

		expect(value).toEqual({
			localDate: '2026-07-12',
			status: 'editing',
			updatedAt: '2026-07-12T08:00:00.000Z',
			slots: [0, 1, 2, 3, 4, 5].map((slotIndex) => ({ slotIndex, userCardId: null, valueText: '' })),
		});
	});

	it('assigns once and rejects duplicate or occupied assignments', () => {
		const empty = createEmptyTodayDraft('2026-07-12', '2026-07-12T08:00:00.000Z');
		const assigned = assignTodayCard(empty, 0, 'card-a', '2026-07-12T08:01:00.000Z');

		expect(assigned.slots[0]).toEqual({ slotIndex: 0, userCardId: 'card-a', valueText: '' });
		expect(() => assignTodayCard(assigned, 1, 'card-a', '2026-07-12T08:02:00.000Z')).toThrow('TODAY_DRAFT_CARD_DUPLICATED');
		expect(() => assignTodayCard(assigned, 0, 'card-b', '2026-07-12T08:02:00.000Z')).toThrow('TODAY_DRAFT_SLOT_OCCUPIED');
	});

	it('preserves values while swapping and clears them when removing', () => {
		let value = createEmptyTodayDraft('2026-07-12', '2026-07-12T08:00:00.000Z');
		value = assignTodayCard(value, 0, 'card-a', '2026-07-12T08:01:00.000Z');
		value = updateTodayValue(value, 0, '5.20', '2026-07-12T08:02:00.000Z');
		value = assignTodayCard(value, 1, 'card-b', '2026-07-12T08:03:00.000Z');
		value = swapTodaySlots(value, 0, 1, '2026-07-12T08:04:00.000Z');

		expect(value.slots[1]).toEqual({ slotIndex: 1, userCardId: 'card-a', valueText: '5.20' });
		expect(removeTodayCard(value, 1, '2026-07-12T08:05:00.000Z').slots[1]).toEqual({ slotIndex: 1, userCardId: null, valueText: '' });
	});

	it('returns a submitted draft to editing on the next change', () => {
		const submitted: TodayDraft = {
			...createEmptyTodayDraft('2026-07-12', '2026-07-12T08:00:00.000Z'),
			status: 'submitted',
			lastSubmissionId: 'submission-a',
		};

		const changed = assignTodayCard(submitted, 0, 'card-a', '2026-07-12T09:00:00.000Z');
		expect(changed).toMatchObject({ status: 'editing', updatedAt: '2026-07-12T09:00:00.000Z' });
		expect(changed.lastSubmissionId).toBeUndefined();
	});
});
