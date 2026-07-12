import { parseLocalDate } from '@shared/lib/date';

import type { LocalDate } from '@shared/lib/date';
import type { TodayDraft, TodaySlotAssignment } from './types';

const TODAY_SLOT_INDEXES = [0, 1, 2, 3, 4, 5] as const;

function slotAt(draft: TodayDraft, slotIndex: number): TodaySlotAssignment {
	const slot = draft.slots.find((candidate) => candidate.slotIndex === slotIndex);
	if (!slot) throw new Error('TODAY_DRAFT_SLOT_INDEX_INVALID');
	return slot;
}

function returnToEditing(draft: TodayDraft, slots: TodaySlotAssignment[], nowIso: string): TodayDraft {
	return {
		localDate: draft.localDate,
		status: 'editing',
		slots,
		updatedAt: nowIso,
	};
}

export function createEmptyTodayDraft(localDate: LocalDate, nowIso: string): TodayDraft {
	parseLocalDate(localDate);
	return {
		localDate,
		status: 'editing',
		slots: TODAY_SLOT_INDEXES.map((slotIndex) => ({ slotIndex, userCardId: null, valueText: '' })),
		updatedAt: nowIso,
	};
}

export function assignTodayCard(
	draft: TodayDraft,
	slotIndex: number,
	userCardId: string,
	nowIso: string,
): TodayDraft {
	validateTodayDraft(draft);
	const target = slotAt(draft, slotIndex);
	if (target.userCardId) throw new Error('TODAY_DRAFT_SLOT_OCCUPIED');
	if (draft.slots.some((slot) => slot.userCardId === userCardId)) throw new Error('TODAY_DRAFT_CARD_DUPLICATED');
	return returnToEditing(
		draft,
		draft.slots.map((slot) => slot.slotIndex === slotIndex ? { ...slot, userCardId, valueText: '' } : slot),
		nowIso,
	);
}

export function removeTodayCard(draft: TodayDraft, slotIndex: number, nowIso: string): TodayDraft {
	validateTodayDraft(draft);
	slotAt(draft, slotIndex);
	return returnToEditing(
		draft,
		draft.slots.map((slot) => slot.slotIndex === slotIndex ? { ...slot, userCardId: null, valueText: '' } : slot),
		nowIso,
	);
}

export function swapTodaySlots(draft: TodayDraft, firstIndex: number, secondIndex: number, nowIso: string): TodayDraft {
	validateTodayDraft(draft);
	const first = slotAt(draft, firstIndex);
	const second = slotAt(draft, secondIndex);
	return returnToEditing(
		draft,
		draft.slots.map((slot) => {
			if (slot.slotIndex === firstIndex) return { ...slot, userCardId: second.userCardId, valueText: second.valueText };
			if (slot.slotIndex === secondIndex) return { ...slot, userCardId: first.userCardId, valueText: first.valueText };
			return slot;
		}),
		nowIso,
	);
}

export function updateTodayValue(draft: TodayDraft, slotIndex: number, valueText: string, nowIso: string): TodayDraft {
	validateTodayDraft(draft);
	const target = slotAt(draft, slotIndex);
	if (!target.userCardId) throw new Error('TODAY_DRAFT_SLOT_EMPTY');
	return returnToEditing(
		draft,
		draft.slots.map((slot) => slot.slotIndex === slotIndex ? { ...slot, valueText } : slot),
		nowIso,
	);
}

export function validateTodayDraft(draft: TodayDraft, frozenLocalDate: string = draft.localDate): void {
	parseLocalDate(draft.localDate);
	if (draft.localDate !== frozenLocalDate) throw new Error('TODAY_DRAFT_DATE_CHANGED');
	if (draft.slots.length !== 6) throw new Error('TODAY_DRAFT_REQUIRES_SIX_SLOTS');
	const indexes = new Set(draft.slots.map(({ slotIndex }) => slotIndex));
	if (indexes.size !== 6 || !TODAY_SLOT_INDEXES.every((index) => indexes.has(index))) {
		throw new Error('TODAY_DRAFT_SLOT_INDEX_INVALID');
	}
	const cardIds = draft.slots.flatMap(({ userCardId }) => userCardId ? [userCardId] : []);
	if (new Set(cardIds).size !== cardIds.length) throw new Error('TODAY_DRAFT_CARD_DUPLICATED');
}

export function filledSlotsInOrder(draft: TodayDraft): TodaySlotAssignment[] {
	validateTodayDraft(draft);
	return [...draft.slots.filter(({ userCardId }) => userCardId)].sort((left, right) => left.slotIndex - right.slotIndex);
}
