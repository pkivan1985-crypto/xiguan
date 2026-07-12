import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { OutcomeCalendar } from './OutcomeCalendar';

vi.mock('react-i18next', () => ({ useTranslation: () => ({
	t: (key: string, values?: Record<string, string>) => ({
		'shell.home.previousMonth': '上个月',
		'shell.home.nextMonth': '下个月',
		'shell.home.outcomeDay': `${values?.date} 成果日`,
	}[key] ?? key),
}) }));

describe('OutcomeCalendar', () => {
	it('renders one accessible check for each distinct outcome date', () => {
		const html = renderToStaticMarkup(<OutcomeCalendar
			year={2026}
			monthIndex={6}
			outcomeDates={['2026-07-02', '2026-07-05']}
			todayLocalDate='2026-07-12'
			onPreviousMonth={() => undefined}
			onNextMonth={() => undefined}
			canGoNext
		/>);

		expect(html.match(/>✓</g)).toHaveLength(2);
		expect(html).toContain('2026-07-02 成果日');
		expect(html).toContain('2026-07-05 成果日');
	});

	it('marks today without falsely marking it as an outcome day', () => {
		const html = renderToStaticMarkup(<OutcomeCalendar
			year={2026}
			monthIndex={6}
			outcomeDates={[]}
			todayLocalDate='2026-07-12'
			onPreviousMonth={() => undefined}
			onNextMonth={() => undefined}
			canGoNext={false}
		/>);

		expect(html).toContain('aria-current="date"');
		expect(html).not.toContain('>✓<');
		expect(html).toContain('disabled=""');
	});
});
