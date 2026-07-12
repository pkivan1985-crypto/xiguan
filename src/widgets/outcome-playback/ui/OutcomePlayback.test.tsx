import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import type { OutcomeBatch } from '@entities/outcome-batch';

import { OutcomePlayback } from './OutcomePlayback';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string, values?: Record<string, unknown>) => ({
	'shell.today.playbackSaved': '整批成果已保存', 'shell.today.staticFallback': '已使用静态成果反馈',
	'shell.today.skipToSummary': '直接看汇总', 'shell.today.playNext': '播放下一张', 'shell.today.viewSummary': '查看汇总',
	'shell.today.playbackProgress': `${values?.current} / ${values?.total}`, 'shell.today.resultRecorded': '今天的行动已经留下记录',
}[key] ?? key) }) }));

const batch: OutcomeBatch = {
	id: 'batch-a', submissionId: 'batch-a', localDate: '2026-07-12', status: 'playing', createdAt: '2026-07-12T08:00:00.000Z', playbackIndex: 0,
	items: [{ slotIndex: 0, userCardId: 'card-a', cardTitle: '晨跑', quantityBaseValue: 5200, baseUnit: 'meter', displayUnit: 'km', basePerDisplayUnit: 1000, maxDecimalPlaces: 3 }],
};

describe('OutcomePlayback', () => {
	it('shows the frozen current result without any data-save action', () => {
		const html = renderToStaticMarkup(<OutcomePlayback batch={batch} reducedMotion={false} onNext={vi.fn()} onSummary={vi.fn()} />);
		expect(html).toContain('晨跑');
		expect(html).toContain('5.20');
		expect(html).toContain('km');
		expect(html).not.toContain('保存今日成果');
		expect(html).toContain('查看汇总');
	});

	it('renders a static result when reduced motion is enabled', () => {
		const html = renderToStaticMarkup(<OutcomePlayback batch={batch} reducedMotion onNext={vi.fn()} onSummary={vi.fn()} />);
		expect(html).toContain('已使用静态成果反馈');
	});
});
