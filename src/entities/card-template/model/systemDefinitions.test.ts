import { describe, expect, it } from 'vitest';

import { SYSTEM_CARD_TEMPLATES, SYSTEM_CATEGORIES } from './systemDefinitions';

describe('system definitions', () => {
	it('defines the three approved categories while enabling only the running slice', () => {
		expect(SYSTEM_CATEGORIES.map(({ id }) => id)).toEqual(['sport', 'reading', 'output']);
		expect(SYSTEM_CATEGORIES.filter(({ enabled }) => enabled).map(({ id }) => id)).toEqual(['sport']);
	});

	it('defines running v1 in integer meters with quantity completion', () => {
		const running = SYSTEM_CARD_TEMPLATES.find(({ id }) => id === 'running');

		expect(running).toMatchObject({
			categoryId: 'sport',
			version: 1,
			enabled: true,
			defaultStageMode: 'quantity',
			quantity: {
				baseUnit: 'meter',
				displayUnit: 'km',
				basePerDisplayUnit: 1000,
				confirmationThresholdDisplay: 100,
			},
		});
	});
});
