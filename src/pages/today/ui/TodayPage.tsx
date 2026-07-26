import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
	PiArrowClockwise,
	PiGearSix,
	PiListChecks,
	PiPlus,
	PiWarningCircle,
} from 'react-icons/pi';
import { Link, useNavigate } from 'react-router';

import { loadDailyHabitsInApp, type DailyHabitView, type DailyHabitsModel } from '@features/load-daily-habits';
import { saveDailyHabitInApp } from '@features/save-daily-habit';
import { APP_ROUTES } from '@shared/config';
import { formatLocalDate } from '@shared/lib/date';
import { MobilePageHeader } from '@widgets/mobile-page-header';
import {
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
	onSelectDate,
	onToggleCompleted,
}: TodayPageContentProps) {
	const { t, i18n } = useTranslation();
	const completedRatio = model.habits.length === 0
		? 0
		: model.completedCount / model.habits.length;

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
					onSelect={onSelectDate}
				/>
			</div>
			<section className={styles.overview} aria-label={t('shell.today.overviewLabel')}>
				<strong>
					{t('shell.today.overview', {
						completed: model.completedCount,
						total: model.habits.length,
					})}
				</strong>
				<span
					className={styles.overviewProgress}
					role='progressbar'
					aria-label={t('shell.today.overviewProgressLabel')}
					aria-valuemin={0}
					aria-valuemax={Math.max(model.habits.length, 1)}
					aria-valuenow={model.completedCount}
					aria-valuetext={t('shell.today.overviewProgressValue', {
						completed: model.completedCount,
						total: model.habits.length,
					})}
				>
					<i style={{ width: `${completedRatio * 100}%` }} />
				</span>
				<small>{t('shell.today.autoSaveLocal')}</small>
			</section>
			<div className={styles.panelSlot}>
				<TodayHabitPanel
					habits={model.habits}
					completedExpanded={completedExpanded}
					pendingIds={pendingIds}
					saveErrorIds={saveErrorIds}
					onChange={onChangeHabit}
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

	async function changeHabit(habit: DailyHabitView, quantityBaseValue: number): Promise<void> {
		const queuedSave = saveQueueRef.current!.enqueue(habit.id, async () => {
			await saveDailyHabitInApp({
				userCardId: habit.id,
				localDate: todayLocalDate,
				currentLocalDate: formatLocalDate(new Date()),
				quantityBaseValue,
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
