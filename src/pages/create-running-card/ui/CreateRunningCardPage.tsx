/* eslint-disable i18next/no-literal-string -- Preset IDs and ISO weekday numbers are stable domain identifiers. */
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
	FiActivity,
	FiBookOpen,
	FiCalendar,
	FiCheck,
	FiChevronLeft,
	FiDroplet,
	FiEdit3,
	FiFlag,
	FiMoon,
	FiPlus,
	FiShield,
	FiTarget,
	FiTrash2,
	FiX,
} from 'react-icons/fi';
import { PiArrowRight, PiLeaf, PiReceipt } from 'react-icons/pi';
import type { IconType } from 'react-icons';
import { useNavigate } from 'react-router';

import {
	countCalendarDays,
	countScheduledDays,
	createHabitInApp,
	distributeEvenStages,
	endDateFromDuration,
	projectedCustomTotal,
} from '@features/create-habit';
import type { IsoWeekday, LightFoodRule } from '@entities/user-card';
import { APP_ROUTES } from '@shared/config';
import { formatLocalDate, parseLocalDate } from '@shared/lib/date';

import styles from './CreateRunningCardPage.module.css';

const PRESETS = [
	{ id: 'running', categoryId: 'sport', icon: FiActivity, labelKey: 'shell.createCard.presets.running', unitKey: 'shell.createCard.units.distance', displayUnitKey: 'shell.createCard.displayUnits.distance', accent: 'green', decimals: 3, dailyDefault: 5 },
	{ id: 'water', categoryId: 'nutrition', icon: FiDroplet, labelKey: 'shell.createCard.presets.water', unitKey: 'shell.createCard.units.count', displayUnitKey: 'shell.createCard.displayUnits.count', accent: 'cyan', decimals: 0, dailyDefault: 8 },
	{ id: 'light-food', categoryId: 'nutrition', icon: PiLeaf, labelKey: 'shell.createCard.presets.lightFood', unitKey: 'shell.createCard.units.checklist', displayUnitKey: 'shell.createCard.displayUnits.checklist', accent: 'green', decimals: 0, dailyDefault: 4 },
	{ id: 'reading-time', categoryId: 'learning', icon: FiBookOpen, labelKey: 'shell.createCard.presets.reading', unitKey: 'shell.createCard.units.duration', displayUnitKey: 'shell.createCard.displayUnits.duration', accent: 'amber', decimals: 0, dailyDefault: 30 },
	{ id: 'sleep', categoryId: 'recovery', icon: FiMoon, labelKey: 'shell.createCard.presets.sleep', unitKey: 'shell.createCard.units.check', displayUnitKey: 'shell.createCard.displayUnits.check', accent: 'violet', decimals: 0, dailyDefault: 1 },
	{ id: 'screen-free', categoryId: 'focus', icon: FiShield, labelKey: 'shell.createCard.presets.screenFree', unitKey: 'shell.createCard.units.avoid', displayUnitKey: 'shell.createCard.displayUnits.avoid', accent: 'blue', decimals: 0, dailyDefault: 1 },
	{ id: 'extra-expense', categoryId: 'life-management', icon: PiReceipt, labelKey: 'shell.createCard.presets.extraExpense', unitKey: 'shell.createCard.units.money', displayUnitKey: 'shell.createCard.displayUnits.money', accent: 'amber', decimals: 2, dailyDefault: 1 },
] as const satisfies readonly {
	id: string;
	categoryId: string;
	icon: IconType;
	labelKey: string;
	unitKey: string;
	displayUnitKey: string;
	accent: string;
	decimals: number;
	dailyDefault: number;
}[];

const CATEGORIES = [
	{ id: 'all', labelKey: 'shell.createCard.categories.all' },
	{ id: 'sport', labelKey: 'shell.createCard.categories.sport' },
	{ id: 'nutrition', labelKey: 'shell.createCard.categories.nutrition' },
	{ id: 'learning', labelKey: 'shell.createCard.categories.learning' },
	{ id: 'recovery', labelKey: 'shell.createCard.categories.recovery' },
	{ id: 'focus', labelKey: 'shell.createCard.categories.focus' },
	{ id: 'life-management', labelKey: 'shell.createCard.categories.lifeManagement' },
] as const;

const DEFAULT_LIGHT_FOOD_RULES = [
	{ id: 'avoid-heaty', labelKey: 'shell.createCard.lightFoodRules.heaty' },
	{ id: 'avoid-spicy', labelKey: 'shell.createCard.lightFoodRules.spicy' },
	{ id: 'avoid-greasy', labelKey: 'shell.createCard.lightFoodRules.greasy' },
	{ id: 'avoid-sugary-drinks', labelKey: 'shell.createCard.lightFoodRules.drinks' },
] as const;

const WEEKDAYS: readonly IsoWeekday[] = [1, 2, 3, 4, 5, 6, 7];

interface StageDraft {
	key: string;
	title: string;
	target: string;
	startDate: string;
	endDate: string;
	durationDays: string;
	dailyTarget: string;
	activeDays: number;
}

function addCalendarDays(localDate: string, days: number): string {
	const [year, month, day] = parseLocalDate(localDate).split('-').map(Number);
	const date = new Date(year!, month! - 1, day! + days);
	return formatLocalDate(date);
}

function numeric(value: string): number | null {
	const parsed = Number(value);
	return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function positiveInteger(value: string): number | null {
	const parsed = Number(value);
	return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function sumTargets(stages: readonly StageDraft[]): number {
	return stages.reduce((sum, stage) => sum + (numeric(stage.target) ?? 0), 0);
}

function CreateRunningCardPage() {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const today = useMemo(() => formatLocalDate(new Date()), []);
	const [flowStep, setFlowStep] = useState<0 | 1 | 2>(0);
	const [categoryId, setCategoryId] = useState<(typeof CATEGORIES)[number]['id']>('all');
	const [templateId, setTemplateId] = useState('running');
	const [cardTitle, setCardTitle] = useState(() => t('shell.createCard.presets.running'));
	const [titleCustomized, setTitleCustomized] = useState(false);
	const [longTarget, setLongTarget] = useState('');
	const [longDurationDays, setLongDurationDays] = useState('90');
	const [longEndDate, setLongEndDate] = useState(() => addCalendarDays(today, 89));
	const [weekdays, setWeekdays] = useState<IsoWeekday[]>([1, 2, 3, 4, 5, 6, 7]);
	const [planMode, setPlanMode] = useState<'average' | 'custom'>('average');
	const [customTargets, setCustomTargets] = useState<Partial<Record<IsoWeekday, string>>>({});
	const [stagedPlanEnabled, setStagedPlanEnabled] = useState(false);
	const [autoDistribution, setAutoDistribution] = useState(true);
	const [stages, setStages] = useState<StageDraft[]>([{
		key: crypto.randomUUID(),
		title: t('shell.createCard.stageNumber', { number: 1 }),
		target: '',
		startDate: today,
		endDate: longEndDate,
		durationDays: '90',
		dailyTarget: '',
		activeDays: 0,
	}]);
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string>();
	const [foodRules, setFoodRules] = useState<LightFoodRule[]>(() => DEFAULT_LIGHT_FOOD_RULES.map((rule) => ({
		id: rule.id,
		label: t(rule.labelKey),
		builtIn: true,
	})));
	const [newFoodRule, setNewFoodRule] = useState('');
	const selected = PRESETS.find((preset) => preset.id === templateId)!;
	const isEventDriven = templateId === 'extra-expense';
	const flowSteps: readonly ('choose' | 'plan' | 'confirm')[] = isEventDriven ? ['choose', 'confirm'] : ['choose', 'plan', 'confirm'];
	const selectedUnit = t(selected.displayUnitKey);
	const selectedWeekdaysCount = useMemo(() => {
		if (!longEndDate) return 0;
		try {
			return countScheduledDays(today, longEndDate, weekdays);
		} catch {
			return 0;
		}
	}, [longEndDate, today, weekdays]);
	const derivedLongTarget = String(selectedWeekdaysCount * (
		templateId === 'light-food' ? foodRules.length : selected.dailyDefault
	));
	const usesDerivedTarget = ['light-food', 'sleep', 'screen-free', 'extra-expense'].includes(templateId);
	const planningTarget = usesDerivedTarget ? derivedLongTarget : longTarget;

	function evenStages(count: number, current: readonly StageDraft[], endDate = longEndDate): StageDraft[] | null {
		const total = numeric(planningTarget);
		if (!total || !endDate || weekdays.length === 0) return null;
		try {
			const plans = distributeEvenStages({
				totalDisplay: total,
				startDate: today,
				endDate,
				stageCount: count,
				weekdays,
				maxDecimalPlaces: selected.decimals,
			});
			return plans.map((plan, index) => ({
				key: current[index]?.key ?? crypto.randomUUID(),
				title: current[index]?.title.trim() || t('shell.createCard.stageNumber', { number: index + 1 }),
				target: plan.targetDisplay,
				startDate: plan.startDate,
				endDate: plan.endDate,
				durationDays: String(countCalendarDays(plan.startDate, plan.endDate)),
				dailyTarget: plan.dailyTargetDisplay,
				activeDays: plan.activeDays,
			}));
		} catch {
			return null;
		}
	}

	useEffect(() => {
		if (!autoDistribution) return;
		const next = evenStages(stages.length, stages);
		// The generated stage plan is local form state derived from the planning controls.
		// eslint-disable-next-line react-hooks/set-state-in-effect
		if (next) setStages(next);
		// `stages` is intentionally represented by its count here; recalculating from
		// the full array would loop after every generated plan.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [autoDistribution, planningTarget, longEndDate, selected.decimals, stages.length, today, weekdays.join(',')]);

	const allocatedTarget = sumTargets(stages);
	const targetTotal = numeric(planningTarget) ?? 0;
	const allocationDifference = targetTotal - allocatedTarget;
	const directAverageTarget = useMemo(() => {
		const total = numeric(planningTarget);
		if (!total || !longEndDate || weekdays.length === 0) return '';
		try {
			return distributeEvenStages({
				totalDisplay: total,
				startDate: today,
				endDate: longEndDate,
				stageCount: 1,
				weekdays,
				maxDecimalPlaces: selected.decimals,
			})[0]?.dailyTargetDisplay ?? '';
		} catch {
			return '';
		}
	}, [longEndDate, planningTarget, selected.decimals, today, weekdays]);
	const averageDailyTarget = stagedPlanEnabled ? stages[0]?.dailyTarget ?? '' : directAverageTarget;
	const customProjection = useMemo(() => {
		if (planMode !== 'custom' || !longEndDate) return null;
		const values = Object.fromEntries(
			WEEKDAYS.flatMap((weekday) => {
				const value = numeric(customTargets[weekday] ?? '');
				return value === null ? [] : [[weekday, value]];
			}),
		) as Partial<Record<IsoWeekday, number>>;
		try {
			return projectedCustomTotal({ startDate: today, endDate: longEndDate, targetsByWeekday: values });
		} catch {
			return null;
		}
	}, [customTargets, longEndDate, planMode, today]);

	function selectPreset(id: string): void {
		const next = PRESETS.find((preset) => preset.id === id)!;
		setTemplateId(id);
		if (id === 'extra-expense') setStagedPlanEnabled(false);
		if (!titleCustomized) setCardTitle(t(next.labelKey));
		setAutoDistribution(true);
		setError(undefined);
	}

	function selectCategory(nextCategoryId: (typeof CATEGORIES)[number]['id']): void {
		setCategoryId(nextCategoryId);
		if (nextCategoryId === 'all' || selected.categoryId === nextCategoryId) return;
		const firstPreset = PRESETS.find((preset) => preset.categoryId === nextCategoryId);
		if (firstPreset) selectPreset(firstPreset.id);
	}

	function updateLongDuration(value: string): void {
		const duration = positiveInteger(value);
		if (!duration) {
			setLongDurationDays(value);
			return;
		}
		const normalizedDuration = Math.max(duration, stagedPlanEnabled ? stages.length : 1);
		setLongDurationDays(String(normalizedDuration));
		setLongEndDate(endDateFromDuration(today, normalizedDuration));
		setAutoDistribution(true);
		setError(undefined);
	}

	function updateLongEndDate(value: string): void {
		if (!value) {
			setLongEndDate(value);
			return;
		}
		const duration = countCalendarDays(today, value);
		const normalizedDuration = Math.max(duration, stagedPlanEnabled ? stages.length : 1);
		setLongDurationDays(String(normalizedDuration));
		setLongEndDate(endDateFromDuration(today, normalizedDuration));
		setAutoDistribution(true);
		setError(undefined);
	}

	function toggleWeekday(day: IsoWeekday): void {
		setWeekdays((current) => {
			if (current.includes(day)) {
				return current.length === 1 ? current : current.filter((item) => item !== day);
			}
			return [...current, day].sort((left, right) => left - right);
		});
		setAutoDistribution(true);
		setError(undefined);
	}

	function toggleStagedPlan(): void {
		const nextEnabled = !stagedPlanEnabled;
		setStagedPlanEnabled(nextEnabled);
		if (nextEnabled) {
			setAutoDistribution(true);
			const generated = evenStages(stages.length, stages);
			if (generated) setStages(generated);
		}
		setError(undefined);
	}

	function addStage(): void {
		const draft = [...stages, {
			key: crypto.randomUUID(),
			title: t('shell.createCard.stageNumber', { number: stages.length + 1 }),
			target: '',
			startDate: today,
			endDate: longEndDate,
			durationDays: longDurationDays,
			dailyTarget: '',
			activeDays: 0,
		}];
		const currentDuration = positiveInteger(longDurationDays) ?? countCalendarDays(today, longEndDate);
		const normalizedDuration = Math.max(currentDuration, draft.length);
		const normalizedEndDate = endDateFromDuration(today, normalizedDuration);
		if (normalizedDuration !== currentDuration) {
			setLongDurationDays(String(normalizedDuration));
			setLongEndDate(normalizedEndDate);
		}
		setAutoDistribution(true);
		setStages(evenStages(draft.length, draft, normalizedEndDate) ?? draft);
	}

	function removeStage(key: string): void {
		const remaining = stages.filter((stage) => stage.key !== key);
		setAutoDistribution(true);
		setStages(evenStages(remaining.length, remaining) ?? remaining);
	}

	function withStageMetrics(stage: StageDraft): StageDraft {
		const target = numeric(stage.target);
		if (!target || !stage.endDate) return stage;
		try {
			const recalculated = distributeEvenStages({
				totalDisplay: target,
				startDate: stage.startDate,
				endDate: stage.endDate,
				stageCount: 1,
				weekdays,
				maxDecimalPlaces: selected.decimals,
			})[0]!;
			return {
				...stage,
				durationDays: String(countCalendarDays(stage.startDate, stage.endDate)),
				dailyTarget: recalculated.dailyTargetDisplay,
				activeDays: recalculated.activeDays,
			};
		} catch {
			return { ...stage, dailyTarget: '', activeDays: 0 };
		}
	}

	function reflowStagesFrom(current: readonly StageDraft[], index: number, endDate: string): StageDraft[] {
		const next = current.map((stage) => ({ ...stage }));
		const currentStage = next[index];
		if (!currentStage) return next;
		currentStage.endDate = endDate;
		currentStage.durationDays = String(countCalendarDays(currentStage.startDate, endDate));
		for (let cursor = index + 1; cursor < next.length; cursor += 1) {
			const previous = next[cursor - 1]!;
			const stage = next[cursor]!;
			stage.startDate = addCalendarDays(previous.endDate, 1);
			const stagesAfter = next.length - cursor - 1;
			const latestEnd = addCalendarDays(longEndDate, -stagesAfter);
			const preservedEnd = cursor === next.length - 1 ? longEndDate : stage.endDate;
			stage.endDate = preservedEnd < stage.startDate
				? stage.startDate
				: preservedEnd > latestEnd ? latestEnd : preservedEnd;
			stage.durationDays = String(countCalendarDays(stage.startDate, stage.endDate));
		}
		return next.map(withStageMetrics);
	}

	function updateStageTarget(key: string, target: string): void {
		setAutoDistribution(false);
		setStages((current) => current.map((stage) => (
			stage.key === key ? withStageMetrics({ ...stage, target }) : stage
		)));
	}

	function updateStageEndDate(index: number, endDate: string): void {
		setAutoDistribution(false);
		setStages((current) => {
			const stage = current[index];
			if (!stage || !endDate) return current;
			const latestEnd = addCalendarDays(longEndDate, -(current.length - index - 1));
			const nextEnd = endDate > latestEnd ? latestEnd : endDate;
			if (nextEnd < stage.startDate) return current;
			return reflowStagesFrom(current, index, nextEnd);
		});
	}

	function updateStageDuration(index: number, value: string): void {
		setAutoDistribution(false);
		setStages((current) => {
			const stage = current[index];
			if (!stage) return current;
			const duration = positiveInteger(value);
			if (!duration) {
				return current.map((item, itemIndex) => itemIndex === index ? { ...item, durationDays: value } : item);
			}
			const latestEnd = addCalendarDays(longEndDate, -(current.length - index - 1));
			const maxDuration = countCalendarDays(stage.startDate, latestEnd);
			const normalizedDuration = Math.min(duration, maxDuration);
			return reflowStagesFrom(current, index, endDateFromDuration(stage.startDate, normalizedDuration));
		});
	}

	function useAveragePlan(): void {
		const next = evenStages(stages.length, stages);
		if (!next) {
			setError(t('shell.createCard.planNeedsTargetAndDate'));
			return;
		}
		setAutoDistribution(true);
		setStages(next);
		setPlanMode('average');
		setError(undefined);
	}

	function useAverageDailyPlan(): void {
		setPlanMode('average');
		setError(undefined);
	}

	function useCustomPlan(): void {
		const fallback = averageDailyTarget;
		setCustomTargets(Object.fromEntries(weekdays.map((day) => [day, customTargets[day] ?? fallback])));
		setPlanMode('custom');
		setError(undefined);
	}

	function addFoodRule(): void {
		const label = newFoodRule.trim();
		if (!label || foodRules.some((rule) => rule.label === label)) return;
		setFoodRules((current) => [...current, {
			id: `custom-${crypto.randomUUID()}`,
			label,
			builtIn: false,
		}]);
		setNewFoodRule('');
	}

	function planReady(): boolean {
		const hasName = Boolean(cardTitle.trim());
		if (isEventDriven) return hasName;
		const hasLongTarget = numeric(planningTarget) !== null;
		const hasValidStages = !stagedPlanEnabled || (stages.length > 0 && stages.every((stage) => (
			Boolean(stage.title.trim())
			&& numeric(stage.target) !== null
			&& positiveInteger(stage.durationDays) !== null
			&& numeric(stage.dailyTarget) !== null
			&& Boolean(stage.endDate)
		)));
		const allocationMatches = !stagedPlanEnabled || Math.abs(allocationDifference) < 10 ** -(selected.decimals + 1);
		const averageComplete = planMode === 'custom' || numeric(averageDailyTarget) !== null;
		const customComplete = planMode === 'average' || weekdays.every((day) => numeric(customTargets[day] ?? '') !== null);
		return hasName && hasLongTarget && positiveInteger(longDurationDays) !== null
			&& Boolean(longEndDate) && hasValidStages && allocationMatches && averageComplete
			&& customComplete && (templateId !== 'light-food' || foodRules.length > 0);
	}

	function continueFlow(): void {
		if (flowStep === 0) {
			setFlowStep(isEventDriven ? 2 : 1);
			setError(undefined);
			return;
		}
		if (!planReady()) {
			setError(t(!cardTitle.trim()
				? 'shell.createCard.nameRequired'
				: Math.abs(allocationDifference) >= 10 ** -(selected.decimals + 1)
					? 'shell.createCard.allocationMismatch'
					: 'shell.createCard.completePlan'));
			return;
		}
		setFlowStep(2);
		setError(undefined);
	}

	async function submit(): Promise<void> {
		if (submitting) return;
		if (!planReady()) {
			setError(t('shell.createCard.completePlan'));
			return;
		}
		setSubmitting(true);
		setError(undefined);
		try {
			await createHabitInApp({
				templateId,
				cardTitle,
				startDate: today,
				longTerm: isEventDriven ? undefined : { targetDisplay: planningTarget, endDate: longEndDate },
				stages: stagedPlanEnabled ? stages.map((stage) => ({
					title: stage.title,
					targetDisplay: stage.target,
					startDate: stage.startDate,
					endDate: stage.endDate,
					dailyTargetDisplay: stage.dailyTarget,
				})) : undefined,
				dailyPlan: isEventDriven ? undefined : {
					mode: planMode,
					weekdays,
					averageTargetDisplay: planMode === 'average' ? averageDailyTarget : undefined,
					customTargetsDisplayByWeekday: planMode === 'custom' ? customTargets : undefined,
				},
				habitConfig: templateId === 'light-food'
					? { kind: 'light-food', rules: foodRules }
					: undefined,
				nowIso: new Date().toISOString(),
				ids: {
					userCardId: crypto.randomUUID(),
					longTermGoalId: crypto.randomUUID(),
					stageGoalId: crypto.randomUUID(),
					stageGoalIds: stagedPlanEnabled ? stages.map(() => crypto.randomUUID()) : undefined,
				},
			});
			navigate(APP_ROUTES.DECK, { replace: true, state: { created: true } });
		} catch {
			setError(t('shell.createCard.saveError'));
		} finally {
			setSubmitting(false);
		}
	}

	return (
		<main className={styles.page}>
			<header className={styles.header}>
				<button type='button' onClick={() => navigate(APP_ROUTES.DECK)} aria-label={t('shell.createCard.back')}><FiChevronLeft aria-hidden='true' /></button>
				<h1>{t('shell.createCard.newHabit')}</h1>
				<button type='button' onClick={() => navigate(APP_ROUTES.DECK)} aria-label={t('shell.createCard.close')}><FiX aria-hidden='true' /></button>
			</header>

			<section className={styles.content}>
				<ol className={styles.stepper} aria-label={t('shell.createCard.flowProgress')}>
					{flowSteps.map((step, index) => {
						const actualStep = step === 'confirm' ? 2 : index;
						return <li key={step} data-active={flowStep === actualStep} data-complete={flowStep > actualStep}>
							<span>{flowStep > actualStep ? <FiCheck aria-hidden='true' /> : index + 1}</span>
							<small>{t(`shell.createCard.flowSteps.${step}`)}</small>
						</li>;
					})}
				</ol>

				{flowStep === 0 && (
					<>
						<div className={styles.intro}><span><FiTarget aria-hidden='true' /></span><div><strong>{t('shell.createCard.chooseType')}</strong><small>{t('shell.createCard.chooseTypeHint')}</small></div></div>
						<div className={styles.categories} role='tablist' aria-label={t('shell.createCard.categoryFilter')}>
							{CATEGORIES.map((category) => (
								<button
									type='button'
									key={category.id}
									role='tab'
									aria-selected={categoryId === category.id}
									onClick={() => selectCategory(category.id)}
								>
									{t(category.labelKey)}
								</button>
							))}
						</div>
						<div className={styles.presets}>
							{PRESETS.filter((preset) => categoryId === 'all' || preset.categoryId === categoryId).map(({ id, icon: Icon, labelKey, unitKey, accent }) => (
								<button
									type='button'
									key={id}
									className={`${styles.preset} ${styles[accent]} ${id === templateId ? styles.selected : ''}`}
									aria-pressed={id === templateId}
									onClick={() => selectPreset(id)}
								>
									<span><Icon aria-hidden='true' /></span>
									<strong>{t(labelKey)}</strong>
									<small>{t(unitKey)}</small>
								</button>
							))}
						</div>
					</>
				)}

				{flowStep === 1 && <section className={styles.planningCanvas} aria-label={t('shell.createCard.planCanvas')}>
					<label className={styles.identityField}>
						<span className={`${styles.identityIcon} ${styles[selected.accent]}`}><selected.icon aria-hidden='true' /></span>
						<span className={styles.identityCopy}>
							<small>{t('shell.createCard.habitName')}</small>
							<input
								value={cardTitle}
								maxLength={40}
								placeholder={t(`shell.createCard.placeholders.${selected.id}`)}
								onChange={(event) => { setCardTitle(event.target.value); setTitleCustomized(true); setError(undefined); }}
							/>
						</span>
					</label>

					<section className={styles.planBlock}>
						<header className={styles.blockHeader}>
							<span><FiTarget aria-hidden='true' /></span>
							<div><strong>{t('shell.createCard.longTerm')}</strong><small>{t('shell.createCard.longTermInherited', { title: cardTitle || t(selected.labelKey) })}</small></div>
						</header>
						<div className={styles.longFields}>
							{!usesDerivedTarget && <label><span>{t('shell.createCard.totalTarget')}</span><span className={styles.inputWithUnit}><input type='number' min='1' inputMode='decimal' value={longTarget} placeholder={t('shell.createCard.longTargetPlaceholder')} onChange={(event) => { setLongTarget(event.target.value); setAutoDistribution(true); setError(undefined); }} /><small>{selectedUnit}</small></span></label>}
							<label><span>{t('shell.createCard.planDuration')}</span><span className={`${styles.inputWithUnit} ${styles.durationInput}`}><input type='number' min={stagedPlanEnabled ? stages.length : 1} inputMode='numeric' value={longDurationDays} onChange={(event) => updateLongDuration(event.target.value)} /><small>{t('shell.createCard.daysUnit')}</small></span></label>
							<label><span>{t('shell.createCard.targetDate')}</span><span className={styles.inputWithIcon}><FiCalendar aria-hidden='true' /><input type='date' min={endDateFromDuration(today, stagedPlanEnabled ? stages.length : 1)} value={longEndDate} onChange={(event) => updateLongEndDate(event.target.value)} /></span></label>
						</div>
						<div className={styles.stageToggle}>
							<span className={styles.stageToggleIcon}><FiFlag aria-hidden='true' /></span>
							<span className={styles.stageToggleCopy}>
								<strong>{t('shell.createCard.stagedPlan')}</strong>
								<small>{t(stagedPlanEnabled ? 'shell.createCard.stagedPlanOnHint' : 'shell.createCard.stagedPlanOffHint')}</small>
							</span>
							<button
								type='button'
								className={styles.stageSwitch}
								role='switch'
								aria-checked={stagedPlanEnabled}
								aria-label={t('shell.createCard.stagedPlan')}
								onClick={toggleStagedPlan}
							>
								<span aria-hidden='true' />
							</button>
						</div>
					</section>

					{stagedPlanEnabled && (
						<section className={styles.planBlock}>
							<header className={styles.blockHeader}>
								<span><FiFlag aria-hidden='true' /></span>
								<div><strong>{t('shell.createCard.stage')}</strong><small>{t('shell.createCard.stageInlineHint')}</small></div>
								<button type='button' className={styles.averageAction} onClick={useAveragePlan}><FiCheck aria-hidden='true' />{t('shell.createCard.splitEvenly')}</button>
							</header>
							<div className={styles.stageList}>
								{stages.map((stage, index) => (
									<div className={styles.stageRow} key={stage.key}>
										<span className={styles.stageNumber}>{index + 1}</span>
										<div className={styles.stageMain}>
											<label className={styles.editableTitle}>
												<FiEdit3 aria-hidden='true' />
												<input
													value={stage.title}
													aria-label={t('shell.createCard.editStageName', { number: index + 1 })}
													onChange={(event) => setStages((current) => current.map((item) => item.key === stage.key ? { ...item, title: event.target.value } : item))}
												/>
											</label>
											<div className={styles.stageInputs}>
												<label><span>{t('shell.createCard.stageTarget')}</span><span className={styles.inputWithUnit}><input type='number' min='1' inputMode='decimal' value={stage.target} onChange={(event) => updateStageTarget(stage.key, event.target.value)} /><small>{selectedUnit}</small></span></label>
												<label><span>{t('shell.createCard.stageDuration')}</span><span className={`${styles.inputWithUnit} ${styles.durationInput}`}><input type='number' min='1' max={countCalendarDays(stage.startDate, addCalendarDays(longEndDate, -(stages.length - index - 1)))} inputMode='numeric' value={stage.durationDays} onChange={(event) => updateStageDuration(index, event.target.value)} /><small>{t('shell.createCard.daysUnit')}</small></span></label>
												<label><span>{t('shell.createCard.stageDate')}</span><input type='date' min={stage.startDate} max={addCalendarDays(longEndDate, -(stages.length - index - 1))} value={stage.endDate} onChange={(event) => updateStageEndDate(index, event.target.value)} /></label>
											</div>
											<small className={styles.stageDaily}>{t('shell.createCard.stageDailyReference', { value: stage.dailyTarget || '—', unit: selectedUnit, days: stage.activeDays })}</small>
										</div>
										{stages.length > 1 && <button type='button' className={styles.removeStage} aria-label={t('shell.createCard.removeStage', { number: index + 1 })} onClick={() => removeStage(stage.key)}><FiTrash2 aria-hidden='true' /></button>}
									</div>
								))}
							</div>
							<div className={styles.stageFooter}>
								<button type='button' className={styles.addStage} onClick={addStage}><FiPlus aria-hidden='true' />{t('shell.createCard.addStage')}</button>
								<small data-balanced={Math.abs(allocationDifference) < 10 ** -(selected.decimals + 1)}>{Math.abs(allocationDifference) < 10 ** -(selected.decimals + 1) ? t('shell.createCard.fullyAllocated') : t('shell.createCard.remainingAllocation', { value: allocationDifference.toFixed(selected.decimals).replace(/\.?0+$/, ''), unit: selectedUnit })}</small>
							</div>
						</section>
					)}

					<section className={styles.planBlock}>
						<header className={styles.blockHeader}>
							<span><FiCalendar aria-hidden='true' /></span>
							<div><strong>{t('shell.createCard.dailyPlan')}</strong><small>{t('shell.createCard.dailyPlanHint')}</small></div>
						</header>
						<div className={styles.weekdays} role='group' aria-label={t('shell.createCard.executionDays')}>
							{WEEKDAYS.map((day) => <button type='button' key={day} aria-pressed={weekdays.includes(day)} onClick={() => toggleWeekday(day)}>{t(`shell.createCard.weekdays.${day}`)}</button>)}
						</div>
						<div className={styles.planModes}>
							<button type='button' aria-pressed={planMode === 'average'} onClick={useAverageDailyPlan}>{t('shell.createCard.averageMode')}</button>
							<button type='button' aria-pressed={planMode === 'custom'} onClick={useCustomPlan}>{t('shell.createCard.customMode')}</button>
						</div>
						{planMode === 'average' ? (
							<div className={styles.averageSummary} data-ready={Boolean(averageDailyTarget)}>
								<strong>{averageDailyTarget || '—'} <small>{selectedUnit}</small></strong>
								<span>{averageDailyTarget
									? t('shell.createCard.averageSummary', { days: weekdays.length })
									: t('shell.createCard.dailyPlanNeedsTarget')}</span>
							</div>
						) : (
							<div className={styles.customDailyGrid}>
								{weekdays.map((day) => (
									<label key={day}>
										<span>{t(`shell.createCard.weekdaysLong.${day}`)}</span>
										<span className={styles.inputWithUnit}><input type='number' min='0' inputMode='decimal' value={customTargets[day] ?? ''} onChange={(event) => setCustomTargets((current) => ({ ...current, [day]: event.target.value }))} /><small>{selectedUnit}</small></span>
									</label>
								))}
							</div>
						)}
						{planMode === 'custom' && customProjection !== null && targetTotal > 0 && (
							<p className={styles.projection} data-on-target={Math.abs(customProjection - targetTotal) <= 10 ** -selected.decimals}>
								{t('shell.createCard.customProjection', { value: customProjection.toFixed(selected.decimals).replace(/\.?0+$/, ''), unit: selectedUnit, difference: (customProjection - targetTotal).toFixed(selected.decimals).replace(/\.?0+$/, '') })}
							</p>
						)}
					</section>

					{templateId === 'light-food' && (
						<section className={styles.planBlock}>
							<header className={styles.blockHeader}>
								<span><PiLeaf aria-hidden='true' /></span>
								<div><strong>{t('shell.createCard.foodRulesTitle')}</strong><small>{t('shell.createCard.foodRulesHint')}</small></div>
							</header>
							<div className={styles.foodRules}>
								{foodRules.map((rule) => (
									<div key={rule.id}>
										<PiLeaf aria-hidden='true' />
										<span>{rule.label}</span>
										{!rule.builtIn && (
											<button type='button' aria-label={t('shell.createCard.removeFoodRule', { label: rule.label })} onClick={() => setFoodRules((current) => current.filter(({ id }) => id !== rule.id))}>
												<FiX aria-hidden='true' />
											</button>
										)}
									</div>
								))}
								<label className={styles.addFoodRule}>
									<PiLeaf aria-hidden='true' />
									<input value={newFoodRule} maxLength={80} placeholder={t('shell.createCard.foodRulePlaceholder')} onChange={(event) => setNewFoodRule(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addFoodRule(); } }} />
									<button type='button' aria-label={t('shell.createCard.addFoodRule')} onClick={addFoodRule}><FiPlus aria-hidden='true' /></button>
								</label>
							</div>
						</section>
					)}
				</section>}

				{flowStep === 2 && (
					<section className={styles.review}>
						<header>
							<span className={`${styles.identityIcon} ${styles[selected.accent]}`}><selected.icon aria-hidden='true' /></span>
							<div><small>{t('shell.createCard.reviewHabit')}</small><h2>{cardTitle}</h2></div>
						</header>
						{isEventDriven ? <p className={styles.eventDrivenHint}>{t('shell.createCard.eventDrivenHint')}</p> : <dl>
							<div><dt>{t('shell.createCard.reviewPeriod')}</dt><dd>{longDurationDays} {t('shell.createCard.daysUnit')} · {longEndDate}</dd></div>
							<div><dt>{t('shell.createCard.reviewDays')}</dt><dd>{weekdays.map((day) => t(`shell.createCard.weekdays.${day}`)).join('、')}</dd></div>
							<div><dt>{t('shell.createCard.reviewDaily')}</dt><dd>{averageDailyTarget} {selectedUnit}</dd></div>
							{templateId === 'light-food' && <div><dt>{t('shell.createCard.foodRulesTitle')}</dt><dd>{t('shell.createCard.reviewRuleCount', { count: foodRules.length })}</dd></div>}
							<div><dt>{t('shell.createCard.stagedPlan')}</dt><dd>{t(stagedPlanEnabled ? 'shell.createCard.reviewEnabled' : 'shell.createCard.reviewDisabled')}</dd></div>
						</dl>}
						<div className={styles.todayPreview}>
							<selected.icon aria-hidden='true' />
							<div><strong>{cardTitle}</strong><small>{isEventDriven ? t('shell.createCard.eventDrivenHint') : t('shell.createCard.todayPreviewHint', { value: averageDailyTarget, unit: selectedUnit })}</small></div>
							<span>{templateId === 'light-food' || isEventDriven ? t('shell.createCard.detailAction') : t('shell.today.completeAction')}</span>
						</div>
					</section>
				)}
				{error && <p className={styles.error} role='alert'>{error}</p>}
			</section>

			<footer className={styles.actions}>
				<button
					type='button'
					className={styles.secondary}
					onClick={() => flowStep === 0 ? navigate(APP_ROUTES.DECK) : setFlowStep(isEventDriven ? 0 : (flowStep - 1) as 0 | 1)}
				>
					{t(flowStep === 0 ? 'shell.createCard.cancel' : 'shell.createCard.previous')}
				</button>
				<button
					type='button'
					className={styles.primary}
					disabled={submitting}
					onClick={() => { if (flowStep === 2) void submit(); else continueFlow(); }}
				>
					{flowStep === 2 ? <FiCheck aria-hidden='true' /> : null}
					{t(flowStep === 2 ? 'shell.createCard.createHabit' : 'shell.createCard.continue')}
					{flowStep < 2 ? <PiArrowRight aria-hidden='true' /> : null}
				</button>
			</footer>
		</main>
	);
}

export { CreateRunningCardPage };
