import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FiBarChart2, FiCalendar, FiCheck, FiFlag, FiRefreshCw } from 'react-icons/fi';
import { useSearchParams } from 'react-router';

import { loadHistoryInApp, type HistoryModel } from '@features/load-history';
import { loadHomeDashboardInApp, type HomeDashboardModel } from '@features/load-home-dashboard';
import { formatLocalDate, parseLocalDate } from '@shared/lib/date';
import { GoalSummary } from '@widgets/goal-summary';
import { OutcomeCalendar } from '@widgets/outcome-calendar';

import styles from './ProgressPage.module.css';

function validSelectedDate(value: string | null, today: string): string {
	if (!value) return today;
	try {
		return parseLocalDate(value) <= today ? value : today;
	} catch {
		return today;
	}
}

function ProgressPage() {
	const { t } = useTranslation();
	const [searchParams, setSearchParams] = useSearchParams();
	const now = useMemo(() => new Date(), []);
	const todayLocalDate = formatLocalDate(now);
	const initialSelected = validSelectedDate(searchParams.get('date'), todayLocalDate);
	const [selectedDate, setSelectedDate] = useState(initialSelected);
	const [month, setMonth] = useState(() => {
		const [year, monthNumber] = initialSelected.split('-').map(Number);
		return { year: year!, monthIndex: monthNumber! - 1 };
	});
	const [dashboard, setDashboard] = useState<HomeDashboardModel | null>(null);
	const [history, setHistory] = useState<HistoryModel | null>(null);
	const [error, setError] = useState(false);
	const [reloadNonce, setReloadNonce] = useState(0);

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

	const moveMonth = useCallback((offset: number) => {
		setDashboard(null);
		setMonth((current) => {
			const next = new Date(current.year, current.monthIndex + offset, 1);
			return { year: next.getFullYear(), monthIndex: next.getMonth() };
		});
	}, []);
	const selectDate = (localDate: string) => {
		setSelectedDate(localDate);
		setSearchParams({ date: localDate }, { replace: true });
	};
	const canGoNext = month.year < now.getFullYear() || (month.year === now.getFullYear() && month.monthIndex < now.getMonth());
	const selectedRecords = history?.groups.find((group) => group.localDate === selectedDate)?.records ?? [];

	if (error) return <section className={styles.state}><FiBarChart2 aria-hidden='true' /><p>{t('shell.progress.loadError')}</p><button type='button' onClick={() => { setDashboard(null); setHistory(null); setError(false); setReloadNonce((value) => value + 1); }}><FiRefreshCw aria-hidden='true' />{t('shell.home.retry')}</button></section>;
	if (!dashboard || !history) return <p className={styles.loading}>{t('shell.progress.loading')}</p>;

	return (
		<div className={styles.page}>
			<section className={styles.metrics} aria-label={t('shell.progress.overview')}>
				<div><span><FiCalendar aria-hidden='true' /></span><strong>{dashboard.outcomeDayCount}</strong><small>{t('shell.progress.outcomeDays')}</small></div>
				<div><span><FiCheck aria-hidden='true' /></span><strong>{selectedRecords.length}</strong><small>{t('shell.progress.selectedRecords')}</small></div>
				<div><span><FiFlag aria-hidden='true' /></span><strong>{dashboard.goalSummaries.filter((item) => item.longTermGoal).length}</strong><small>{t('shell.progress.longPlans')}</small></div>
			</section>

			<section className={styles.panel}>
				<header><div><FiCalendar aria-hidden='true' /><h2>{t('shell.progress.calendar')}</h2></div><span>{dashboard.outcomeDayCount}</span></header>
				<OutcomeCalendar
					year={dashboard.year}
					monthIndex={dashboard.monthIndex}
					outcomeDates={dashboard.outcomeDates}
					todayLocalDate={todayLocalDate}
					selectedDate={selectedDate}
					onSelectDate={selectDate}
					onPreviousMonth={() => moveMonth(-1)}
					onNextMonth={() => moveMonth(1)}
					canGoNext={canGoNext}
				/>
			</section>

			<section className={styles.panel}>
				<header><div><FiCheck aria-hidden='true' /><h2>{selectedDate}</h2></div><span>{selectedRecords.length}</span></header>
				{selectedRecords.length === 0 ? <p className={styles.empty}>{t('shell.progress.noRecords')}</p> : (
					<div className={styles.records}>
						{selectedRecords.map((record) => (
							<article key={record.id}>
								<span><FiCheck aria-hidden='true' /></span>
								<div><strong>{record.cardTitle}</strong><small>{record.stageGoalTitle ?? record.longTermGoalTitle ?? t('shell.progress.dailyRecord')}</small></div>
								<b>{record.displayValue} {record.displayUnit}</b>
							</article>
						))}
					</div>
				)}
			</section>

			<section className={styles.plans}>
				<header><div><FiFlag aria-hidden='true' /><h2>{t('shell.progress.plans')}</h2></div><span>{dashboard.goalSummaries.length}</span></header>
				{dashboard.goalSummaries.length > 0 ? <GoalSummary summaries={dashboard.goalSummaries} /> : <p className={styles.empty}>{t('shell.progress.noPlans')}</p>}
			</section>
		</div>
	);
}

export { ProgressPage };
