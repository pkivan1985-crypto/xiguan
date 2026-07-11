import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { DeckCategoryView } from '@features/load-card-deck';

import { CardDeck } from './CardDeck';

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
});
