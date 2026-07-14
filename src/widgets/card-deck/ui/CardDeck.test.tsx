import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { DeckCategoryView } from '@features/load-card-deck';

import { toggleExpandedItemId } from '../model/toggleExpandedItemId';
import { CardDeck } from './CardDeck';

const template = {
	id: 'running', categoryId: 'sport', title: '跑步', sortOrder: 0, enabled: true, version: 1, defaultStageMode: 'quantity' as const,
	quantity: { baseUnit: 'meter', displayUnit: 'km', basePerDisplayUnit: 1000, maxDecimalPlaces: 3, confirmationThresholdDisplay: 100 },
};

const categories: DeckCategoryView[] = [
	{ id: 'sport', title: '运动', enabled: true, cards: [] },
	{ id: 'reading', title: '阅读', enabled: false, cards: [] },
	{ id: 'output', title: '输出', enabled: false, cards: [] },
];

describe('CardDeck', () => {
	it('offers creation only for sport and labels disabled categories', () => {
		const html = renderToStaticMarkup(<CardDeck
			categories={categories}
			onCreateRunningCard={vi.fn()}
			copy={{ create: '新建', comingSoon: '即将开放', empty: '还没有循环卡', longTerm: '长期目标', stage: '阶段目标' }}
		/>);

		expect((html.match(/>新建</g) ?? []).length).toBe(1);
		expect((html.match(/即将开放/g) ?? []).length).toBe(2);
	});

	it('shows two compact cards collapsed by default', () => {
		const cards = [
			{ id: 'card-a', title: '晨跑', template, longTermGoal: { id: 'goal-a', userCardId: 'card-a', title: '累计 100 公里', targetQuantityBase: 100000, status: 'active' as const, startDate: '2026-07-01', createdAt: '2026-07-01', updatedAt: '2026-07-01' }, longTermProgress: { quantityBaseValue: 20000, activeDays: 5, ratio: 0.2, completed: false } },
			{ id: 'card-b', title: '夜跑', template, longTermGoal: { id: 'goal-b', userCardId: 'card-b', title: '累计 50 公里', targetQuantityBase: 50000, status: 'active' as const, startDate: '2026-07-01', createdAt: '2026-07-01', updatedAt: '2026-07-01' }, longTermProgress: { quantityBaseValue: 25000, activeDays: 6, ratio: 0.5, completed: false } },
		];
		const html = renderToStaticMarkup(<CardDeck
			categories={[{ ...categories[0], cards }]}
			onCreateRunningCard={vi.fn()}
			copy={{ create: '新建', comingSoon: '即将开放', empty: '还没有循环卡', longTerm: '长期目标', stage: '阶段目标' }}
		/>);

		expect((html.match(/aria-expanded="true"/g) ?? []).length).toBe(1);
		expect((html.match(/aria-expanded="false"/g) ?? []).length).toBe(2);
		expect(html).toContain('晨跑');
		expect(html).toContain('夜跑');
		expect(html).not.toContain('累计 100 公里');
	});

	it('toggles one card without changing another card state', () => {
		expect([...toggleExpandedItemId(new Set(), 'card-a')]).toEqual(['card-a']);
		expect([...toggleExpandedItemId(new Set(['card-a', 'card-b']), 'card-a')]).toEqual(['card-b']);
	});
});
