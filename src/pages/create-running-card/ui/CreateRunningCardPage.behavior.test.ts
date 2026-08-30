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

	it('keeps stage planning optional and excludes hidden stages from creation', () => {
		expect(source).toContain("const [stagedPlanEnabled, setStagedPlanEnabled] = useState(false)");
		expect(source).toContain("role='switch'");
		expect(source).toContain('aria-checked={stagedPlanEnabled}');
		expect(source).toContain('{stagedPlanEnabled && (');
		expect(source).toContain('stages: stagedPlanEnabled ? stages.map');
		expect(source).toContain("averageTargetDisplay: planMode === 'average' ? averageDailyTarget : undefined");
	});

	it('offers extra spending as a life-management preset', () => {
		expect(source).toContain("id: 'extra-expense'");
		expect(source).toContain("categoryId: 'life-management'");
		expect(source).toContain("labelKey: 'shell.createCard.presets.extraExpense'");
	});

	it('skips planning for event-driven extra spending and confirms it as needed', () => {
		expect(source).toContain("const isEventDriven = templateId === 'extra-expense'");
		expect(source).toContain('setFlowStep(isEventDriven ? 2 : 1)');
		expect(source).toContain("isEventDriven ? ['choose', 'confirm'] : ['choose', 'plan', 'confirm']");
		expect(source).toContain('longTerm: isEventDriven ? undefined');
		expect(source).toContain('dailyPlan: isEventDriven ? undefined');
		expect(source).toContain("t('shell.createCard.eventDrivenHint')");
	});
});
