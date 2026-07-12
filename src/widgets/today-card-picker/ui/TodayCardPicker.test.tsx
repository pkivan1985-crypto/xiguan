import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { TodayCardPicker } from './TodayCardPicker';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => ({
	'shell.today.pickerTitle': '添加到今日成果', 'shell.today.pickerNote': '只显示可记录成果的循环卡',
	'shell.today.closePicker': '关闭', 'shell.today.selectCard': '添加', 'shell.today.noAvailableCards': '没有更多可添加的循环卡',
}[key] ?? key) }) }));

describe('TodayCardPicker', () => {
	it('renders only supplied available cards in an accessible dialog', () => {
		const onSelect = vi.fn();
		const html = renderToStaticMarkup(<TodayCardPicker open cards={[{ id: 'card-b', title: '夜跑', displayUnit: 'km', baseUnit: 'meter', maxDecimalPlaces: 3, confirmationThresholdDisplay: 100 }]} onSelect={onSelect} onClose={vi.fn()} />);
		expect(html).toContain('role="dialog"');
		expect(html).toContain('aria-label="添加到今日成果"');
		expect(html).toContain('aria-label="夜跑 添加"');
		expect(html).not.toContain('晨跑');
	});
});
