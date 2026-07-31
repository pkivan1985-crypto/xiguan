/* eslint-disable i18next/no-literal-string -- Tab, query and element identifiers are stable non-UI strings. */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
	PiArrowClockwise,
	PiCalendarBlank,
	PiCalendarPlus,
	PiCaretRight,
	PiChartBar,
	PiEye,
	PiGearSix,
	PiPencilSimple,
	PiTarget,
	PiX,
} from 'react-icons/pi';
import { Link, useSearchParams } from 'react-router';

import {
	buildHistoryDateHref,
	buildProgressDateSearch,
	buildProgressTabModel,
	canonicalProgressDateSearch,
	moveProgressMonth,
	progressMonthFromDate,
	validSelectedDate,
	type ProgressTab,
} from '../model/progressPageState';
import { parseQuantityToBase } from '@entities/card-template';
import { correctActionRecordInApp } from '@features/correct-action-record';
import {
	loadHistoryInApp,
	type HistoryModel,
	type HistoryRecordModel,
} from '@features/load-history';
import {
	loadDailyHabitsInApp,
	type DailyHabitView,
	type DailyHabitsModel,
} from '@features/load-daily-habits';
import {
	loadHomeDashboardInApp,
	type HomeDashboardModel,
} from '@features/load-home-dashboard';
import { saveDailyHabitInApp } from '@features/save-daily-habit';
import { APP_ROUTES } from '@shared/config';
import { formatLocalDate } from '@shared/lib/date';
import { GoalSummary } from '@widgets/goal-summary';
import { HabitGlyph } from '@widgets/habit-glyph';
import {
	ActionRecordEditor,
	type ActionRecordEditValue,
} from '@widgets/action-record-editor';
import { MobilePageHeader } from '@widgets/mobile-page-header';
import { OutcomeCalendar } from '@widgets/outcome-calendar';
import {
	type HabitActualEntry,
	TodayHabitPanel,
} from '@widgets/today-habit-panel';

import styles from './ProgressPage.module.css';

interface ProgressPageContentProps {
	activeTab: ProgressTab;
	dashboard: HomeDashboardModel;
	history: HistoryModel;
	selectedDate: string;
	todayLocalDate: string;
	canGoNext: boolean;
	onChangeTab: (tab: ProgressTab) => void;
	onNextMonth: () => void;
	onPreviousMonth: () => void;
	onSelectDate: (localDate: string) => void;
	backfillAvailable?: boolean;
	onOpenBackfill?: () => void;
	onEditRecord?: (recordId: string) => void;
}

function shortDateLabel(localDate: string, locale: string): string {
	const [year, month, day] = localDate.split('-').map(Number);
	return new Intl.DateTimeFormat(locale, {
		month: 'long',
		day: 'numeric',
	}).format(new Date(year!, month! - 1, day!, 12));
}

function recordBaseValue(value: number, basePerDisplayUnit: number): string {
	return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 })
		.format(value / basePerDisplayUnit);
}

function paceValue(seconds: number): string {
	const minutes = Math.floor(seconds / 60);
	return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
}

function correctionErrorKey(error: unknown):
	| 'shell.history.dateChanged'
	| 'shell.history.invalidValue'
	| 'shell.history.saveError'
	| 'shell.today.actualEntryInvalid' {
	if (!(error instanceof Error)) return 'shell.history.saveError';
	if (
		error.message === 'ACTION_RECORD_NOT_TODAY'
		|| error.message === 'ACTION_RECORD_DATE_MISMATCH'
		|| error.message === 'ACTION_RECORD_IN_FUTURE'
	) return 'shell.history.dateChanged';
	if (
		error.message === 'INVALID_QUANTITY'
		|| error.message === 'QUANTITY_CONFIRMATION_REQUIRED'
	) return 'shell.history.invalidValue';
	if (
		error.message === 'INVALID_DURATION'
		|| error.message === 'INVALID_PACE'
		|| error.message === 'INVALID_HEART_RATE'
		|| error.message === 'NOTE_TOO_LONG'
	) return 'shell.today.actualEntryInvalid';
	return 'shell.history.saveError';
}

function ProgressHeader() {
	const { t } = useTranslation();
	return (
		<MobilePageHeader
			title={t('shell.nav.progress')}
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
	);
}

function ProgressPageContent({
	activeTab,
	dashboard,
	history,
	selectedDate,
	todayLocalDate,
	canGoNext,
	onChangeTab,
	onNextMonth,
	onPreviousMonth,
	onSelectDate,
	backfillAvailable = false,
	onOpenBackfill,
	onEditRecord,
}: ProgressPageContentProps) {
	const { t, i18n } = useTranslation();
	const selectedRecords = history.groups.find(
		(group) => group.localDate === selectedDate,
	)?.records ?? [];
	const goalSummaries = dashboard.goalSummaries.filter(
		(summary) => summary.longTermGoal || summary.stageGoal,
	);
	const visibleGoals = activeTab === 'calendar'
		? goalSummaries.slice(0, 2)
		: dashboard.goalSummaries;
	const selectedDayLabel = shortDateLabel(
		selectedDate,
		i18n.resolvedLanguage ?? i18n.language,
	);
	const tabs = buildProgressTabModel(activeTab);
	const activeTabId = tabs.find(({ selected }) => selected)!.id;

	return (
		<div className={styles.page}>
			<ProgressHeader />
			<div
				className={styles.segmented}
				role='tablist'
				aria-label={t('shell.progress.tabsLabel')}
			>
				{tabs.map((tab) => (
					<button
						id={tab.id}
						type='button'
						role='tab'
						aria-controls={tab.panelId}
						aria-selected={tab.selected}
						onClick={() => onChangeTab(tab.tab)}
						key={tab.tab}
					>
						{tab.tab === 'calendar'
							? <PiCalendarBlank aria-hidden='true' />
							: <PiTarget aria-hidden='true' />}
						{t(tab.tab === 'calendar'
							? 'shell.progress.calendarTab'
							: 'shell.progress.goalsTab')}
					</button>
				))}
			</div>
			<div
				id='progress-tab-content'
				className={styles.tabContent}
				role='tabpanel'
				aria-labelledby={activeTabId}
			>
				{activeTab === 'calendar' && (
					<section
						className={styles.calendarPanel}
						data-testid='progress-calendar-panel'
					>
						<OutcomeCalendar
							year={dashboard.year}
							monthIndex={dashboard.monthIndex}
							outcomeDates={dashboard.outcomeDates}
							todayLocalDate={todayLocalDate}
							selectedDate={selectedDate}
							onSelectDate={onSelectDate}
							onPreviousMonth={onPreviousMonth}
							onNextMonth={onNextMonth}
							canGoNext={canGoNext}
						>
							<div className={styles.selectedDay}>
								<p>{t('shell.progress.selectedDayHint')}</p>
								<h2>
									{t('shell.progress.selectedDayTitle', {
										date: selectedDayLabel,
										count: selectedRecords.length,
									})}
								</h2>
								{selectedRecords.length === 0 ? (
									<p className={styles.empty}>{t('shell.progress.noRecords')}</p>
								) : (
									<div className={styles.records}>
										{selectedRecords.map((record) => {
											const relatedGoalTitle = record.stageGoalTitle
												?? record.longTermGoalTitle;
											const showRelatedGoalTitle = relatedGoalTitle
												&& relatedGoalTitle.trim() !== record.cardTitle.trim();
											return (
												<article key={record.id}>
													<div className={styles.recordMain}>
														<HabitGlyph
															iconKey={record.iconKey ?? 'activity'}
															accent={record.accent ?? 'green'}
															label={record.cardTitle}
															decorative
															size='sm'
														/>
														<div>
															<strong>{record.cardTitle}</strong>
															{showRelatedGoalTitle && <small>{relatedGoalTitle}</small>}
														</div>
														<b>
															{t('shell.progress.recordValue', {
																value: record.displayValue,
																unit: record.displayUnit,
															})}
														</b>
													</div>
													{(record.plannedQuantityBaseValue
														|| record.durationSeconds
														|| record.averagePaceSecondsPerKm
														|| record.averageHeartRateBpm
														|| record.note) && (
														<div className={styles.recordFacts}>
															{record.plannedQuantityBaseValue && (
																<span>{t('shell.progress.plannedValue', {
																	value: recordBaseValue(
																		record.plannedQuantityBaseValue,
																		record.basePerDisplayUnit,
																	),
																	unit: record.displayUnit,
																})}</span>
															)}
															{record.carryOutBaseValue !== undefined
																&& record.carryOutBaseValue > 0 && (
																<span data-accent='warning'>{t('shell.progress.carryForward', {
																	value: recordBaseValue(
																		record.carryOutBaseValue,
																		record.basePerDisplayUnit,
																	),
																	unit: record.displayUnit,
																})}</span>
															)}
															{record.durationSeconds && (
																<span>{t('shell.progress.durationValue', {
																	value: new Intl.NumberFormat(undefined, {
																		maximumFractionDigits: 1,
																	}).format(record.durationSeconds / 60),
																})}</span>
															)}
															{record.averagePaceSecondsPerKm && (
																<span>{t('shell.progress.paceValue', {
																	value: paceValue(record.averagePaceSecondsPerKm),
																})}</span>
															)}
															{record.averageHeartRateBpm && (
																<span>{t('shell.progress.heartRateValue', {
																	value: record.averageHeartRateBpm,
																})}</span>
															)}
															{record.note && <p>{record.note}</p>}
														</div>
													)}
													{onEditRecord && (
														<button
															type='button'
															className={styles.editRecordButton}
															onClick={() => onEditRecord(record.id)}
														>
															<PiPencilSimple aria-hidden='true' />
															{t('shell.progress.editRecord')}
														</button>
													)}
												</article>
											);
										})}
									</div>
								)}
								<div className={styles.selectedDayActions}>
									{backfillAvailable && onOpenBackfill && (
										<button
											type='button'
											className={styles.backfillButton}
											onClick={onOpenBackfill}
										>
											<PiCalendarPlus aria-hidden='true' />
											{t('shell.progress.backfill')}
										</button>
									)}
									<Link
										className={styles.detailsLink}
										to={buildHistoryDateHref(selectedDate)}
									>
										<PiEye aria-hidden='true' />
										{t('shell.progress.details')}
										<PiCaretRight aria-hidden='true' />
									</Link>
								</div>
							</div>
						</OutcomeCalendar>
					</section>
				)}
				<section
					className={styles.planPanel}
					data-testid='progress-plan-panel'
				>
					<header>
						<h2>{t('shell.progress.plans')}</h2>
						<p>
							{t('shell.progress.activeSummary', {
								habits: dashboard.goalSummaries.length,
								days: dashboard.outcomeDayCount,
							})}
						</p>
					</header>
					{visibleGoals.length > 0 ? (
						<GoalSummary summaries={visibleGoals} />
					) : (
						<p className={styles.planEmpty}>{t('shell.progress.noPlans')}</p>
					)}
					<Link className={styles.allGoalsLink} to={APP_ROUTES.DECK}>
						{t('shell.progress.viewAllGoals')}
						<PiCaretRight aria-hidden='true' />
					</Link>
				</section>
			</div>
		</div>
	);
}

interface BackfillSheetProps {
	localDate: string;
	model: DailyHabitsModel;
	pendingIds: ReadonlySet<string>;
	saveErrorIds: ReadonlySet<string>;
	onChange: (habit: DailyHabitView, quantityBaseValue: number) => void;
	onComplete: (habit: DailyHabitView) => void;
	onSaveActual: (habit: DailyHabitView, entry: HabitActualEntry) => void;
	onClose: () => void;
}

function BackfillSheet({
	localDate,
	model,
	pendingIds,
	saveErrorIds,
	onChange,
	onComplete,
	onSaveActual,
	onClose,
}: BackfillSheetProps) {
	const { t, i18n } = useTranslation();
	const habits = model.habits.filter(
		(habit) => habit.scheduledToday && !habit.recordedToday,
	);
	const dateLabel = shortDateLabel(
		localDate,
		i18n.resolvedLanguage ?? i18n.language,
	);

	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape') onClose();
		};
		document.addEventListener('keydown', handleKeyDown);
		return () => document.removeEventListener('keydown', handleKeyDown);
	}, [onClose]);

	return (
		<div className={styles.backfillOverlay} onMouseDown={onClose}>
			<section
				className={styles.backfillSheet}
				role='dialog'
				aria-modal='true'
				aria-labelledby='backfill-sheet-title'
				onMouseDown={(event) => event.stopPropagation()}
			>
				<span className={styles.sheetGrab} aria-hidden='true' />
				<header>
					<div>
						<h2 id='backfill-sheet-title'>{t('shell.progress.backfill')}</h2>
						<p>{t('shell.progress.backfillDescription', { date: dateLabel })}</p>
					</div>
					<button
						type='button'
						onClick={onClose}
						aria-label={t('common.close')}
						autoFocus
					>
						<PiX aria-hidden='true' />
					</button>
				</header>
				<TodayHabitPanel
					habits={habits}
					context='backfill'
					completedExpanded
					pendingIds={pendingIds}
					saveErrorIds={saveErrorIds}
					onChange={onChange}
					onComplete={onComplete}
					onSaveActual={onSaveActual}
					onToggleCompleted={() => undefined}
				/>
				<p className={styles.backfillHint}>{t('shell.progress.backfillHint')}</p>
			</section>
		</div>
	);
}

function ProgressPage() {
	const { t } = useTranslation();
	const [searchParams, setSearchParams] = useSearchParams();
	const now = useMemo(() => new Date(), []);
	const todayLocalDate = formatLocalDate(now);
	const requestedDate = searchParams.get('date');
	const selectedDate = validSelectedDate(requestedDate, todayLocalDate);
	const canonicalDateSearch = canonicalProgressDateSearch(requestedDate, selectedDate);
	const [activeTab, setActiveTab] = useState<ProgressTab>('calendar');
	const month = useMemo(() => progressMonthFromDate(selectedDate), [selectedDate]);
	const [dashboard, setDashboard] = useState<HomeDashboardModel | null>(null);
	const [history, setHistory] = useState<HistoryModel | null>(null);
	const [backfillModel, setBackfillModel] = useState<DailyHabitsModel | null>(null);
	const [backfillOpen, setBackfillOpen] = useState(false);
	const [backfillPendingIds, setBackfillPendingIds] = useState<ReadonlySet<string>>(new Set());
	const [backfillSaveErrorIds, setBackfillSaveErrorIds] = useState<ReadonlySet<string>>(new Set());
	const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
	const [correctionSaving, setCorrectionSaving] = useState(false);
	const [correctionError, setCorrectionError] = useState<string>();
	const correctionIds = useRef<{ update?: string; delete?: string }>({});
	const [error, setError] = useState(false);
	const [reloadNonce, setReloadNonce] = useState(0);

	useEffect(() => {
		if (canonicalDateSearch) {
			setSearchParams(canonicalDateSearch, { replace: true });
		}
	}, [canonicalDateSearch, setSearchParams]);

	useEffect(() => {
		let active = true;
		void Promise.all([
			loadHomeDashboardInApp(month),
			loadHistoryInApp(todayLocalDate),
		]).then(([nextDashboard, nextHistory]) => {
			if (!active) return;
			setDashboard(nextDashboard);
			setHistory(nextHistory);
		}).catch(() => { if (active) setError(true); });
		return () => { active = false; };
	}, [month, reloadNonce, todayLocalDate]);

	useEffect(() => {
		let active = true;
		if (selectedDate >= todayLocalDate) {
			return () => { active = false; };
		}
		void loadDailyHabitsInApp(selectedDate)
			.then((next) => {
				if (active) setBackfillModel(next);
			})
			.catch(() => {
				if (active) setBackfillModel(null);
			});
		return () => { active = false; };
	}, [reloadNonce, selectedDate, todayLocalDate]);

	const moveMonth = (offset: number) => {
		const next = moveProgressMonth(month, selectedDate, offset, todayLocalDate);
		if (next.year === month.year && next.monthIndex === month.monthIndex) return;
		setSearchParams(next.dateSearch, { replace: true });
	};
	const selectDate = (localDate: string) => {
		setBackfillOpen(false);
		setBackfillSaveErrorIds(new Set());
		setSelectedRecordId(null);
		setCorrectionError(undefined);
		correctionIds.current = {};
		setSearchParams(buildProgressDateSearch(localDate), { replace: true });
	};
	const canGoNext = month.year < now.getFullYear()
		|| (month.year === now.getFullYear() && month.monthIndex < now.getMonth());
	const backfillableHabits = backfillModel?.localDate === selectedDate
		? backfillModel.habits.filter(
		(habit) => habit.scheduledToday && !habit.recordedToday,
		)
		: [];
	const selectedRecord = history?.groups
		.flatMap(({ records }) => records)
		.find(({ id }) => id === selectedRecordId);

	async function saveBackfillHabit(
		habit: DailyHabitView,
		quantityBaseValue: number,
		details?: HabitActualEntry & { entryMethod: 'completed' | 'actual' },
	): Promise<void> {
		if (
			selectedDate >= formatLocalDate(new Date())
			|| !habit.scheduledToday
			|| habit.recordedToday
			|| backfillPendingIds.has(habit.id)
		) return;
		setBackfillPendingIds((current) => new Set(current).add(habit.id));
		setBackfillSaveErrorIds((current) => {
			const next = new Set(current);
			next.delete(habit.id);
			return next;
		});
		try {
			await saveDailyHabitInApp({
				userCardId: habit.id,
				localDate: selectedDate,
				currentLocalDate: formatLocalDate(new Date()),
				recordingContext: 'backfill',
				quantityBaseValue,
				entryMethod: details?.entryMethod,
				plannedQuantityBaseValue: habit.dailyTargetBase,
				carryInBaseValue: habit.carryInBaseValue,
				durationSeconds: details?.durationSeconds,
				averagePaceSecondsPerKm: details?.averagePaceSecondsPerKm,
				averageHeartRateBpm: details?.averageHeartRateBpm,
				note: details?.note,
				nowIso: new Date().toISOString(),
				submissionId: crypto.randomUUID(),
			});
			const nextModel = await loadDailyHabitsInApp(selectedDate);
			setBackfillModel(nextModel);
			setReloadNonce((value) => value + 1);
			if (!nextModel.habits.some(
				(candidate) => candidate.scheduledToday && !candidate.recordedToday,
			)) {
				setBackfillOpen(false);
			}
		} catch {
			setBackfillSaveErrorIds((current) => new Set(current).add(habit.id));
		} finally {
			setBackfillPendingIds((current) => {
				const next = new Set(current);
				next.delete(habit.id);
				return next;
			});
		}
	}

	async function correctSelectedRecord(
		record: HistoryRecordModel,
		operation: 'update' | 'delete',
		value?: ActionRecordEditValue,
	): Promise<void> {
		if (correctionSaving) return;
		setCorrectionSaving(true);
		setCorrectionError(undefined);
		try {
			const quantityBaseValue = operation === 'update'
				? parseQuantityToBase(value?.valueText ?? '', {
					baseUnit: record.displayUnit,
					displayUnit: record.displayUnit,
					basePerDisplayUnit: record.basePerDisplayUnit,
					maxDecimalPlaces: record.maxDecimalPlaces,
					confirmationThresholdDisplay: record.confirmationThresholdDisplay,
				}, { confirmedOverLimit: true })
				: undefined;
			const correctionId = correctionIds.current[operation] ?? crypto.randomUUID();
			correctionIds.current[operation] = correctionId;
			await correctActionRecordInApp({
				actionRecordId: record.id,
				operation,
				quantityBaseValue,
				currentLocalDate: formatLocalDate(new Date()),
				recordLocalDate: record.localDate,
				nowIso: new Date().toISOString(),
				correctionId,
				details: operation === 'update' && record.supportsTrainingDetails ? {
					durationSeconds: value?.durationSeconds,
					averagePaceSecondsPerKm: value?.averagePaceSecondsPerKm,
					averageHeartRateBpm: value?.averageHeartRateBpm,
					note: value?.note,
				} : undefined,
			});
			setSelectedRecordId(null);
			correctionIds.current = {};
			setReloadNonce((current) => current + 1);
		} catch (caught) {
			setCorrectionError(t(correctionErrorKey(caught)));
		} finally {
			setCorrectionSaving(false);
		}
	}

	if (error) {
		return (
			<div className={styles.page}>
				<ProgressHeader />
				<section className={styles.state}>
					<PiChartBar aria-hidden='true' />
					<p>{t('shell.progress.loadError')}</p>
					<button
						type='button'
						onClick={() => {
							setDashboard(null);
							setHistory(null);
							setError(false);
							setReloadNonce((value) => value + 1);
						}}
					>
						<PiArrowClockwise aria-hidden='true' />
						{t('shell.home.retry')}
					</button>
				</section>
			</div>
		);
	}
	if (
		!dashboard
		|| dashboard.year !== month.year
		|| dashboard.monthIndex !== month.monthIndex
		|| !history
	) {
		return (
			<div className={styles.page}>
				<ProgressHeader />
				<p className={styles.loading}>{t('shell.progress.loading')}</p>
			</div>
		);
	}

	return (
		<>
			<ProgressPageContent
			activeTab={activeTab}
			dashboard={dashboard}
			history={history}
			selectedDate={selectedDate}
			todayLocalDate={todayLocalDate}
			canGoNext={canGoNext}
			onChangeTab={setActiveTab}
			onPreviousMonth={() => moveMonth(-1)}
			onNextMonth={() => moveMonth(1)}
			onSelectDate={selectDate}
			backfillAvailable={backfillableHabits.length > 0}
			onOpenBackfill={() => setBackfillOpen(true)}
			onEditRecord={(recordId) => {
				correctionIds.current = {};
				setCorrectionError(undefined);
				setSelectedRecordId(recordId);
			}}
			/>
			{backfillOpen && backfillModel && (
				<BackfillSheet
				localDate={selectedDate}
				model={backfillModel}
				pendingIds={backfillPendingIds}
				saveErrorIds={backfillSaveErrorIds}
				onChange={(habit, quantityBaseValue) => {
					void saveBackfillHabit(habit, quantityBaseValue);
				}}
				onComplete={(habit) => {
					void saveBackfillHabit(habit, habit.dailyTargetBase, {
						quantityBaseValue: habit.dailyTargetBase,
						entryMethod: 'completed',
					});
				}}
				onSaveActual={(habit, entry) => {
					void saveBackfillHabit(habit, entry.quantityBaseValue, {
						...entry,
						entryMethod: 'actual',
					});
				}}
				onClose={() => setBackfillOpen(false)}
				/>
			)}
			{selectedRecord && (
				<ActionRecordEditor
					record={selectedRecord}
					saving={correctionSaving}
					error={correctionError}
					onClose={() => {
						setSelectedRecordId(null);
						setCorrectionError(undefined);
						correctionIds.current = {};
					}}
					onSave={(value) => {
						void correctSelectedRecord(selectedRecord, 'update', value);
					}}
					onDelete={() => {
						void correctSelectedRecord(selectedRecord, 'delete');
					}}
				/>
			)}
		</>
	);
}

export { ProgressPage, ProgressPageContent };
export type { ProgressPageContentProps, ProgressTab };
