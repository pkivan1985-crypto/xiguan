import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';

import { ActionRecordEditor, EditorConfirmation } from './ActionRecordEditor';
import { keepFocusInsideConfirmation } from './keepFocusInsideConfirmation';
import type { HistoryRecordModel } from '@features/load-history';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

const record: HistoryRecordModel = {
	id: 'record-1', localDate: '2026-07-12', cardTitle: '晨跑', quantityBaseValue: 7_500,
	displayValue: '7.50', displayUnit: 'km', basePerDisplayUnit: 1000, maxDecimalPlaces: 3,
	confirmationThresholdDisplay: 100, lastSavedAt: '2026-07-12T08:42:00.000Z',
	canCorrect: true, relationAvailable: true,
};

describe('ActionRecordEditor', () => {
	it('keeps the modal layer above the fixed bottom navigation', () => {
		const css = readFileSync(new URL('./ActionRecordEditor.module.css', import.meta.url), 'utf8');
		expect(css).toContain('z-index: 40');
	});

	it('opens with current value, immutable unit, and no immediate destructive confirmation', () => {
		const html = renderToStaticMarkup(<ActionRecordEditor record={record} saving={false} onSave={() => undefined} onDelete={() => undefined} onClose={() => undefined} />);
		expect(html).toContain('value="7.50"');
		expect(html).toContain('km');
		expect(html).toContain('shell.history.saveChanges');
		expect(html).toContain('shell.history.deleteRecord');
		expect(html).not.toContain('shell.history.confirmUpdate');
	});

	it('replaces the editor content with confirmation instead of stacking both layers', () => {
		const source = readFileSync(new URL('./ActionRecordEditor.tsx', import.meta.url), 'utf8');
		const css = readFileSync(new URL('./ActionRecordEditor.module.css', import.meta.url), 'utf8');
		expect(source).toContain('{confirmation ? <EditorConfirmation');
		expect(source).not.toContain('{confirmation && <EditorConfirmation');
		expect(css).not.toMatch(/\.confirmation\s*{[^}]*position:\s*absolute/s);
		expect(css).toContain('background: var(--surface-color)');
		expect(css).not.toMatch(/--color-(?:bg(?:-lighter)?|border|text(?:-secondary)?)/);
	});

	it.each(['update', 'delete'] as const)('renders a second %s confirmation before its final action', (kind) => {
		const html = renderToStaticMarkup(<EditorConfirmation kind={kind} busy={false} onConfirm={() => undefined} onCancel={() => undefined} />);
		expect(html).toContain(kind === 'update' ? 'shell.history.confirmUpdate' : 'shell.history.confirmDelete');
		expect(html).toContain('shell.history.recalculationImpact');
		expect(html).toContain('autofocus=""');
	});

	it('keeps keyboard focus inside the confirmation actions', () => {
		const first = { focus: vi.fn() };
		const last = { focus: vi.fn() };
		const backwards = { key: 'Tab', shiftKey: true, preventDefault: vi.fn() };
		const forwards = { key: 'Tab', shiftKey: false, preventDefault: vi.fn() };

		keepFocusInsideConfirmation(backwards, first, first, last);
		expect(backwards.preventDefault).toHaveBeenCalledOnce();
		expect(last.focus).toHaveBeenCalledOnce();

		keepFocusInsideConfirmation(forwards, last, first, last);
		expect(forwards.preventDefault).toHaveBeenCalledOnce();
		expect(first.focus).toHaveBeenCalledOnce();
	});
});
