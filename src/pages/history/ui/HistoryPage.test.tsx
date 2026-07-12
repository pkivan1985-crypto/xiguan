import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { HistoryPage } from './HistoryPage';
import { historyErrorKey } from '../model/historyPage';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@features/load-history', async (importOriginal) => ({
	...await importOriginal<typeof import('@features/load-history')>(),
	loadHistoryInApp: vi.fn(() => new Promise(() => undefined)),
}));

describe('HistoryPage', () => {
	it('renders truthful loading before IndexedDB readback', () => {
		expect(renderToStaticMarkup(<HistoryPage />)).toContain('shell.history.loading');
	});

	it('maps date and quantity failures without hiding unknown errors', () => {
		expect(historyErrorKey(new Error('ACTION_RECORD_NOT_TODAY'))).toBe('shell.history.dateChanged');
		expect(historyErrorKey(new Error('INVALID_QUANTITY'))).toBe('shell.history.invalidValue');
		expect(historyErrorKey(new Error('unexpected'))).toBe('shell.history.saveError');
	});
});
