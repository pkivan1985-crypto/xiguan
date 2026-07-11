import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { TodayCardSlots } from './TodayCardSlots';

describe('TodayCardSlots', () => {
	it('renders exactly six truthful slot labels', () => {
		const html = renderToStaticMarkup(<TodayCardSlots
			slots={[{ slotIndex: 0, userCardId: 'card-a', title: '晨跑' }, null, null, null, null, null]}
			emptyLabel='空卡槽'
			sectionLabel='今天进行中的循环卡'
		/>);

		expect((html.match(/data-slot=/g) ?? []).length).toBe(6);
		expect(html).toContain('今日位置 1：晨跑');
		expect(html).toContain('今日位置 6：空卡槽');
	});
});
