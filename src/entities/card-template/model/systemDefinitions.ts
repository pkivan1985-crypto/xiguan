import type { CategoryDefinition } from '@entities/category';

import type { CardTemplate } from './types';

export const SYSTEM_CATEGORIES: readonly CategoryDefinition[] = Object.freeze([
	{ id: 'sport', title: '运动', sortOrder: 0, enabled: true },
	{ id: 'reading', title: '阅读', sortOrder: 1, enabled: false },
	{ id: 'output', title: '输出', sortOrder: 2, enabled: false },
]);

export const SYSTEM_CARD_TEMPLATES: readonly CardTemplate[] = Object.freeze([
	{
		id: 'running',
		categoryId: 'sport',
		title: '跑步',
		sortOrder: 0,
		enabled: true,
		version: 1,
		defaultStageMode: 'quantity',
		quantity: {
			baseUnit: 'meter',
			displayUnit: 'km',
			basePerDisplayUnit: 1000,
			maxDecimalPlaces: 3,
			confirmationThresholdDisplay: 100,
		},
	},
]);
