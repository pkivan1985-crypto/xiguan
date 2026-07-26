import type { DeckCardView, DeckCategoryView } from '@features/load-card-deck';

export type DeckFilterId = 'all' | 'sport' | 'reading' | 'life';

export interface FilteredDeckCard {
	card: DeckCardView;
	category: DeckCategoryView;
}

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

export {
	filterDeckCards,
	resolveDefaultExpandedItemId,
	toggleExpandedItemId,
};
