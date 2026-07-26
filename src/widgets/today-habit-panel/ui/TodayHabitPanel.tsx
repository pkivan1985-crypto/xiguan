/* eslint-disable react-refresh/only-export-components -- The approved task boundary keeps the tested interaction reducers beside this panel. */
import { useTranslation } from 'react-i18next';
import {
	PiCaretDown,
	PiCheck,
	PiMinus,
	PiPlayFill,
	PiPlus,
} from 'react-icons/pi';

import type { DailyHabitView } from '@features/load-daily-habits';
import { HabitGlyph } from '@widgets/habit-glyph';

import styles from './TodayHabitPanel.module.css';

export type HabitControlAction = 'decrease' | 'increase' | 'record' | 'toggle';

export interface TodayHabitPanelProps {
	habits: readonly DailyHabitView[];
	completedExpanded: boolean;
	pendingIds: ReadonlySet<string>;
	saveErrorIds: ReadonlySet<string>;
	onChange: (habit: DailyHabitView, quantityBaseValue: number) => void;
	onToggleCompleted: () => void;
}

export function toggleCompletedVisibility(current: boolean): boolean {
	return !current;
}

export function nextHabitQuantity(
	habit: DailyHabitView,
	action: HabitControlAction,
): number {
	if (action === 'decrease') {
		return Math.max(0, habit.quantityBaseValue - habit.stepBase);
	}
	if (action === 'increase' || action === 'record') {
		return habit.quantityBaseValue + habit.stepBase;
	}
	return habit.quantityBaseValue >= habit.dailyTargetBase ? 0 : habit.dailyTargetBase;
}

function isCompleted(habit: DailyHabitView): boolean {
	return habit.quantityBaseValue >= habit.dailyTargetBase;
}

function number(value: number, maximumFractionDigits = 2): string {
	return new Intl.NumberFormat(undefined, { maximumFractionDigits }).format(value);
}

function basePerDisplayUnit(habit: DailyHabitView): number {
	const displayed = Number(habit.displayValue);
	if (habit.quantityBaseValue > 0 && Number.isFinite(displayed) && displayed > 0) {
		return habit.quantityBaseValue / displayed;
	}
	return Math.max(habit.stepBase * 2, 1);
}

function dailyTargetDisplay(habit: DailyHabitView): string {
	if (habit.trackingType !== 'quantity') return number(habit.dailyTargetBase);
	return number(habit.dailyTargetBase / basePerDisplayUnit(habit));
}

function totalDisplay(habit: DailyHabitView): string {
	if (habit.trackingType !== 'quantity') return number(habit.totalQuantityBaseValue);
	return number(habit.totalQuantityBaseValue / basePerDisplayUnit(habit), 1);
}

function HabitSupportingCopy({ habit }: { habit: DailyHabitView }) {
	const { t } = useTranslation();
	const completed = isCompleted(habit);

	if (habit.trackingType === 'check') {
		return <small>{t('shell.today.activeDayCount', { count: habit.activeDays })}</small>;
	}
	if (habit.trackingType === 'avoid') {
		return (
			<small>
				{t(completed ? 'shell.today.todayCompleted' : 'shell.today.todayPending')}
			</small>
		);
	}

	return (
		<>
			<small>
				{t('shell.today.dailyProgress', {
					current: habit.displayValue,
					target: dailyTargetDisplay(habit),
					unit: habit.displayUnit,
				})}
			</small>
			{habit.trackingType === 'quantity' && habit.goalProgressRatio !== undefined && (
				<small>
					{t('shell.today.goalProgress', {
						total: totalDisplay(habit),
						unit: habit.displayUnit,
						progress: Math.round(habit.goalProgressRatio * 100),
					})}
				</small>
			)}
		</>
	);
}

function HabitControl({
	habit,
	pending,
	onChange,
}: {
	habit: DailyHabitView;
	pending: boolean;
	onChange: (quantityBaseValue: number) => void;
}) {
	const { t } = useTranslation();
	const completed = isCompleted(habit);

	if (habit.trackingType === 'quantity') {
		return (
			<div className={styles.quantityControl}>
				<span className={styles.currentValue}>
					<strong>{habit.displayValue}</strong>
					<small>{habit.displayUnit}</small>
				</span>
				<span className={styles.stepActions}>
					<button
						type='button'
						disabled={pending || habit.quantityBaseValue === 0}
						aria-label={t('shell.today.decreaseHabit', { title: habit.title })}
						onClick={() => onChange(nextHabitQuantity(habit, 'decrease'))}
					>
						<PiMinus aria-hidden='true' />
					</button>
					<button
						type='button'
						disabled={pending}
						aria-label={t('shell.today.increaseHabit', { title: habit.title })}
						onClick={() => onChange(nextHabitQuantity(habit, 'increase'))}
					>
						<PiPlus aria-hidden='true' />
					</button>
				</span>
			</div>
		);
	}

	if (habit.trackingType === 'count') {
		return (
			<button
				type='button'
				className={styles.squareControl}
				disabled={pending}
				aria-label={t('shell.today.increaseHabit', { title: habit.title })}
				onClick={() => onChange(nextHabitQuantity(habit, 'increase'))}
			>
				<PiPlus aria-hidden='true' />
			</button>
		);
	}

	if (habit.trackingType === 'duration') {
		return (
			<button
				type='button'
				className={styles.circleControl}
				disabled={pending}
				aria-label={t('shell.today.recordHabit', { title: habit.title })}
				onClick={() => onChange(nextHabitQuantity(habit, 'record'))}
			>
				<PiPlayFill aria-hidden='true' />
			</button>
		);
	}

	return (
		<button
			type='button'
			className={styles.circleControl}
			disabled={pending}
			aria-pressed={completed}
			aria-label={t(completed ? 'shell.today.undoHabit' : 'shell.today.completeHabit', {
				title: habit.title,
			})}
			onClick={() => onChange(nextHabitQuantity(habit, 'toggle'))}
		>
			<PiCheck aria-hidden='true' />
		</button>
	);
}

function HabitRow({
	habit,
	pending,
	saveError,
	onChange,
}: {
	habit: DailyHabitView;
	pending: boolean;
	saveError: boolean;
	onChange: (habit: DailyHabitView, quantityBaseValue: number) => void;
}) {
	const { t } = useTranslation();

	return (
		<div
			className={styles.habitRow}
			data-habit-id={habit.id}
			data-tracking-type={habit.trackingType}
			data-accent={habit.accent}
			data-completed={isCompleted(habit)}
			aria-busy={pending || undefined}
			role='listitem'
		>
			<HabitGlyph
				iconKey={habit.iconKey}
				accent={habit.accent}
				label={habit.title}
				decorative
			/>
			<div className={styles.habitCopy}>
				<strong>{habit.title}</strong>
				<HabitSupportingCopy habit={habit} />
			</div>
			<HabitControl
				habit={habit}
				pending={pending}
				onChange={(quantityBaseValue) => onChange(habit, quantityBaseValue)}
			/>
			{saveError && (
				<p
					className={styles.inlineError}
					data-error-for={habit.id}
					role='alert'
				>
					{t('shell.today.itemSaveError')}
				</p>
			)}
		</div>
	);
}

function TodayHabitPanel({
	habits,
	completedExpanded,
	pendingIds,
	saveErrorIds,
	onChange,
	onToggleCompleted,
}: TodayHabitPanelProps) {
	const { t } = useTranslation();
	const completedCount = habits.filter(isCompleted).length;
	const visibleHabits = completedExpanded
		? habits
		: habits.filter((habit) => !isCompleted(habit));

	return (
		<section className={styles.panel} data-testid='today-habit-panel'>
			{habits.length === 0 ? (
				<div className={styles.empty}>
					<strong>{t('shell.today.emptyTitle')}</strong>
					<p>{t('shell.today.emptyDescription')}</p>
				</div>
			) : (
				<div className={styles.rows} role='list'>
					{visibleHabits.map((habit) => (
						<HabitRow
							key={habit.id}
							habit={habit}
							pending={pendingIds.has(habit.id)}
							saveError={saveErrorIds.has(habit.id)}
							onChange={onChange}
						/>
					))}
				</div>
			)}
			{completedCount > 0 && (
				<button
					type='button'
					className={styles.completedFold}
					aria-expanded={completedExpanded}
					onClick={onToggleCompleted}
				>
					<PiCaretDown aria-hidden='true' />
					<span>{t('shell.today.completedFold', { count: completedCount })}</span>
				</button>
			)}
		</section>
	);
}

export { TodayHabitPanel };
