/* eslint-disable i18next/no-literal-string -- Record kinds and option values are stable domain identifiers. */
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { IconType } from 'react-icons';
import {
	PiArrowLeft,
	PiBowlFood,
	PiBookOpenText,
	PiCheck,
	PiCoffee,
	PiDrop,
	PiFlame,
	PiGauge,
	PiHeartbeat,
	PiLeaf,
	PiMoonStars,
	PiMinus,
	PiNotePencil,
	PiPepper,
	PiPlus,
	PiPencilSimple,
	PiReceipt,
	PiShoppingBag,
	PiWallet,
	PiShieldCheck,
	PiTimer,
	PiX,
} from 'react-icons/pi';
import { useNavigate, useParams, useSearchParams } from 'react-router';

import type { HabitRecordDetails } from '@entities/action-record';
import { loadDailyHabitsInApp, type DailyHabitView } from '@features/load-daily-habits';
import { saveDailyHabitInApp } from '@features/save-daily-habit';
import { APP_ROUTES } from '@shared/config';
import { formatLocalDate, parseLocalDate } from '@shared/lib/date';
import { SegmentedPaceInput } from '@shared/ui/segmented-pace-input/SegmentedPaceInput';
import { HabitGlyph } from '@widgets/habit-glyph';

import {
	currentTrainingDetails,
	initialRunningRecordValues,
	plannedRunningDistance,
	previousTrainingDetails,
	type RunningRecordValueSource,
} from '../model/runningRecordDefaults';
import {
	buildExpenseLineItem,
	mergeExpenseLineItem,
	normalizeExpenseEntries,
	removeExpenseLineItem,
	type ExpenseRecordFormValues,
} from '../model/expenseRecord';
import styles from './HabitRecordPage.module.css';

const SCREEN_MOMENTS = ['after-waking', 'during-meals', 'before-sleep'] as const;
const FOOD_RULE_ICONS: Record<string, IconType> = {
	'avoid-heaty': PiFlame,
	'avoid-spicy': PiPepper,
	'avoid-greasy': PiBowlFood,
	'avoid-sugary-drinks': PiCoffee,
};

function numberOrUndefined(value: string): number | undefined {
	if (!value.trim()) return undefined;
	const parsed = Number(value);
	return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed) : undefined;
}

function positiveOrUndefined(value: string): number | undefined {
	const parsed = numberOrUndefined(value);
	return parsed && parsed > 0 ? parsed : undefined;
}

function paceSeconds(value: string): number | undefined {
	const match = /^(\d{1,2}):([0-5]\d)$/.exec(value.trim());
	return match ? Number(match[1]) * 60 + Number(match[2]) : undefined;
}

function minutesBetween(start: string, end: string): number | undefined {
	if (!start || !end) return undefined;
	const [startHour, startMinute] = start.split(':').map(Number);
	const [endHour, endMinute] = end.split(':').map(Number);
	let minutes = endHour! * 60 + endMinute! - (startHour! * 60 + startMinute!);
	if (minutes <= 0) minutes += 24 * 60;
	return minutes;
}

function localDateLabel(localDate: string, locale: string): string {
	const [year, month, day] = localDate.split('-').map(Number);
	const date = new Date(year!, month! - 1, day!, 12);
	const datePart = new Intl.DateTimeFormat(locale, {
		month: 'long',
		day: 'numeric',
	}).format(date);
	const weekdayPart = new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(date);
	return `${datePart} ${weekdayPart}`;
}

function BlockTitle({ icon: Icon, title, hint }: { icon: IconType; title: string; hint: string }) {
	return <header className={styles.blockTitle}><Icon aria-hidden='true' /><div><strong>{title}</strong><small>{hint}</small></div></header>;
}

interface FieldProps {
	label: string;
	value: string;
	onChange: (value: string) => void;
	unit?: string;
	placeholder?: string;
	icon?: ReactNode;
	inputType?: 'number' | 'text';
}

function Field({ label, value, onChange, unit, placeholder, icon, inputType = 'number' }: FieldProps) {
	return <label className={styles.field}><span>{icon}{label}</span><div><input type={inputType} inputMode={inputType === 'number' ? 'decimal' : undefined} min={inputType === 'number' ? '0' : undefined} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />{unit && <small>{unit}</small>}</div></label>;
}

function HabitRecordPage() {
	const { t, i18n } = useTranslation();
	const navigate = useNavigate();
	const { userCardId = '' } = useParams();
	const [searchParams] = useSearchParams();
	const expenseEntryId = searchParams.get('entry');
	const localDate = useMemo(
		() => parseLocalDate(searchParams.get('date') ?? formatLocalDate(new Date())),
		[searchParams],
	);
	const [habit, setHabit] = useState<DailyHabitView>();
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState(false);
	const [actual, setActual] = useState('');
	const [duration, setDuration] = useState('');
	const [pace, setPace] = useState('');
	const [heartRate, setHeartRate] = useState('');
	const [runningValueSource, setRunningValueSource] = useState<RunningRecordValueSource>('blank');
	const [note, setNote] = useState('');
	const [cupSize, setCupSize] = useState('300');
	const [morningCups, setMorningCups] = useState('');
	const [afternoonCups, setAfternoonCups] = useState('');
	const [eveningCups, setEveningCups] = useState('');
	const [beverageType, setBeverageType] = useState<'water' | 'tea' | 'coffee' | 'other'>('water');
	const [bookTitle, setBookTitle] = useState('');
	const [startPage, setStartPage] = useState('');
	const [endPage, setEndPage] = useState('');
	const [chapter, setChapter] = useState('');
	const [reflection, setReflection] = useState('');
	const [checkedRules, setCheckedRules] = useState<string[]>([]);
	const [onTime, setOnTime] = useState(true);
	const [bedtime, setBedtime] = useState('');
	const [wakeTime, setWakeTime] = useState('');
	const [quality, setQuality] = useState<1 | 2 | 3 | 4 | 5>(3);
	const [wakeFeeling, setWakeFeeling] = useState<'tired' | 'normal' | 'refreshed'>('normal');
	const [screenMinutes, setScreenMinutes] = useState('');
	const [shortVideoMinutes, setShortVideoMinutes] = useState('');
	const [socialMinutes, setSocialMinutes] = useState('');
	const [newsMinutes, setNewsMinutes] = useState('');
	const [otherMinutes, setOtherMinutes] = useState('');
	const [screenFreeMoments, setScreenFreeMoments] = useState<Array<(typeof SCREEN_MOMENTS)[number]>>([]);
	const [expenseItem, setExpenseItem] = useState('');
	const [expenseReason, setExpenseReason] = useState('');
	const [bankBalance, setBankBalance] = useState('');
	const [earnBackDays, setEarnBackDays] = useState('');
	const [compensation, setCompensation] = useState('');
	const [necessity, setNecessity] = useState<ExpenseRecordFormValues['necessity']>('necessary');
	const [occurredTime, setOccurredTime] = useState(() => new Date().toTimeString().slice(0, 5));

	useEffect(() => {
		let active = true;
		void loadDailyHabitsInApp(localDate)
			.then((model) => {
				if (!active) return;
				const selected = model.habits.find(({ id }) => id === userCardId);
				setHabit(selected);
				if (selected) {
					if (selected.officialCardId === 'running') {
						const initial = initialRunningRecordValues(selected);
						const currentDetails = currentTrainingDetails(selected);
						setActual(initial.distance);
						setRunningValueSource(initial.source);
						setDuration(selected.recordedToday ? currentDetails.duration : '');
						setPace(selected.recordedToday ? currentDetails.pace : '');
						setHeartRate(selected.recordedToday ? currentDetails.heartRate : '');
					} else if (selected.officialCardId === 'extra-expense') {
						setActual('');
					} else {
						setActual(selected.quantityBaseValue > 0 ? selected.displayValue : '');
						setDuration(selected.durationSeconds ? String(selected.durationSeconds / 60) : '');
						setHeartRate(selected.averageHeartRateBpm ? String(selected.averageHeartRateBpm) : '');
					}
					setNote(selected.note ?? '');
					const details = selected.details;
					if (details?.kind === 'water') {
						setCupSize(details.cupSizeMl ? String(details.cupSizeMl) : '300');
						setMorningCups(details.morningCups === undefined ? '' : String(details.morningCups));
						setAfternoonCups(details.afternoonCups === undefined ? '' : String(details.afternoonCups));
						setEveningCups(details.eveningCups === undefined ? '' : String(details.eveningCups));
						setBeverageType(details.beverageType ?? 'water');
					}
					if (details?.kind === 'reading') {
						setBookTitle(details.bookTitle ?? '');
						setDuration(details.durationMinutes ? String(details.durationMinutes) : '');
						setStartPage(details.startPage === undefined ? '' : String(details.startPage));
						setEndPage(details.endPage === undefined ? '' : String(details.endPage));
						setChapter(details.chapter ?? '');
						setReflection(details.reflection ?? '');
					}
					if (details?.kind === 'light-food') setCheckedRules(details.checkedRuleIds);
					if (details?.kind === 'sleep') {
						setOnTime(details.onTime ?? true);
						setBedtime(details.bedtime ?? '');
						setWakeTime(details.wakeTime ?? '');
						setQuality(details.quality ?? 3);
						setWakeFeeling(details.wakeFeeling ?? 'normal');
					}
					if (details?.kind === 'screen-free') {
						setScreenMinutes(details.screenMinutes === undefined ? '' : String(details.screenMinutes));
						setShortVideoMinutes(details.shortVideoMinutes === undefined ? '' : String(details.shortVideoMinutes));
						setSocialMinutes(details.socialMinutes === undefined ? '' : String(details.socialMinutes));
						setNewsMinutes(details.newsMinutes === undefined ? '' : String(details.newsMinutes));
						setOtherMinutes(details.otherMinutes === undefined ? '' : String(details.otherMinutes));
						setScreenFreeMoments(details.screenFreeMoments ?? []);
					}
					if (selected.officialCardId === 'extra-expense' && expenseEntryId && expenseEntryId !== 'new') {
						const expense = normalizeExpenseEntries(details, {
							fallbackId: `legacy-${localDate}`,
							fallbackAmountCents: selected.quantityBaseValue,
							fallbackTimestamp: selected.recordSavedAt ?? new Date().toISOString(),
						}).find(({ id }) => id === expenseEntryId);
						if (expense) {
							setActual(String(expense.amountCents / 100));
							setExpenseItem(expense.item);
							setExpenseReason(expense.reason);
							setBankBalance(expense.bankBalanceCents === undefined ? '' : String(expense.bankBalanceCents / 100));
							setEarnBackDays(expense.earnBackDays === undefined ? '' : String(expense.earnBackDays));
							setCompensation(expense.compensation ?? '');
							setNecessity(expense.necessity);
							setOccurredTime(expense.occurredTime);
						}
					}
					if (selected.officialCardId === 'extra-expense' && expenseEntryId === 'new') {
						setActual('');
						setExpenseItem('');
						setExpenseReason('');
						setBankBalance('');
						setEarnBackDays('');
						setCompensation('');
						setNecessity('necessary');
						setOccurredTime(new Date().toTimeString().slice(0, 5));
					}
				}
				setLoading(false);
			})
			.catch(() => { if (active) { setLoading(false); setError(true); } });
		return () => { active = false; };
	}, [expenseEntryId, localDate, userCardId]);

	function buildEntry(): { quantityBaseValue: number; details?: HabitRecordDetails } | null {
		if (!habit) return null;
		if (habit.officialCardId === 'running') {
			const display = Number(actual);
			if (!(display > 0)) return null;
			return { quantityBaseValue: Math.round(display * habit.basePerDisplayUnit) };
		}
		if (habit.officialCardId === 'water') {
			const cups = Number(actual);
			if (!(cups > 0)) return null;
			return {
				quantityBaseValue: Math.round(cups * habit.basePerDisplayUnit),
				details: {
					kind: 'water',
					cupSizeMl: positiveOrUndefined(cupSize),
					morningCups: numberOrUndefined(morningCups),
					afternoonCups: numberOrUndefined(afternoonCups),
					eveningCups: numberOrUndefined(eveningCups),
					beverageType,
				},
			};
		}
		if (habit.officialCardId === 'reading-time') {
			const minutes = positiveOrUndefined(duration);
			if (!minutes) return null;
			const start = numberOrUndefined(startPage);
			const end = numberOrUndefined(endPage);
			if (start !== undefined && end !== undefined && end < start) return null;
			return {
				quantityBaseValue: minutes * habit.basePerDisplayUnit,
				details: {
					kind: 'reading',
					bookTitle: bookTitle.trim() || undefined,
					durationMinutes: minutes,
					startPage: start,
					endPage: end,
					chapter: chapter.trim() || undefined,
					reflection: reflection.trim() || undefined,
				},
			};
		}
		if (habit.officialCardId === 'light-food') {
			if (checkedRules.length === 0) return null;
			return { quantityBaseValue: checkedRules.length, details: { kind: 'light-food', checkedRuleIds: checkedRules } };
		}
		if (habit.officialCardId === 'sleep') {
			return {
				quantityBaseValue: 1,
				details: {
					kind: 'sleep',
					onTime,
					bedtime: bedtime || undefined,
					wakeTime: wakeTime || undefined,
					durationMinutes: minutesBetween(bedtime, wakeTime),
					quality,
					wakeFeeling,
				},
			};
		}
		return {
			quantityBaseValue: 1,
			details: {
				kind: 'screen-free',
				screenMinutes: numberOrUndefined(screenMinutes),
				shortVideoMinutes: numberOrUndefined(shortVideoMinutes),
				socialMinutes: numberOrUndefined(socialMinutes),
				newsMinutes: numberOrUndefined(newsMinutes),
				otherMinutes: numberOrUndefined(otherMinutes),
				screenFreeMoments,
			},
		};
	}

	async function submit(event: FormEvent) {
		event.preventDefault();
		const entry = buildEntry();
		if (!habit || !entry) {
			setError(true);
			return;
		}
		const parsedPace = pace ? paceSeconds(pace) : undefined;
		if (pace && !parsedPace) {
			setError(true);
			return;
		}
		setSaving(true);
		setError(false);
		try {
			await saveDailyHabitInApp({
				userCardId: habit.id,
				localDate,
				currentLocalDate: formatLocalDate(new Date()),
				quantityBaseValue: entry.quantityBaseValue,
				entryMethod: 'actual',
				plannedQuantityBaseValue: habit.dailyTargetBase,
				carryInBaseValue: habit.carryInBaseValue,
				durationSeconds: positiveOrUndefined(duration) ? positiveOrUndefined(duration)! * 60 : undefined,
				averagePaceSecondsPerKm: parsedPace,
				averageHeartRateBpm: positiveOrUndefined(heartRate),
				note: note.trim() || undefined,
				details: entry.details,
				nowIso: new Date().toISOString(),
				submissionId: crypto.randomUUID(),
			});
			navigate(APP_ROUTES.HOME, { replace: true });
		} catch {
			setError(true);
		} finally {
			setSaving(false);
		}
	}

	if (loading) return <p className={styles.state}>{t('shell.record.loading')}</p>;
	if (!habit) return <p className={styles.state}>{t('shell.record.notFound')}</p>;

	const rules = habit.habitConfig?.kind === 'light-food' ? habit.habitConfig.rules : [];
	const sleepDuration = minutesBetween(bedtime, wakeTime);
	const planDistance = plannedRunningDistance(habit);
	const reusableTrainingDetails = previousTrainingDetails(habit);
	const isRunning = habit.officialCardId === 'running';
	const isExpense = habit.officialCardId === 'extra-expense';
	const expenseEntries = isExpense ? normalizeExpenseEntries(habit.details, {
		fallbackId: `legacy-${localDate}`,
		fallbackAmountCents: habit.quantityBaseValue,
		fallbackTimestamp: habit.recordSavedAt ?? new Date().toISOString(),
	}) : [];
	const completionLocked = habit.entryMethod === 'completed';

	function expenseRoute(entry?: string): string {
		const base = APP_ROUTES.habitRecord(userCardId, localDate);
		return entry ? `${base}&entry=${encodeURIComponent(entry)}` : base;
	}

	async function saveExpense(event: FormEvent) {
		event.preventDefault();
		if (!habit || !expenseEntryId) return;
		const existing = expenseEntries.find(({ id }) => id === expenseEntryId);
		const nowIso = new Date().toISOString();
		const line = buildExpenseLineItem({
			amount: actual, item: expenseItem, reason: expenseReason, bankBalance,
			earnBackDays, compensation, necessity, occurredTime,
		}, { id: existing?.id ?? crypto.randomUUID(), nowIso, createdAt: existing?.createdAt });
		if (!line) { setError(true); return; }
		const aggregate = mergeExpenseLineItem(habit.details, line, {
			fallbackId: `legacy-${localDate}`,
			fallbackAmountCents: habit.quantityBaseValue,
			fallbackTimestamp: habit.recordSavedAt ?? nowIso,
		});
		setSaving(true);
		setError(false);
		try {
			const currentLocalDate = formatLocalDate(new Date());
			await saveDailyHabitInApp({
				userCardId: habit.id, localDate, currentLocalDate,
				recordingContext: localDate < currentLocalDate
					? (habit.recordedToday ? 'correction' : 'backfill')
					: 'today',
				quantityBaseValue: aggregate.quantityBaseValue, entryMethod: 'actual',
				details: aggregate.details,
				nowIso, submissionId: crypto.randomUUID(),
			});
			navigate(expenseRoute(), { replace: true });
		} catch { setError(true); } finally { setSaving(false); }
	}

	async function deleteExpenseEntry(id: string) {
		if (!window.confirm(t('shell.record.expense.deleteConfirm'))) return;
		const nowIso = new Date().toISOString();
		const aggregate = removeExpenseLineItem(habit!.details, id, {
			fallbackId: `legacy-${localDate}`,
			fallbackAmountCents: habit!.quantityBaseValue,
			fallbackTimestamp: habit!.recordSavedAt ?? nowIso,
		});
		setSaving(true);
		try {
			const currentLocalDate = formatLocalDate(new Date());
			await saveDailyHabitInApp({
				userCardId: habit!.id, localDate, currentLocalDate,
				recordingContext: localDate < currentLocalDate ? 'correction' : 'today',
				quantityBaseValue: aggregate.quantityBaseValue, entryMethod: 'actual',
				details: aggregate.quantityBaseValue ? aggregate.details : undefined,
				nowIso, submissionId: crypto.randomUUID(),
			});
			navigate(expenseRoute(), { replace: true });
		} catch { setError(true); } finally { setSaving(false); }
	}

	if (isExpense && !expenseEntryId) {
		const todayValue = expenseEntries.reduce((total, entry) => total + entry.amountCents, 0) / 100;
		const monthValue = (habit.monthQuantityBaseValue ?? 0) / habit.basePerDisplayUnit;
		return <main className={`${styles.page} ${styles.expensePage} ${styles.expenseSummaryPage}`}>
			<header className={`${styles.header} ${styles.expenseHeader}`}>
				<button type='button' onClick={() => navigate(-1)} aria-label={t('shell.createCard.back')}><PiArrowLeft /></button>
				<div><small>{localDate}</small><h1>{t('shell.record.expense.summaryTitle')}</h1></div>
				<button type='button' onClick={() => navigate(APP_ROUTES.HOME)} aria-label={t('shell.createCard.close')}><PiX /></button>
			</header>
			<section className={styles.expenseSummary}>
				<div><small>{t('shell.record.expense.todayTotal')}</small><strong>¥{todayValue.toFixed(2)}</strong><span>{t('shell.record.expense.entryCount', { count: expenseEntries.length })}</span></div>
				<div><small>{t('shell.record.expense.monthTotal')}</small><strong>¥{monthValue.toFixed(2)}</strong></div>
			</section>
			<section className={styles.expenseEntryList}>
				{expenseEntries.length === 0 ? <p>{t('shell.record.expense.empty')}</p> : expenseEntries.map((entry) => <button type='button' key={entry.id} onClick={() => navigate(expenseRoute(entry.id))}>
					<span><strong>{entry.item}</strong><small>{entry.occurredTime} · {t(`shell.record.expense.necessityOptions.${entry.necessity}`)}</small></span>
					<b>¥{(entry.amountCents / 100).toFixed(2)}</b><PiPencilSimple />
				</button>)}
			</section>
			<button className={`${styles.save} ${styles.expenseSave}`} type='button' onClick={() => navigate(expenseRoute('new'))}><PiPlus />{t('shell.record.expense.addEntry')}</button>
		</main>;
	}
	const kindLabel = t(habit.officialCardId === 'water'
		? 'shell.record.kinds.water'
		: habit.officialCardId === 'light-food'
			? 'shell.record.kinds.light-food'
			: habit.officialCardId === 'reading-time'
				? 'shell.record.kinds.reading-time'
				: habit.officialCardId === 'sleep'
					? 'shell.record.kinds.sleep'
					: habit.officialCardId === 'screen-free'
						? 'shell.record.kinds.screen-free'
						: habit.officialCardId === 'extra-expense'
							? 'shell.record.kinds.extra-expense'
							: 'shell.record.kinds.running');

	return (
		<main className={`${styles.page} ${isRunning ? styles.runningPage : ''} ${isExpense ? styles.expensePage : ''}`}>
			<header className={`${styles.header} ${isRunning ? styles.runningHeader : ''} ${isExpense ? styles.expenseHeader : ''}`}>
				{!isRunning && <button type='button' onClick={() => navigate(-1)} aria-label={t('shell.createCard.back')}><PiArrowLeft aria-hidden='true' /></button>}
				<div>
					<small>{isRunning
						? localDateLabel(localDate, i18n.resolvedLanguage ?? i18n.language)
						: localDate}</small>
					<h1>{isRunning ? t('shell.record.running.title') : isExpense ? t(expenseEntryId === 'new' ? 'shell.record.expense.title' : 'shell.record.expense.editTitle') : habit.title}</h1>
				</div>
				<button type='button' onClick={() => navigate(APP_ROUTES.HOME)} aria-label={t('shell.createCard.close')}><PiX aria-hidden='true' /></button>
			</header>
			<form className={`${styles.form} ${isRunning ? styles.runningForm : ''} ${isExpense ? styles.expenseForm : ''}`} onSubmit={isExpense ? saveExpense : submit}>
				{!isRunning && !isExpense && <section className={styles.hero}>
					<HabitGlyph iconKey={habit.iconKey} accent={habit.accent} label={habit.title} decorative size='lg' />
					<div><small>{kindLabel}</small><strong>{habit.title}</strong><span>{t('shell.record.target', { value: habit.dailyTargetBase / habit.basePerDisplayUnit, unit: habit.displayUnit })}</span></div>
				</section>}

				{habit.officialCardId === 'running' && renderRunningFields()}
				{habit.officialCardId === 'water' && renderWaterFields()}
				{habit.officialCardId === 'reading-time' && renderReadingFields()}
				{habit.officialCardId === 'light-food' && (
					<section className={styles.block}>
						<BlockTitle icon={PiLeaf} title={t('shell.record.food.title')} hint={t('shell.record.food.hint', { done: checkedRules.length, total: rules.length })} />
						<div className={`${styles.checkList} ${styles.foodCheckList}`}>
							{rules.map((rule) => {
								const RuleIcon = FOOD_RULE_ICONS[rule.id] ?? PiLeaf;
								return (
									<label key={rule.id}>
										<RuleIcon aria-hidden='true' />
										<span>{rule.label}</span>
										<input type='checkbox' checked={checkedRules.includes(rule.id)} onChange={() => setCheckedRules((current) => current.includes(rule.id) ? current.filter((id) => id !== rule.id) : [...current, rule.id])} />
										<i className={styles.checkState} aria-hidden='true'><PiCheck /></i>
									</label>
								);
							})}
						</div>
					</section>
				)}
				{habit.officialCardId === 'sleep' && renderSleepFields()}
				{habit.officialCardId === 'screen-free' && renderScreenFields()}
				{habit.officialCardId === 'extra-expense' && renderExpenseFields()}

				{!isExpense && <label className={styles.note}>
					<PiNotePencil aria-hidden='true' />
					<textarea maxLength={280} value={note} onChange={(event) => setNote(event.target.value)} placeholder={t('shell.record.note')} />
				</label>}
				{isRunning && completionLocked && (
					<p className={styles.completionLock}>
						<PiShieldCheck aria-hidden='true' />
						{t('shell.record.running.completionLocked')}
					</p>
				)}
				{error && <p className={styles.error} role='alert'>{t('shell.record.invalid')}</p>}
				<button className={`${styles.save} ${isRunning ? styles.runningSave : ''} ${isExpense ? styles.expenseSave : ''}`} type='submit' disabled={saving}><PiCheck aria-hidden='true' />{t(isExpense ? 'shell.record.expense.save' : 'shell.record.save')}</button>
				{isExpense && expenseEntryId !== 'new' && <button className={styles.expenseDelete} type='button' disabled={saving} onClick={() => void deleteExpenseEntry(expenseEntryId!)}>{t('shell.record.expense.delete')}</button>}
			</form>
		</main>
	);

	function selectRunningDistance(value: string, source: RunningRecordValueSource) {
		setActual(value);
		setRunningValueSource(source);
	}

	function reusePreviousRecord() {
		if (habit?.previousRecord) {
			selectRunningDistance(habit.previousRecord.displayValue, 'previous');
		}
		setDuration(reusableTrainingDetails.duration);
		setPace(reusableTrainingDetails.pace);
		setHeartRate(reusableTrainingDetails.heartRate);
	}

	function adjustRunningDistance(direction: -1 | 1) {
		const current = Number(actual) || 0;
		const step = habit!.stepBase / habit!.basePerDisplayUnit;
		setActual(String(Math.max(0, current + direction * step)));
		setRunningValueSource('blank');
	}

	function renderRunningFields() {
		const sourceLabel = runningValueSource === 'previous'
			? t('shell.record.running.previousSource')
			: runningValueSource === 'plan'
				? t('shell.record.running.planSource')
				: runningValueSource === 'current'
					? t('shell.record.running.currentSource')
					: t('shell.record.running.customSource');

		return <section className={`${styles.block} ${styles.runningBlock}`}>
			<header className={styles.runValueHeader}>
				<div>
					<strong>{habit!.title}</strong>
					<small>{t('shell.record.target', { value: planDistance, unit: habit!.displayUnit })}</small>
				</div>
				{completionLocked && (
					<span className={styles.completedStatus}>
						<PiCheck aria-hidden='true' />
						{t('shell.record.running.completedStatus')}
					</span>
				)}
			</header>
			<label className={styles.distanceEditor}>
				<span>{sourceLabel}</span>
				<div>
					<input type='number' inputMode='decimal' min='0' step='any' value={actual} onChange={(event) => { setActual(event.target.value); setRunningValueSource('blank'); }} />
					<strong>{habit!.displayUnit}</strong>
					<span className={styles.distanceActions}>
						<button type='button' aria-label={t('shell.today.decreaseHabit', { title: habit!.title })} onClick={() => adjustRunningDistance(-1)}><PiMinus aria-hidden='true' /></button>
						<button type='button' aria-label={t('shell.today.increaseHabit', { title: habit!.title })} onClick={() => adjustRunningDistance(1)}><PiPlus aria-hidden='true' /></button>
					</span>
				</div>
			</label>
			{habit!.previousRecord && (
				<button className={styles.previousDistance} type='button' onClick={reusePreviousRecord}>
					<span>{t('shell.record.running.previousDistance', { value: habit!.previousRecord!.displayValue, unit: habit!.displayUnit })}</span>
					<strong>{t('shell.record.running.reuseDistance')}</strong>
				</button>
			)}
			<div className={styles.runningDetails}>
				<div className={styles.grid}>
					<Field label={t('shell.record.running.duration')} value={duration} onChange={setDuration} unit={t('shell.record.units.minutes')} icon={<PiTimer />} />
					<SegmentedPaceInput
						className={styles.paceField}
						label={t('shell.record.running.pace')}
						value={pace}
						onChange={setPace}
						invalid={error && Boolean(pace) && paceSeconds(pace) === undefined}
						icon={<PiGauge />}
					/>
					<Field label={t('shell.record.running.heartRate')} value={heartRate} onChange={setHeartRate} unit='bpm' icon={<PiHeartbeat />} />
				</div>
			</div>
		</section>;
	}

	function renderWaterFields() {
		return <section className={styles.block}>
			<BlockTitle icon={PiDrop} title={t('shell.record.water.title')} hint={t('shell.record.optionalHint')} />
			<div className={styles.grid}>
				<Field label={t('shell.record.water.cups')} value={actual} onChange={setActual} unit={habit!.displayUnit} />
				<Field label={t('shell.record.water.cupSize')} value={cupSize} onChange={setCupSize} unit='ml' />
				<Field label={t('shell.record.water.morning')} value={morningCups} onChange={setMorningCups} />
				<Field label={t('shell.record.water.afternoon')} value={afternoonCups} onChange={setAfternoonCups} />
				<Field label={t('shell.record.water.evening')} value={eveningCups} onChange={setEveningCups} />
			</div>
			<div className={styles.chips}>{(['water', 'tea', 'coffee', 'other'] as const).map((type) => <button type='button' key={type} aria-pressed={beverageType === type} onClick={() => setBeverageType(type)}>{t(`shell.record.water.types.${type}`)}</button>)}</div>
		</section>;
	}

	function renderReadingFields() {
		return <section className={styles.block}>
			<BlockTitle icon={PiBookOpenText} title={t('shell.record.reading.title')} hint={t('shell.record.optionalHint')} />
			<label className={styles.wideField}><span>{t('shell.record.reading.book')}</span><input value={bookTitle} onChange={(event) => setBookTitle(event.target.value)} /></label>
			<div className={styles.grid}>
				<Field label={t('shell.record.reading.duration')} value={duration} onChange={setDuration} unit={t('shell.record.units.minutes')} />
				<Field label={t('shell.record.reading.startPage')} value={startPage} onChange={setStartPage} />
				<Field label={t('shell.record.reading.endPage')} value={endPage} onChange={setEndPage} />
				<Field label={t('shell.record.reading.chapter')} value={chapter} onChange={setChapter} inputType='text' />
			</div>
			<label className={styles.wideField}><span>{t('shell.record.reading.reflection')}</span><textarea value={reflection} onChange={(event) => setReflection(event.target.value)} /></label>
		</section>;
	}

	function renderSleepFields() {
		return <section className={styles.block}>
			<BlockTitle icon={PiMoonStars} title={t('shell.record.sleep.title')} hint={sleepDuration ? t('shell.record.sleep.durationResult', { hours: (sleepDuration / 60).toFixed(1) }) : t('shell.record.optionalHint')} />
			<label className={styles.toggle}><span>{t('shell.record.sleep.onTime')}</span><input type='checkbox' checked={onTime} onChange={(event) => setOnTime(event.target.checked)} /></label>
			<div className={styles.grid}>
				<label className={styles.wideField}><span>{t('shell.record.sleep.bedtime')}</span><input type='time' value={bedtime} onChange={(event) => setBedtime(event.target.value)} /></label>
				<label className={styles.wideField}><span>{t('shell.record.sleep.wakeTime')}</span><input type='time' value={wakeTime} onChange={(event) => setWakeTime(event.target.value)} /></label>
			</div>
			<div className={styles.chips}>{([1, 2, 3, 4, 5] as const).map((value) => <button type='button' key={value} aria-pressed={quality === value} onClick={() => setQuality(value)}>{value}</button>)}</div>
			<div className={styles.chips}>{(['tired', 'normal', 'refreshed'] as const).map((value) => <button type='button' key={value} aria-pressed={wakeFeeling === value} onClick={() => setWakeFeeling(value)}>{t(`shell.record.sleep.feelings.${value}`)}</button>)}</div>
		</section>;
	}

	function renderScreenFields() {
		return <section className={styles.block}>
			<BlockTitle icon={PiShieldCheck} title={t('shell.record.screen.title')} hint={t('shell.record.optionalHint')} />
			<Field label={t('shell.record.screen.total')} value={screenMinutes} onChange={setScreenMinutes} unit={t('shell.record.units.minutes')} />
			<div className={styles.grid}>
				<Field label={t('shell.record.screen.shortVideo')} value={shortVideoMinutes} onChange={setShortVideoMinutes} />
				<Field label={t('shell.record.screen.social')} value={socialMinutes} onChange={setSocialMinutes} />
				<Field label={t('shell.record.screen.news')} value={newsMinutes} onChange={setNewsMinutes} />
				<Field label={t('shell.record.screen.other')} value={otherMinutes} onChange={setOtherMinutes} />
			</div>
			<div className={styles.checkList}>{SCREEN_MOMENTS.map((moment) => <label key={moment}><PiShieldCheck aria-hidden='true' /><span>{t(`shell.record.screen.moments.${moment}`)}</span><input type='checkbox' checked={screenFreeMoments.includes(moment)} onChange={() => setScreenFreeMoments((current) => current.includes(moment) ? current.filter((item) => item !== moment) : [...current, moment])} /></label>)}</div>
		</section>;
	}

	function renderExpenseFields() {
		const monthValue = (habit!.monthQuantityBaseValue ?? 0) / habit!.basePerDisplayUnit;
		const todayValue = habit!.quantityBaseValue / habit!.basePerDisplayUnit;

		return <>
			<section className={styles.expenseIntro}>
				<PiReceipt aria-hidden='true' />
				<div><strong>{t('shell.record.expense.prompt')}</strong><small>{t('shell.record.expense.hint')}</small></div>
			</section>
			<section className={styles.expenseSummary}>
				<div><small>{t('shell.record.expense.monthTotal')}</small><strong>¥{monthValue.toFixed(2)}</strong></div>
				<div><small>{t('shell.record.expense.todayTotal')}</small><strong>¥{todayValue.toFixed(2)}</strong></div>
			</section>
			<section className={`${styles.block} ${styles.expenseBlock}`}>
				<label className={styles.expenseAmount}>
					<span>¥</span>
					<input type='number' inputMode='decimal' min='0.01' step='0.01' value={actual} onChange={(event) => setActual(event.target.value)} placeholder='0.00' autoFocus />
				</label>
				<label className={styles.expenseTextField}><PiTimer aria-hidden='true' /><span>{t('shell.record.expense.time')}</span><input type='time' value={occurredTime} onChange={(event) => setOccurredTime(event.target.value)} /></label>
				<label className={styles.expenseTextField}><PiShoppingBag aria-hidden='true' /><span>{t('shell.record.expense.item')}</span><input value={expenseItem} maxLength={80} onChange={(event) => setExpenseItem(event.target.value)} /></label>
				<label className={styles.expenseTextField}><PiReceipt aria-hidden='true' /><span>{t('shell.record.expense.reason')}</span><textarea value={expenseReason} maxLength={280} onChange={(event) => setExpenseReason(event.target.value)} /></label>
				<div className={styles.grid}>
					<Field label={t('shell.record.expense.bankBalance')} value={bankBalance} onChange={setBankBalance} unit={t('shell.record.expense.yuan')} icon={<PiWallet />} />
					<Field label={t('shell.record.expense.earnBackDays')} value={earnBackDays} onChange={setEarnBackDays} unit={t('shell.record.expense.days')} />
				</div>
				<label className={styles.expenseTextField}><PiWallet aria-hidden='true' /><span>{t('shell.record.expense.compensation')}</span><textarea value={compensation} maxLength={280} onChange={(event) => setCompensation(event.target.value)} /></label>
				<fieldset className={styles.necessity}>
					<legend>{t('shell.record.expense.necessity')}</legend>
					{(['necessary', 'delayable', 'impulse'] as const).map((value) => <button key={value} type='button' aria-pressed={necessity === value} onClick={() => setNecessity(value)}>{necessity === value && <PiCheck aria-hidden='true' />}{t(`shell.record.expense.necessityOptions.${value}`)}</button>)}
				</fieldset>
			</section>
		</>;
	}
}

export { HabitRecordPage };
