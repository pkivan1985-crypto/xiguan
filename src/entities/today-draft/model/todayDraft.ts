import { parseLocalDate } from '@shared/lib/date';

import type { TodayDraft, TodaySlotAssignment } from './types';

export function validateTodayDraft(draft: TodayDraft, frozenLocalDate: string = draft.localDate): void {
	parseLocalDate(draft.localDate);
	if (draft.localDate !== frozenLocalDate) throw new Error('TODAY_DRAFT_DATE_CHANGED');
	if (draft.slots.length !== 6) throw new Error('TODAY_DRAFT_REQUIRES_SIX_SLOTS');
	const indexes = new Set(draft.slots.map(({ slotIndex }) => slotIndex));
	if (indexes.size !== 6 || ![0, 1, 2, 3, 4, 5].every((index) => indexes.has(index))) {
		throw new Error('TODAY_DRAFT_SLOT_INDEX_INVALID');
	}
	const cardIds = draft.slots.flatMap(({ userCardId }) => userCardId ? [userCardId] : []);
	if (new Set(cardIds).size !== cardIds.length) throw new Error('TODAY_DRAFT_CARD_DUPLICATED');
}

export function filledSlotsInOrder(draft: TodayDraft): TodaySlotAssignment[] {
	validateTodayDraft(draft);
	return [...draft.slots.filter(({ userCardId }) => userCardId)].sort((left, right) => left.slotIndex - right.slotIndex);
}
