import { describe, expect, it } from 'vitest';

import { toggleExpandedItemId } from './toggleExpandedItemId';

describe('toggleExpandedItemId', () => {
	it('replaces the current item so two cards cannot stay expanded', () => {
		expect(toggleExpandedItemId('card-a', 'card-b')).toBe('card-b');
	});

	it('collapses the current item when it is selected again', () => {
		expect(toggleExpandedItemId('card-a', 'card-a')).toBeNull();
	});
});
