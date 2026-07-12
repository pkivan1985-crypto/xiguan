import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import type { TodayOutcomeView } from '@features/load-today-outcome';

import { TodayOutcomeEditor } from './TodayOutcomeEditor';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string, values?: Record<string, unknown>) => ({
	'shell.today.playbackPreview': '保存后按顺序播放', 'shell.today.playbackPreviewDescription': '每张卡都有成果反馈',
	'shell.today.cumulativeHint': '不是本次增量', 'shell.today.valueLabel': `${values?.title}今天累计${values?.unit}数`,
	'shell.today.valueCaption': '今天截至现在', 'shell.today.moveUp': `上移${values?.title}`, 'shell.today.moveDown': `下移${values?.title}`,
	'shell.today.removeCard': `移除${values?.title}`, 'shell.today.addCard': '添加循环卡', 'shell.today.addCardHint': '从我的卡套选择',
	'shell.today.cardCount': `${values?.count} 张卡`, 'shell.today.total': `${values?.value} ${values?.unit}`,
	'shell.today.filledCount': `已填写 ${values?.filled} / ${values?.count}`, 'shell.today.save': '保存今日成果',
}[key] ?? key) }) }));

const view: TodayOutcomeView = {
	localDate: '2026-07-12',
	draft: { localDate: '2026-07-12', status: 'editing', updatedAt: '2026-07-12T08:00:00.000Z', slots: [
		{ slotIndex: 0, userCardId: 'card-a', valueText: '5.20' }, { slotIndex: 1, userCardId: 'card-b', valueText: '3.00' },
		...([2, 3, 4, 5].map((slotIndex) => ({ slotIndex, userCardId: null, valueText: '' }))),
	] },
	selectedCards: [
		{ id: 'card-a', title: '晨跑', slotIndex: 0, valueText: '5.20', displayUnit: 'km', baseUnit: 'meter', maxDecimalPlaces: 3, confirmationThresholdDisplay: 100 },
		{ id: 'card-b', title: '夜跑', slotIndex: 1, valueText: '3.00', displayUnit: 'km', baseUnit: 'meter', maxDecimalPlaces: 3, confirmationThresholdDisplay: 100 },
	],
	availableCards: [], footer: { kind: 'total', cardCount: 2, valueText: '8.20', displayUnit: 'km' },
};

describe('TodayOutcomeEditor', () => {
	it('edits cumulative values and exposes ordered compact actions', () => {
		const onValueChange = vi.fn();
		const onMove = vi.fn();
		const html = renderToStaticMarkup(<TodayOutcomeEditor view={view} disabled={false} onValueChange={onValueChange} onMove={onMove} onRemove={vi.fn()} onOpenPicker={vi.fn()} onSubmit={vi.fn()} />);
		expect(html).toContain('aria-label="晨跑今天累计km数"');
		expect(html).toContain('value="5.20"');
		expect(html).toContain('不是本次增量');
		expect(html).toContain('aria-label="下移晨跑"');
	});

	it('disables save when any selected card is blank', () => {
		const blankView = { ...view, selectedCards: [{ ...view.selectedCards[0], valueText: '' }], footer: { kind: 'total' as const, cardCount: 1, valueText: '0.00', displayUnit: 'km' } };
		const html = renderToStaticMarkup(<TodayOutcomeEditor view={blankView} disabled={false} onValueChange={vi.fn()} onMove={vi.fn()} onRemove={vi.fn()} onOpenPicker={vi.fn()} onSubmit={vi.fn()} />);
		expect(html).toMatch(/<button[^>]*disabled=""[^>]*>.*保存今日成果/);
	});
});
