import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const source = readFileSync(
	new URL('./CreateRunningCardPage.tsx', import.meta.url),
	'utf8',
);

describe('create habit daily planning controls', () => {
	it('keeps daily automatic mode separate from stage redistribution', () => {
		expect(source).toContain('function useAverageDailyPlan(): void');
		expect(source).toContain("onClick={useAverageDailyPlan}>{t('shell.createCard.averageMode')}</button>");
		expect(source).not.toContain("onClick={useAveragePlan}>{t('shell.createCard.averageMode')}</button>");
	});

	it('explains that automatic daily values are derived instead of looking inactive', () => {
		expect(source).toContain("t('shell.createCard.dailyPlanNeedsTarget')");
		expect(source).toContain("placeholder={t('shell.createCard.longTargetPlaceholder')}");
	});
});
