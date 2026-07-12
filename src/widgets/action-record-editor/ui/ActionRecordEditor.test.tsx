import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { ActionRecordEditor, EditorConfirmation } from './ActionRecordEditor';
import type { HistoryRecordModel } from '@features/load-history';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

const record: HistoryRecordModel = {
	id: 'record-1', localDate: '2026-07-12', cardTitle: '晨跑', quantityBaseValue: 7_500,
	displayValue: '7.50', displayUnit: 'km', basePerDisplayUnit: 1000, maxDecimalPlaces: 3,
	confirmationThresholdDisplay: 100, lastSavedAt: '2026-07-12T08:42:00.000Z',
	canCorrect: true, relationAvailable: true,
};

describe('ActionRecordEditor', () => {
	it('opens with current value, immutable unit, and no immediate destructive confirmation', () => {
		const html = renderToStaticMarkup(<ActionRecordEditor record={record} saving={false} onSave={() => undefined} onDelete={() => undefined} onClose={() => undefined} />);
		expect(html).toContain('value="7.50"');
		expect(html).toContain('km');
		expect(html).toContain('shell.history.saveChanges');
		expect(html).toContain('shell.history.deleteRecord');
		expect(html).not.toContain('shell.history.confirmUpdate');
	});

	it.each(['update', 'delete'] as const)('renders a second %s confirmation before its final action', (kind) => {
		const html = renderToStaticMarkup(<EditorConfirmation kind={kind} busy={false} onConfirm={() => undefined} onCancel={() => undefined} />);
		expect(html).toContain(kind === 'update' ? 'shell.history.confirmUpdate' : 'shell.history.confirmDelete');
		expect(html).toContain('shell.history.recalculationImpact');
	});
});
