import { describe, expect, it } from 'vitest';

import {
	createCardDeckState,
	transitionCardDeckState,
	toggleExpandedItemId,
} from './toggleExpandedItemId';

describe('toggleExpandedItemId', () => {
	it('replaces the current item so two cards cannot stay expanded', () => {
		expect(toggleExpandedItemId('card-a', 'card-b')).toBe('card-b');
	});

	it('collapses the current item when it is selected again', () => {
		expect(toggleExpandedItemId('card-a', 'card-a')).toBeNull();
	});

	it('ignores a toggle for a card outside the current filter', () => {
		const categories = [{
			id: 'reading',
			title: '阅读',
			enabled: true,
			cards: [{
				id: 'read',
				title: '阅读',
				template: {
					id: 'reading-time',
					categoryId: 'reading',
					title: '阅读',
					sortOrder: 0,
					enabled: true,
					version: 1,
					defaultStageMode: 'quantity' as const,
					quantity: {
						baseUnit: 'minute',
						displayUnit: '分钟',
						basePerDisplayUnit: 1,
						maxDecimalPlaces: 0,
						confirmationThresholdDisplay: 720,
					},
				},
				todayStatus: { kind: 'target' as const, targetBase: 30 },
			}],
		}];
		const initial = createCardDeckState(categories);
		const reading = transitionCardDeckState(initial, {
			type: 'selectFilter',
			filter: 'reading',
		}, categories);

		expect(transitionCardDeckState(reading, {
			type: 'toggleCard',
			cardId: 'not-visible',
		}, categories)).toEqual(reading);
	});
});
