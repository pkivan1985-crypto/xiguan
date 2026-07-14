/* eslint-disable i18next/no-literal-string -- Conditional literals are typed translation keys, not user-facing copy. */
import styles from './HomePage.module.css';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { FiArrowRight, FiPlus, FiRefreshCw } from 'react-icons/fi';
import { loadHomeDashboardInApp, type HomeDashboardModel } from '@features/load-home-dashboard';
import { APP_ROUTES } from '@shared/config';
import { formatLocalDate } from '@shared/lib/date';
import { GoalSummary } from '@widgets/goal-summary';
import { OutcomeCalendar } from '@widgets/outcome-calendar';
import { homeErrorKey } from '../model/homePage';

interface HomeDashboardContentProps {
	model: HomeDashboardModel; todayLocalDate: string; onPreviousMonth: () => void; onNextMonth: () => void; canGoNext: boolean;
}

function HomeDashboardContent({ model, todayLocalDate, onPreviousMonth, onNextMonth, canGoNext }: HomeDashboardContentProps) {
	const { t } = useTranslation();
	const actionKey = model.hasCards ? 'shell.home.todayAction' as const : 'shell.home.createFirstCard' as const;
	const actionDescriptionKey = model.hasCards ? 'shell.home.todayActionDescription' as const : 'shell.home.createFirstCardDescription' as const;
	return <div className={styles.page}>
		<section className={styles.scene}>
			<div className={styles.sceneTrail} aria-hidden='true'><span /><span /><span /></div>
			<p className={styles.eyebrow}>{t('shell.home.eyebrow')}</p><h2>{t('shell.home.sceneTitle')}</h2><p>{t('shell.home.sceneDescription')}</p>
			{model.outcomeDayCount > 0 && <strong>{t('shell.home.monthEvidence', { count: model.outcomeDayCount })}</strong>}
		</section>
		<div className={styles.actionStack}>
			<Link className={styles.primaryAction} to={model.hasCards ? APP_ROUTES.TODAY : APP_ROUTES.DECK_NEW}>
				<span className={styles.actionCopy}><strong>{t(actionKey)}</strong><small>{t(actionDescriptionKey)}</small></span><FiArrowRight aria-hidden='true' />
			</Link>
			{model.hasCards && <Link className={styles.secondaryAction} to={APP_ROUTES.DECK_NEW}>
				<FiPlus aria-hidden='true' /><span>{t('shell.createCard.create')}</span>
			</Link>}
		</div>
		<header className={styles.sectionTitle}><h2>{t('shell.home.goalsTitle')}</h2><span>{model.goalSummaries.length}</span></header>
		{model.goalSummaries.length > 0 ? <GoalSummary summaries={model.goalSummaries} /> : <div className={styles.empty}><b>{t('shell.home.noCardsTitle')}</b><small>{t('shell.home.noCardsDescription')}</small></div>}
		<header className={styles.sectionTitle}><h2>{t('shell.home.calendarTitle')}</h2><span>{t('shell.home.outcomeDayCount', { count: model.outcomeDayCount })}</span></header>
		<OutcomeCalendar year={model.year} monthIndex={model.monthIndex} outcomeDates={model.outcomeDates} todayLocalDate={todayLocalDate} onPreviousMonth={onPreviousMonth} onNextMonth={onNextMonth} canGoNext={canGoNext} />
	</div>;
}

function HomePage() {
	const { t } = useTranslation();
	const today = useMemo(() => new Date(), []);
	const todayLocalDate = formatLocalDate(today);
	const [month, setMonth] = useState({ year: today.getFullYear(), monthIndex: today.getMonth() });
	const [model, setModel] = useState<HomeDashboardModel | null>(null);
	const [error, setError] = useState<unknown>(null);
	const [retryNonce, setRetryNonce] = useState(0);

	useEffect(() => {
		let active = true;
		void loadHomeDashboardInApp(month).then((next) => { if (active) setModel(next); }).catch((reason: unknown) => { if (active) setError(reason); });
		return () => { active = false; };
	}, [month, retryNonce]);
	const moveMonth = useCallback((offset: number) => {
		setModel(null);
		setError(null);
		setMonth((current) => {
			const next = new Date(current.year, current.monthIndex + offset, 1);
			return { year: next.getFullYear(), monthIndex: next.getMonth() };
		});
	}, []);
	const canGoNext = month.year < today.getFullYear() || (month.year === today.getFullYear() && month.monthIndex < today.getMonth());

	if (error) return <section className={styles.state}><h2>{t(homeErrorKey(error))}</h2><button type='button' onClick={() => { setModel(null); setError(null); setRetryNonce((value) => value + 1); }}><FiRefreshCw aria-hidden='true' />{t('shell.home.retry')}</button></section>;
	if (!model) return <section className={styles.state}><p className={styles.stateCopy}>{t('shell.home.loading')}</p></section>;
	return <HomeDashboardContent model={model} todayLocalDate={todayLocalDate} onPreviousMonth={() => moveMonth(-1)} onNextMonth={() => moveMonth(1)} canGoNext={canGoNext} />;
}

export { HomeDashboardContent, HomePage };
export type { HomeDashboardContentProps };
