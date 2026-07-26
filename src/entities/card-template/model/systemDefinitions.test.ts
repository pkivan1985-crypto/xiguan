import { describe, expect, it } from 'vitest';

import { SYSTEM_CARD_TEMPLATES, SYSTEM_CATEGORIES } from './systemDefinitions';

describe('system definitions', () => {
	it('defines the approved habit categories and enables the daily recording presets', () => {
		expect(SYSTEM_CATEGORIES.map(({ id }) => id)).toEqual(['sport', 'reading', 'life', 'output']);
		expect(SYSTEM_CATEGORIES.filter(({ enabled }) => enabled).map(({ id }) => id)).toEqual(['sport', 'reading', 'life']);
	});

	it('defines five mainstream tracking presets with stable daily metadata', () => {
		const running = SYSTEM_CARD_TEMPLATES.find(({ id }) => id === 'running');

		expect(running).toMatchObject({
			categoryId: 'sport',
			version: 1,
			enabled: true,
			trackingType: 'quantity',
			iconKey: 'activity',
			defaultDailyTargetBase: 5000,
			stepBase: 500,
			defaultStageMode: 'quantity',
			quantity: {
				baseUnit: 'meter',
				displayUnit: 'km',
				basePerDisplayUnit: 1000,
				confirmationThresholdDisplay: 100,
			},
		});
		expect(SYSTEM_CARD_TEMPLATES.map(({ id, trackingType }) => [id, trackingType])).toEqual([
			['running', 'quantity'],
			['water', 'count'],
			['reading-time', 'duration'],
			['sleep', 'check'],
			['screen-free', 'avoid'],
		]);
	});
});
