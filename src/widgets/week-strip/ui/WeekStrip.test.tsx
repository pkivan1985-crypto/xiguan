import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { WeekStrip } from './WeekStrip';

vi.mock('react-i18next', () => ({ useTranslation: () => ({
	t: (key: string) => key,
}) }));

describe('WeekStrip expense markers', () => {
	it('shows yellow and green markers independently and side by side', () => {
		const html = renderToStaticMarkup(<WeekStrip
			selectedLocalDate='2026-07-22'
			todayLocalDate='2026-07-26'
			outcomeDates={['2026-07-20']}
			expenseDates={['2026-07-20', '2026-07-21']}
			onSelect={() => undefined}
		/>);

		expect(html.match(/data-expense-marker="true"/g)).toHaveLength(2);
		expect(html).toContain('data-marker-pair="true"');
	});
});
