/* eslint-disable i18next/no-literal-string -- Filter and transition action values are stable UI-state identifiers. */
import type { DeckCardView, DeckCategoryView } from '@features/load-card-deck';

export type DeckFilterId = 'all' | 'sport' | 'reading' | 'life';

export interface FilteredDeckCard {
	card: DeckCardView;
	category: DeckCategoryView;
}

export interface CardDeckState {
	filter: DeckFilterId;
	expandedItemId: string | null;
}

export type CardDeckAction =
	| { type: 'selectFilter'; filter: DeckFilterId }
	| { type: 'toggleCard'; cardId: string };

function filterDeckCards(
	categories: readonly DeckCategoryView[],
	filter: DeckFilterId,
): FilteredDeckCard[] {
	return categories.flatMap((category) => {
		if (filter !== 'all' && category.id !== filter) return [];
		return category.cards.map((card) => ({ card, category }));
	});
}

function resolveDefaultExpandedItemId(cards: readonly FilteredDeckCard[]): string | null {
	return cards.find(({ card }) => card.longTermGoal || card.stageGoal)?.card.id ?? null;
}

function toggleExpandedItemId(
	currentItemId: string | null,
	itemId: string,
): string | null {
	return currentItemId === itemId ? null : itemId;
}

function createCardDeckState(
	categories: readonly DeckCategoryView[],
): CardDeckState {
	const filter = 'all';
	return {
		filter,
		expandedItemId: resolveDefaultExpandedItemId(filterDeckCards(categories, filter)),
	};
}

function transitionCardDeckState(
	state: CardDeckState,
	action: CardDeckAction,
	categories: readonly DeckCategoryView[],
): CardDeckState {
	if (action.type === 'selectFilter') {
		return {
			filter: action.filter,
			expandedItemId: resolveDefaultExpandedItemId(
				filterDeckCards(categories, action.filter),
			),
		};
	}

	const visible = filterDeckCards(categories, state.filter);
	if (!visible.some(({ card }) => card.id === action.cardId)) return state;
	return {
		...state,
		expandedItemId: toggleExpandedItemId(state.expandedItemId, action.cardId),
	};
}

export {
	createCardDeckState,
	filterDeckCards,
	resolveDefaultExpandedItemId,
	transitionCardDeckState,
	toggleExpandedItemId,
};
