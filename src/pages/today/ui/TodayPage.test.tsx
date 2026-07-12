import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { todayErrorKey } from '../model/todayPage';
import { TodayPage } from './TodayPage';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => ({ 'shell.today.loading': '正在读取今日成果…' }[key] ?? key) }) }));

describe('TodayPage', () => {
	it('renders a truthful loading state before IndexedDB readback', () => {
		expect(renderToStaticMarkup(<TodayPage />)).toContain('正在读取今日成果');
	});

	it('maps actionable domain failures without hiding unknown errors', () => {
		expect(todayErrorKey(new Error('TODAY_DRAFT_DATE_CHANGED'))).toBe('shell.today.dateChanged');
		expect(todayErrorKey(new Error('INVALID_QUANTITY'))).toBe('shell.today.invalidValue');
		expect(todayErrorKey(new Error('unexpected'))).toBe('shell.today.submitError');
	});
});
