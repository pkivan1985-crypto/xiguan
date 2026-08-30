/* eslint-disable i18next/no-literal-string -- Entry methods are stable domain identifiers. */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
	PiArrowClockwise,
	PiGearSix,
	PiListChecks,
	PiPlus,
	PiTrash,
	PiWarning,
	PiWarningCircle,
} from 'react-icons/pi';
import { Link, useNavigate } from 'react-router';

import { loadDailyHabitsInApp, type DailyHabitView, type DailyHabitsModel } from '@features/load-daily-habits';
import { deleteUserCardInApp } from '@features/manage-user-card';
import { saveDailyHabitInApp } from '@features/save-daily-habit';
import { APP_ROUTES } from '@shared/config';
import { formatLocalDate } from '@shared/lib/date';
import { MobilePageHeader } from '@widgets/mobile-page-header';
import {
	type HabitActualEntry,
	TodayHabitPanel,
	toggleCompletedVisibility,
} from '@widgets/today-habit-panel';
import { WeekStrip } from '@widgets/week-strip';

import { createTodaySaveQueue } from '../model/todayPage';
import styles from './TodayPage.module.css';

interface TodayPageContentProps {
	model: DailyHabitsModel;
	todayLocalDate: string;
	completedExpanded: boolean;
	pendingIds: ReadonlySet<string>;
	saveErrorIds: ReadonlySet<string>;
	onChangeHabit: (habit: DailyHabitView, quantityBaseValue: number) => void;
	onCompleteHabit: (habit: DailyHabitView) => void;
	onDeleteHabit: (habit: DailyHabitView) => Promise<void>;
	onSaveActual: (habit: DailyHabitView, entry: HabitActualEntry) => void;
	onOpenDetails?: (habit: DailyHabitView) => void;
	onSelectDate: (localDate: string) => void;
	onToggleCompleted: () => void;
}

function localDateLabel(localDate: string, locale: string): string {
	const [year, month, day] = localDate.split('-').map(Number);
	const date = new Date(year!, month! - 1, day!, 12);
	const datePart = new Intl.DateTimeFormat(locale, {
		month: 'long',
		day: 'numeric',
	}).format(date);
	const weekdayPart = new Intl.DateTimeFormat(locale, {
		weekday: 'short',
	}).format(date);
	return `${datePart} ${weekdayPart}`;
}

function TodayPageContent({
	model,
	todayLocalDate,
	completedExpanded,
	pendingIds,
	saveErrorIds,
	onChangeHabit,
	onCompleteHabit,
	onDeleteHabit,
	onSaveActual,
	onOpenDetails,
	onSelectDate,
	onToggleCompleted,
}: TodayPageContentProps) {
	const { t, i18n } = useTranslation();
	const [deleteTarget, setDeleteTarget] = useState<DailyHabitView | null>(null);
	const [deletePending, setDeletePending] = useState(false);
	const [deleteError, setDeleteError] = useState(false);
	const completedRatio = model.scheduledCount === 0
		? 0
		: model.completedCount / model.scheduledCount;

	return (
		<div className={styles.page}>
			<MobilePageHeader
				title={t('shell.nav.today')}
				description={localDateLabel(
					todayLocalDate,
					i18n.resolvedLanguage ?? i18n.language,
				)}
				settingsAction={(
					<Link
						className={styles.settingsAction}
						to={APP_ROUTES.SETTINGS}
						aria-label={t('shell.actions.openSettings')}
					>
						<PiGearSix aria-hidden='true' />
					</Link>
				)}
			/>
			<div className={styles.weekRail}>
				<WeekStrip
					selectedLocalDate={todayLocalDate}
					todayLocalDate={todayLocalDate}
					outcomeDates={model.outcomeDates}
					expenseDates={model.expenseDates ?? []}
					onSelect={onSelectDate}
				/>
			</div>
			<section className={styles.overview} aria-label={t('shell.today.overviewLabel')}>
				<strong>
					{t('shell.today.overviewProgressValue', {
						completed: model.completedCount,
						total: model.scheduledCount,
					})}
				</strong>
				<span
					className={styles.overviewProgress}
					role='progressbar'
					aria-label={t('shell.today.overviewProgressLabel')}
					aria-valuemin={0}
					aria-valuemax={Math.max(model.scheduledCount, 1)}
					aria-valuenow={model.completedCount}
					aria-valuetext={t('shell.today.overviewProgressValue', {
						completed: model.completedCount,
						total: model.scheduledCount,
					})}
				>
					<i style={{ width: `${completedRatio * 100}%` }} />
				</span>
				<small className={styles.visuallyHidden}>{t('shell.today.autoSaveLocal')}</small>
			</section>
			<div className={styles.panelSlot}>
				<TodayHabitPanel
					habits={model.habits}
					completedExpanded={completedExpanded}
					pendingIds={pendingIds}
					saveErrorIds={saveErrorIds}
					onChange={onChangeHabit}
					onComplete={onCompleteHabit}
					onSaveActual={onSaveActual}
					onOpenDetails={onOpenDetails}
					onRequestDelete={(habit) => {
						setDeleteError(false);
						setDeleteTarget(habit);
					}}
					onToggleCompleted={onToggleCompleted}
				/>
			</div>
			<nav className={styles.primaryActions} aria-label={t('shell.today.primaryActions')}>
				<Link to={`${APP_ROUTES.PROGRESS}?date=${todayLocalDate}`}>
					<PiListChecks aria-hidden='true' />
					<span>{t('shell.today.viewTodaySummary')}</span>
				</Link>
				<i aria-hidden='true' />
				<Link to={APP_ROUTES.DECK_NEW}>
					<PiPlus aria-hidden='true' />
					<span>{t('shell.today.createHabit')}</span>
				</Link>
			</nav>
			{deleteTarget && (
				<div className={styles.dialogBackdrop}>
					<section
						className={styles.deleteDialog}
						role='alertdialog'
						aria-modal='true'
						aria-labelledby='today-delete-habit-title'
						aria-describedby='today-delete-habit-description'
					>
						<span className={styles.warningIcon}><PiWarning aria-hidden='true' /></span>
						<h2 id='today-delete-habit-title'>
							{t('shell.deck.deleteTitle', { title: deleteTarget.title })}
						</h2>
						<p id='today-delete-habit-description'>{t('shell.deck.deleteDescription')}</p>
						{deleteError && (
							<p className={styles.deleteError} role='alert'>
								{t('shell.today.deleteError')}
							</p>
						)}
						<span className={styles.dialogActions}>
							<button
								type='button'
								autoFocus
								disabled={deletePending}
								onClick={() => setDeleteTarget(null)}
							>
								{t('common.cancel')}
							</button>
							<button
								className={styles.confirmDelete}
								type='button'
								disabled={deletePending}
								onClick={() => {
									setDeletePending(true);
									setDeleteError(false);
									void onDeleteHabit(deleteTarget)
										.then(() => setDeleteTarget(null))
										.catch(() => setDeleteError(true))
										.finally(() => setDeletePending(false));
								}}
							>
								<PiTrash aria-hidden='true' />
								{t(deletePending
									? 'shell.today.deletingHabit'
									: 'habits.actions.delete')}
							</button>
						</span>
					</section>
				</div>
			)}
		</div>
	);
}

function TodayPage() {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const todayLocalDate = useMemo(() => formatLocalDate(new Date()), []);
	const [model, setModel] = useState<DailyHabitsModel | null>(null);
	const [loadError, setLoadError] = useState(false);
	const [pendingIds, setPendingIds] = useState<ReadonlySet<string>>(new Set());
	const [saveErrorIds, setSaveErrorIds] = useState<ReadonlySet<string>>(new Set());
	const saveQueueRef = useRef<ReturnType<typeof createTodaySaveQueue> | null>(null);
	if (saveQueueRef.current === null) {
		saveQueueRef.current = createTodaySaveQueue((state) => {
			setPendingIds(state.pendingIds);
			setSaveErrorIds(state.saveErrorIds);
		});
	}
	const [completedExpanded, setCompletedExpanded] = useState(true);
	const [reloadNonce, setReloadNonce] = useState(0);

	const load = useCallback(() => loadDailyHabitsInApp(todayLocalDate), [todayLocalDate]);
	useEffect(() => {
		let active = true;
		void load()
			.then((next) => {
				if (active) {
					setModel(next);
					setLoadError(false);
				}
			})
			.catch(() => { if (active) setLoadError(true); });
		return () => { active = false; };
	}, [load, reloadNonce]);

	async function changeHabit(
		habit: DailyHabitView,
		quantityBaseValue: number,
		details?: HabitActualEntry & {
			entryMethod: 'completed' | 'actual';
			recordDetails?: DailyHabitView['details'];
		},
	): Promise<void> {
		if (!habit.scheduledToday) return;
		const queuedSave = saveQueueRef.current!.enqueue(habit.id, async () => {
			await saveDailyHabitInApp({
				userCardId: habit.id,
				localDate: todayLocalDate,
				currentLocalDate: formatLocalDate(new Date()),
				quantityBaseValue,
				entryMethod: details?.entryMethod,
				plannedQuantityBaseValue: habit.dailyTargetBase,
				carryInBaseValue: habit.carryInBaseValue,
				durationSeconds: details?.durationSeconds,
				averagePaceSecondsPerKm: details?.averagePaceSecondsPerKm,
				averageHeartRateBpm: details?.averageHeartRateBpm,
				note: details?.note,
				details: details?.recordDetails,
				nowIso: new Date().toISOString(),
				submissionId: crypto.randomUUID(),
			});
			return load();
		});
		if (!queuedSave) return;

		try {
			setModel(await queuedSave);
		} catch {
			// The queue owns row-level error state and continues with the next row.
		}
	}

	if (loadError) {
		return (
			<section className={styles.state}>
				<PiWarningCircle aria-hidden='true' />
				<p>{t('shell.today.loadError')}</p>
				<button
					type='button'
					onClick={() => {
						setModel(null);
						setLoadError(false);
						setReloadNonce((value) => value + 1);
					}}
				>
					<PiArrowClockwise aria-hidden='true' />
					{t('shell.today.retry')}
				</button>
			</section>
		);
	}
	if (!model) return <p className={styles.loading}>{t('shell.today.loading')}</p>;

	return (
		<TodayPageContent
			model={model}
			todayLocalDate={todayLocalDate}
			completedExpanded={completedExpanded}
			pendingIds={pendingIds}
			saveErrorIds={saveErrorIds}
			onChangeHabit={(habit, quantityBaseValue) => {
				void changeHabit(habit, quantityBaseValue);
			}}
			onCompleteHabit={(habit) => {
				void changeHabit(habit, habit.dailyTargetBase, {
					quantityBaseValue: habit.dailyTargetBase,
					entryMethod: 'completed',
					durationSeconds: habit.durationSeconds,
					averagePaceSecondsPerKm: habit.averagePaceSecondsPerKm,
					averageHeartRateBpm: habit.averageHeartRateBpm,
					note: habit.note,
					recordDetails: habit.details,
				});
			}}
			onDeleteHabit={async (habit) => {
				await deleteUserCardInApp(habit.id);
				setModel(await load());
			}}
			onSaveActual={(habit, entry) => {
				void changeHabit(habit, entry.quantityBaseValue, {
					...entry,
					entryMethod: 'actual',
				});
			}}
			onOpenDetails={(habit) => {
				navigate(APP_ROUTES.habitRecord(habit.id, todayLocalDate));
			}}
			onSelectDate={(localDate) => {
				if (localDate !== todayLocalDate) {
					navigate(`${APP_ROUTES.PROGRESS}?date=${localDate}`);
				}
			}}
			onToggleCompleted={() => {
				setCompletedExpanded(toggleCompletedVisibility);
			}}
		/>
	);
}

export { TodayPage, TodayPageContent };
