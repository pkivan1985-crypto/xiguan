import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import type { OutcomeBatch } from '@entities/outcome-batch';

import { OutcomeSummary } from './OutcomeSummary';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string, values?: Record<string, unknown>) => ({
	'shell.today.summaryTitle': '今日成果汇总', 'shell.today.batchSaved': '已保存', 'shell.today.summaryCards': `${values?.count} 张循环卡`,
	'shell.today.summaryResults': '今天的成果', 'shell.today.overwriteNote': '同一天再次保存会覆盖累计值',
	'shell.today.backToEditor': '返回今日成果', 'shell.today.unitTotal': `${values?.value} ${values?.unit}`,
	'shell.today.goalChange': `${values?.before} → ${values?.after}`,
}[key] ?? key) }) }));

const batch: OutcomeBatch = {
	id: 'batch-a', submissionId: 'batch-a', localDate: '2026-07-12', status: 'completed', createdAt: '2026-07-12T08:00:00.000Z',
	items: [
		{ slotIndex: 0, userCardId: 'card-a', cardTitle: '晨跑', quantityBaseValue: 5200, baseUnit: 'meter', displayUnit: 'km', basePerDisplayUnit: 1000, maxDecimalPlaces: 3 },
		{ slotIndex: 1, userCardId: 'card-b', cardTitle: '冥想', quantityBaseValue: 1800, baseUnit: 'second', displayUnit: 'min', basePerDisplayUnit: 60, maxDecimalPlaces: 1 },
	],
};

describe('OutcomeSummary', () => {
	it('groups mixed units into separate truthful totals', () => {
		const html = renderToStaticMarkup(<OutcomeSummary batch={batch} onBack={vi.fn()} />);
		expect(html).toContain('5.20 km');
		expect(html).toContain('30.00 min');
		expect(html).not.toContain('35.20');
		expect(html).toContain('晨跑');
		expect(html).toContain('冥想');
	});
});
