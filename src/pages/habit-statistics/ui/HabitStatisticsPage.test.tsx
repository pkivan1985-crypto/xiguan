import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router';

import { GoalDetailsPage } from './HabitStatisticsPage';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@features/load-goal-details', async (importOriginal) => ({
	...await importOriginal<typeof import('@features/load-goal-details')>(),
	loadGoalDetailsInApp: vi.fn(() => new Promise(() => undefined)),
}));

describe('GoalDetailsPage', () => {
	it('renders a truthful loading state for the selected card route', () => {
		const html = renderToStaticMarkup(<MemoryRouter initialEntries={['/goals/card-a']}><Routes><Route path='/goals/:userCardId' element={<GoalDetailsPage />} /></Routes></MemoryRouter>);
		expect(html).toContain('shell.goalDetails.loading');
		expect(html).not.toContain('streak');
	});
});
