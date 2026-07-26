/* eslint-disable i18next/no-literal-string -- Tab, query and element identifiers are stable non-UI strings. */
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
	PiArrowClockwise,
	PiCaretRight,
	PiChartBar,
	PiCheckCircle,
	PiGearSix,
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
import { loadHistoryInApp, type HistoryModel } from '@features/load-history';
import {
	loadHomeDashboardInApp,
	type HomeDashboardModel,
} from '@features/load-home-dashboard';
import { APP_ROUTES } from '@shared/config';
import { formatLocalDate } from '@shared/lib/date';
import { GoalSummary } from '@widgets/goal-summary';
import { MobilePageHeader } from '@widgets/mobile-page-header';
import { OutcomeCalendar } from '@widgets/outcome-calendar';

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
}

function shortDateLabel(localDate: string, locale: string): string {
	const [year, month, day] = localDate.split('-').map(Number);
	return new Intl.DateTimeFormat(locale, {
		month: 'long',
		day: 'numeric',
	}).format(new Date(year!, month! - 1, day!, 12));
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
										{selectedRecords.map((record) => (
											<article key={record.id}>
												<span><PiCheckCircle aria-hidden='true' /></span>
												<div>
													<strong>{record.cardTitle}</strong>
													<small>
														{record.stageGoalTitle
															?? record.longTermGoalTitle
															?? t('shell.progress.dailyRecord')}
													</small>
												</div>
												<b>
													{t('shell.progress.recordValue', {
														value: record.displayValue,
														unit: record.displayUnit,
													})}
												</b>
											</article>
										))}
									</div>
								)}
								<Link
									className={styles.detailsLink}
									to={buildHistoryDateHref(selectedDate)}
								>
									{t('shell.progress.details')}
									<PiCaretRight aria-hidden='true' />
								</Link>
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

	const moveMonth = (offset: number) => {
		const next = moveProgressMonth(month, selectedDate, offset, todayLocalDate);
		if (next.year === month.year && next.monthIndex === month.monthIndex) return;
		setSearchParams(next.dateSearch, { replace: true });
	};
	const selectDate = (localDate: string) => {
		setSearchParams(buildProgressDateSearch(localDate), { replace: true });
	};
	const canGoNext = month.year < now.getFullYear()
		|| (month.year === now.getFullYear() && month.monthIndex < now.getMonth());

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
		/>
	);
}

export { ProgressPage, ProgressPageContent };
export type { ProgressPageContentProps, ProgressTab };
