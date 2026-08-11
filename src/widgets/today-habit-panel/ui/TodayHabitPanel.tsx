/* eslint-disable react-refresh/only-export-components -- The approved task boundary keeps the tested interaction helpers beside this panel. */
import { useRef, useState, type FormEvent, type PointerEvent } from 'react';
import { useTranslation } from 'react-i18next';
import {
	PiCaretDown,
	PiCheck,
	PiCheckCircle,
	PiClock,
	PiHandSwipeLeft,
	PiHeartbeat,
	PiMoon,
	PiNotePencil,
	PiPencilSimple,
	PiPlayFill,
	PiPlus,
	PiTimer,
	PiTrash,
	PiX,
} from 'react-icons/pi';

import type { DailyHabitView } from '@features/load-daily-habits';
import { SegmentedPaceInput } from '@shared/ui/segmented-pace-input/SegmentedPaceInput';
import { HabitGlyph } from '@widgets/habit-glyph';

import styles from './TodayHabitPanel.module.css';

export type HabitControlAction = 'decrease' | 'increase' | 'record' | 'toggle';

export interface HabitActualEntry {
	quantityBaseValue: number;
	durationSeconds?: number;
	averagePaceSecondsPerKm?: number;
	averageHeartRateBpm?: number;
	note?: string;
}

export interface TodayHabitPanelProps {
	habits: readonly DailyHabitView[];
	context?: 'today' | 'backfill';
	completedExpanded: boolean;
	pendingIds: ReadonlySet<string>;
	saveErrorIds: ReadonlySet<string>;
	onChange: (habit: DailyHabitView, quantityBaseValue: number) => void;
	onComplete: (habit: DailyHabitView) => void;
	onSaveActual: (habit: DailyHabitView, entry: HabitActualEntry) => void;
	onOpenDetails?: (habit: DailyHabitView) => void;
	onRequestDelete?: (habit: DailyHabitView) => void;
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

const SWIPE_ACTION_WIDTH = 84;
const SWIPE_REVEAL_THRESHOLD = 42;

export function resolveSwipeReveal({
	deltaX,
	deltaY,
	wasRevealed,
}: {
	deltaX: number;
	deltaY: number;
	wasRevealed: boolean;
}): boolean {
	if (Math.abs(deltaY) > Math.abs(deltaX)) return wasRevealed;
	if (wasRevealed) return deltaX < SWIPE_REVEAL_THRESHOLD;
	return deltaX <= -SWIPE_REVEAL_THRESHOLD;
}

function isCompleted(habit: DailyHabitView): boolean {
	return habit.scheduledToday
		&& (habit.entryMethod === 'completed'
			|| habit.quantityBaseValue >= habit.dailyTargetBase);
}

function number(value: number, maximumFractionDigits = 2): string {
	return new Intl.NumberFormat(undefined, { maximumFractionDigits }).format(value);
}

function basePerDisplayUnit(habit: DailyHabitView): number {
	return habit.basePerDisplayUnit;
}

function dailyTargetDisplay(habit: DailyHabitView): string {
	if (habit.trackingType !== 'quantity') return number(habit.dailyTargetBase);
	return number(habit.dailyTargetBase / basePerDisplayUnit(habit));
}

function totalDisplay(habit: DailyHabitView): string {
	if (habit.trackingType !== 'quantity') return number(habit.totalQuantityBaseValue);
	return number(habit.totalQuantityBaseValue / basePerDisplayUnit(habit), 1);
}

export function parsePaceText(value: string): number | undefined {
	const match = /^(\d{1,2}):([0-5]\d)$/.exec(value.trim());
	if (!match) return undefined;
	const seconds = Number(match[1]) * 60 + Number(match[2]);
	return seconds > 0 ? seconds : undefined;
}

function formatPaceText(seconds: number | undefined): string {
	if (!seconds) return '';
	return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

function ActualEntryEditor({
	habit,
	context,
	pending,
	onCancel,
	onSave,
}: {
	habit: DailyHabitView;
	context: 'today' | 'backfill';
	pending: boolean;
	onCancel: () => void;
	onSave: (entry: HabitActualEntry) => void;
}) {
	const { t } = useTranslation();
	const [actual, setActual] = useState(habit.quantityBaseValue > 0 ? habit.displayValue : '');
	const [durationMinutes, setDurationMinutes] = useState(
		habit.durationSeconds ? String(habit.durationSeconds / 60) : '',
	);
	const [pace, setPace] = useState(formatPaceText(habit.averagePaceSecondsPerKm));
	const [heartRate, setHeartRate] = useState(
		habit.averageHeartRateBpm ? String(habit.averageHeartRateBpm) : '',
	);
	const [note, setNote] = useState(habit.note ?? '');
	const [invalid, setInvalid] = useState(false);

	function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const displayValue = Number(actual);
		const quantityBaseValue = Math.round(displayValue * habit.basePerDisplayUnit);
		const durationSeconds = durationMinutes ? Math.round(Number(durationMinutes) * 60) : undefined;
		const averagePaceSecondsPerKm = pace ? parsePaceText(pace) : undefined;
		const averageHeartRateBpm = heartRate ? Number(heartRate) : undefined;
		const valid = Number.isFinite(displayValue)
			&& quantityBaseValue > 0
			&& (!durationSeconds || durationSeconds > 0)
			&& (!pace || averagePaceSecondsPerKm !== undefined)
			&& (!averageHeartRateBpm || (
				Number.isSafeInteger(averageHeartRateBpm)
				&& averageHeartRateBpm >= 30
				&& averageHeartRateBpm <= 240
			));
		if (!valid) {
			setInvalid(true);
			return;
		}
		onSave({
			quantityBaseValue,
			durationSeconds,
			averagePaceSecondsPerKm,
			averageHeartRateBpm,
			note: note.trim() || undefined,
		});
	}

	return (
		<form className={styles.actualEditor} onSubmit={submit}>
			<header>
				<div>
					<strong>{t(context === 'backfill'
						? 'shell.today.backfillActualEditorTitle'
						: 'shell.today.actualEditorTitle')}</strong>
					<small>
						{t(context === 'backfill'
							? 'shell.today.backfillActualEditorPlan'
							: 'shell.today.actualEditorPlan', {
							target: dailyTargetDisplay(habit),
							unit: habit.displayUnit,
						})}
					</small>
				</div>
				<button type='button' onClick={onCancel} aria-label={t('shell.today.closeActualEditor')}>
					<PiX aria-hidden='true' />
				</button>
			</header>
			<label className={styles.actualField}>
				<span>{t('shell.today.actualQuantity')}</span>
				<div>
					<input
						type='number'
						inputMode='decimal'
						min={1 / habit.basePerDisplayUnit}
						step={1 / habit.basePerDisplayUnit}
						value={actual}
						onChange={(event) => {
							setActual(event.target.value);
							setInvalid(false);
						}}
						autoFocus
					/>
					<b>{habit.displayUnit}</b>
				</div>
			</label>
			{habit.supportsTrainingDetails && (
				<div className={styles.trainingFields}>
					<label>
						<PiClock aria-hidden='true' />
						<span>{t('shell.today.durationMinutes')}</span>
						<input
							type='number'
							inputMode='decimal'
							min='0.1'
							step='0.1'
							value={durationMinutes}
							onChange={(event) => setDurationMinutes(event.target.value)}
							placeholder={t('shell.today.optional')}
						/>
					</label>
					<SegmentedPaceInput
						className={styles.paceField}
						label={t('shell.today.averagePace')}
						value={pace}
						onChange={(value) => {
							setPace(value);
							setInvalid(false);
						}}
						invalid={invalid && Boolean(pace) && parsePaceText(pace) === undefined}
						icon={<PiTimer aria-hidden='true' />}
					/>
					<label>
						<PiHeartbeat aria-hidden='true' />
						<span>{t('shell.today.averageHeartRate')}</span>
						<input
							type='number'
							inputMode='numeric'
							min='30'
							max='240'
							value={heartRate}
							onChange={(event) => setHeartRate(event.target.value)}
							placeholder={t('shell.today.optional')}
						/>
					</label>
					<label className={styles.noteField}>
						<PiNotePencil aria-hidden='true' />
						<span>{t('shell.today.trainingNote')}</span>
						<input
							type='text'
							maxLength={280}
							value={note}
							onChange={(event) => setNote(event.target.value)}
							placeholder={t('shell.today.trainingNotePlaceholder')}
						/>
					</label>
				</div>
			)}
			{invalid && <p role='alert'>{t('shell.today.actualEntryInvalid')}</p>}
			<footer>
				<small>
					{habit.carryInBaseValue > 0
						? t('shell.today.includesCarry', {
							carry: number(habit.carryInBaseValue / habit.basePerDisplayUnit),
							unit: habit.displayUnit,
						})
						: t('shell.today.actualEntryHint')}
				</small>
				<button type='submit' disabled={pending}>
					<PiCheck aria-hidden='true' />
					{t('shell.today.saveActual')}
				</button>
			</footer>
		</form>
	);
}

function HabitSupportingCopy({
	habit,
	context,
}: {
	habit: DailyHabitView;
	context: 'today' | 'backfill';
}) {
	const { t } = useTranslation();
	const completed = isCompleted(habit);

	if (!habit.scheduledToday) {
		return <small>{t('shell.today.restDay')}</small>;
	}
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
				{t(context === 'backfill'
					? 'shell.today.backfillDailyProgress'
					: 'shell.today.dailyProgress', {
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
	onComplete,
	onEditActual,
	onOpenDetails,
}: {
	habit: DailyHabitView;
	pending: boolean;
	onChange: (quantityBaseValue: number) => void;
	onComplete: () => void;
	onEditActual: () => void;
	onOpenDetails?: () => void;
}) {
	const { t } = useTranslation();
	const completed = isCompleted(habit);

	if (!habit.scheduledToday) {
		return (
			<span className={styles.restStatus} aria-label={t('shell.today.restDay')}>
				<PiMoon aria-hidden='true' />
			</span>
		);
	}
	if (onOpenDetails) {
		return (
			<div className={styles.quantityActions}>
				<button
					type='button'
					className={styles.completeAction}
					disabled={pending || completed}
					data-recorded={completed || undefined}
					onClick={completed ? undefined : onComplete}
				>
					<PiCheckCircle aria-hidden='true' />
					<span>{t(completed
						? 'shell.today.completedAction'
						: 'shell.today.completeAction')}</span>
				</button>
				<button
					type='button'
					className={styles.actualAction}
					disabled={pending}
					onClick={onOpenDetails}
				>
					<PiPencilSimple aria-hidden='true' />
					<span>{t(habit.trackingType === 'checklist'
						? 'shell.createCard.detailAction'
						: 'shell.today.enterActual')}</span>
				</button>
				{completed && (
					<button
						type='button'
						className={styles.undoQuantity}
						disabled={pending || habit.quantityBaseValue === 0}
						aria-label={t('shell.today.decreaseHabit', { title: habit.title })}
						onClick={() => onChange(0)}
					>
						<PiX aria-hidden='true' />
					</button>
				)}
			</div>
		);
	}
	if (habit.trackingType === 'quantity') {
		return (
			<div className={styles.quantityActions}>
				<button
					type='button'
					className={styles.completeAction}
					disabled={pending || completed}
					data-recorded={completed || undefined}
					onClick={completed ? undefined : onComplete}
				>
					<PiCheckCircle aria-hidden='true' />
					<span>{t(completed
						? 'shell.today.completedAction'
						: 'shell.today.completeAction')}</span>
				</button>
				<button
					type='button'
					className={styles.actualAction}
					disabled={pending}
					onClick={onEditActual}
				>
					<PiPencilSimple aria-hidden='true' />
					<span>{t('shell.today.enterActual')}</span>
				</button>
				{completed && (
					<button
						type='button'
						className={styles.undoQuantity}
						disabled={pending || habit.quantityBaseValue === 0}
						aria-label={t('shell.today.decreaseHabit', { title: habit.title })}
						onClick={() => onChange(0)}
					>
						<PiX aria-hidden='true' />
					</button>
				)}
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
	context,
	pending,
	saveError,
	actualEditorOpen,
	onChange,
	onComplete,
	onEditActual,
	onOpenDetails,
	onCancelActual,
	onSaveActual,
}: {
	habit: DailyHabitView;
	context: 'today' | 'backfill';
	pending: boolean;
	saveError: boolean;
	actualEditorOpen: boolean;
	onChange: (habit: DailyHabitView, quantityBaseValue: number) => void;
	onComplete: (habit: DailyHabitView) => void;
	onEditActual: () => void;
	onOpenDetails?: () => void;
	onCancelActual: () => void;
	onSaveActual: (habit: DailyHabitView, entry: HabitActualEntry) => void;
}) {
	const { t } = useTranslation();

	return (
		<div
			className={styles.habitRow}
			data-habit-id={habit.id}
			data-tracking-type={habit.trackingType}
			data-accent={habit.accent}
			data-completed={isCompleted(habit)}
			data-scheduled={habit.scheduledToday}
			aria-busy={pending || undefined}
		>
			<HabitGlyph
				iconKey={habit.iconKey}
				accent={habit.accent}
				label={habit.title}
				decorative
			/>
			<div className={styles.habitCopy}>
				<strong>{habit.title}</strong>
				<HabitSupportingCopy habit={habit} context={context} />
			</div>
			<HabitControl
				habit={habit}
				pending={pending}
				onChange={(quantityBaseValue) => onChange(habit, quantityBaseValue)}
				onComplete={() => onComplete(habit)}
				onEditActual={onEditActual}
				onOpenDetails={onOpenDetails}
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
			{actualEditorOpen && (
				<ActualEntryEditor
					habit={habit}
					context={context}
					pending={pending}
					onCancel={onCancelActual}
					onSave={(entry) => onSaveActual(habit, entry)}
				/>
			)}
		</div>
	);
}

interface SwipeGesture {
	pointerId: number;
	startOffset: number;
	startX: number;
	startY: number;
}

function SwipeableHabitRow({
	habit,
	revealed,
	onReveal,
	onRequestDelete,
	...rowProps
}: Omit<Parameters<typeof HabitRow>[0], 'habit'> & {
	habit: DailyHabitView;
	revealed: boolean;
	onReveal: (revealed: boolean) => void;
	onRequestDelete?: (habit: DailyHabitView) => void;
}) {
	const { t } = useTranslation();
	const gestureRef = useRef<SwipeGesture | null>(null);
	const [dragging, setDragging] = useState(false);
	const [dragOffset, setDragOffset] = useState(0);
	const swipeEnabled = Boolean(onRequestDelete);
	const currentOffset = dragging
		? dragOffset
		: revealed ? -SWIPE_ACTION_WIDTH : 0;

	function pointerDown(event: PointerEvent<HTMLDivElement>) {
		if (!swipeEnabled || rowProps.pending) return;
		const target = event.target;
		// eslint-disable-next-line i18next/no-literal-string -- This is an interaction selector, not user-facing copy.
		if (target instanceof Element && target.closest('button, a, input, textarea, select')) return;
		gestureRef.current = {
			pointerId: event.pointerId,
			startOffset: revealed ? -SWIPE_ACTION_WIDTH : 0,
			startX: event.clientX,
			startY: event.clientY,
		};
		setDragOffset(revealed ? -SWIPE_ACTION_WIDTH : 0);
		setDragging(true);
		event.currentTarget.setPointerCapture?.(event.pointerId);
	}

	function pointerMove(event: PointerEvent<HTMLDivElement>) {
		const gesture = gestureRef.current;
		if (!gesture || gesture.pointerId !== event.pointerId) return;
		const deltaX = event.clientX - gesture.startX;
		const deltaY = event.clientY - gesture.startY;
		if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 8) {
			gestureRef.current = null;
			setDragging(false);
			return;
		}
		if (Math.abs(deltaX) < 6) return;
		event.preventDefault();
		setDragOffset(Math.max(
			-SWIPE_ACTION_WIDTH,
			Math.min(0, gesture.startOffset + deltaX),
		));
	}

	function finishPointer(event: PointerEvent<HTMLDivElement>) {
		const gesture = gestureRef.current;
		if (!gesture || gesture.pointerId !== event.pointerId) return;
		const shouldReveal = resolveSwipeReveal({
			deltaX: event.clientX - gesture.startX,
			deltaY: event.clientY - gesture.startY,
			wasRevealed: revealed,
		});
		gestureRef.current = null;
		setDragging(false);
		onReveal(shouldReveal);
		event.currentTarget.releasePointerCapture?.(event.pointerId);
	}

	function cancelPointer(event: PointerEvent<HTMLDivElement>) {
		if (gestureRef.current?.pointerId !== event.pointerId) return;
		gestureRef.current = null;
		setDragging(false);
	}

	return (
		<div
			className={styles.swipeShell}
			data-swipe-habit-id={habit.id}
			data-revealed={revealed || undefined}
			data-dragging={dragging || undefined}
			onPointerDown={pointerDown}
			onPointerMove={pointerMove}
			onPointerUp={finishPointer}
			onPointerCancel={cancelPointer}
			role='listitem'
		>
			{onRequestDelete && (
				<button
					type='button'
					className={styles.deleteAction}
					data-testid='delete-habit-action'
					tabIndex={revealed ? 0 : -1}
					aria-label={t('shell.today.deleteHabit', { title: habit.title })}
					disabled={rowProps.pending}
					onClick={() => {
						onReveal(false);
						onRequestDelete(habit);
					}}
				>
					<PiTrash aria-hidden='true' />
					<span>{t('habits.actions.delete')}</span>
				</button>
			)}
			<div
				className={styles.swipeContent}
				style={{ transform: `translateX(${currentOffset}px)` }}
			>
				<HabitRow habit={habit} {...rowProps} />
			</div>
		</div>
	);
}

function TodayHabitPanel({
	habits,
	context = 'today',
	completedExpanded,
	pendingIds,
	saveErrorIds,
	onChange,
	onComplete,
	onSaveActual,
	onOpenDetails,
	onRequestDelete,
	onToggleCompleted,
}: TodayHabitPanelProps) {
	const { t } = useTranslation();
	const [actualEditorId, setActualEditorId] = useState<string | null>(null);
	const [revealedHabitId, setRevealedHabitId] = useState<string | null>(null);
	const completedCount = habits.filter(isCompleted).length;
	const visibleHabits = completedExpanded
		? habits
		: habits.filter((habit) => !isCompleted(habit));

	return (
		<section
			className={styles.panel}
			data-testid='today-habit-panel'
			data-context={context}
		>
			{habits.length > 0 && onRequestDelete && (
				<p className={styles.swipeHint}>
					<PiHandSwipeLeft aria-hidden='true' />
					<span>{t('shell.today.swipeDeleteHint')}</span>
				</p>
			)}
			{habits.length === 0 ? (
				<div className={styles.empty}>
					<strong>{t('shell.today.emptyTitle')}</strong>
					<p>{t('shell.today.emptyDescription')}</p>
				</div>
			) : (
				<div className={styles.rows} role='list'>
					{visibleHabits.map((habit) => (
						<SwipeableHabitRow
							key={habit.id}
							habit={habit}
							revealed={revealedHabitId === habit.id}
							context={context}
							pending={pendingIds.has(habit.id)}
							saveError={saveErrorIds.has(habit.id)}
							actualEditorOpen={actualEditorId === habit.id}
							onReveal={(revealed) => {
								setRevealedHabitId(revealed ? habit.id : null);
							}}
							onRequestDelete={onRequestDelete}
							onChange={onChange}
							onComplete={onComplete}
							onEditActual={() => {
								setRevealedHabitId(null);
								setActualEditorId(habit.id);
							}}
							onOpenDetails={onOpenDetails ? () => onOpenDetails(habit) : undefined}
							onCancelActual={() => setActualEditorId(null)}
							onSaveActual={(selectedHabit, entry) => {
								onSaveActual(selectedHabit, entry);
								setActualEditorId(null);
							}}
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
