import styles from './HabitStatisticsPage.module.css';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router';
import { FiArrowLeft, FiCalendar, FiTarget } from 'react-icons/fi';
import { formatQuantityFromBase } from '@entities/card-template';
import { loadGoalDetailsInApp } from '@features/load-goal-details';
import type { GoalDetailsModel } from '@features/load-goal-details';
import { APP_ROUTES } from '@shared/config';

const STATUS_KEYS = {
	planned: 'shell.goalDetails.status.planned', active: 'shell.goalDetails.status.active', completed: 'shell.goalDetails.status.completed',
	expired: 'shell.goalDetails.status.expired', abandoned: 'shell.goalDetails.status.abandoned',
} as const;
const MODE_KEYS = {
	quantity: 'shell.goalDetails.mode.quantity', activeDays: 'shell.goalDetails.mode.activeDays', both: 'shell.goalDetails.mode.both',
} as const;

function quantity(model: GoalDetailsModel, baseValue: number): string {
	return formatQuantityFromBase(baseValue, {
		baseUnit: model.card.displayUnit,
		displayUnit: model.card.displayUnit,
		basePerDisplayUnit: model.card.basePerDisplayUnit,
		maxDecimalPlaces: model.card.maxDecimalPlaces,
		confirmationThresholdDisplay: Number.MAX_SAFE_INTEGER,
	});
}

function GoalDetailsPage() {
	const { t } = useTranslation();
	const { userCardId } = useParams();
	const [model, setModel] = useState<GoalDetailsModel | null>(null);
	const [error, setError] = useState(false);

	useEffect(() => {
		let active = true;
		if (!userCardId) return () => { active = false; };
		void loadGoalDetailsInApp(userCardId).then((next) => { if (active) setModel(next); }).catch(() => { if (active) setError(true); });
		return () => { active = false; };
	}, [userCardId]);

	if (!userCardId || error) return <section className={styles.state}><h2>{t('shell.goalDetails.notFound')}</h2><Link to={APP_ROUTES.DECK}>{t('shell.goalDetails.backToDeck')}</Link></section>;
	if (!model) return <section className={styles.state}><p>{t('shell.goalDetails.loading')}</p></section>;

	return <div className={styles.page}>
		<header className={styles.pageHeader}><Link to={APP_ROUTES.HOME} aria-label={t('shell.goalDetails.backHome')}><FiArrowLeft aria-hidden='true' /></Link><span><small>{t('shell.goalDetails.title')}</small><h2>{model.card.title}</h2></span><b>{model.card.displayUnit}</b></header>
		{model.longTermGoal && <section className={styles.goalCard}>
			<header><span className={styles.goalType}><FiTarget aria-hidden='true' />{t('shell.goalDetails.longTerm')}</span><b className={styles.statusTag}>{t(STATUS_KEYS[model.longTermGoal.status])}</b></header>
			<h3>{model.longTermGoal.title}</h3>
			<div className={styles.metric}><strong>{quantity(model, model.longTermGoal.progress.quantityBaseValue)}</strong><span className={styles.metricTarget}>/ {quantity(model, model.longTermGoal.targetQuantityBase)} {model.card.displayUnit}</span></div>
			<span className={styles.bar}><i style={{ width: `${model.longTermGoal.progress.ratio * 100}%` }} /></span>
			<footer><span>{Math.round(model.longTermGoal.progress.ratio * 100)}%</span><span>{model.longTermGoal.endDate ?? t('shell.goalDetails.noDeadline')}</span></footer>
			{model.longTermGoal.completionSnapshot && <p className={styles.snapshot}>{t('shell.goalDetails.completedAt', { date: model.longTermGoal.completionSnapshot.completedAt })}</p>}
		</section>}
		{model.stageGoal && <section className={styles.stageCard}>
			<header><span>{t('shell.goalDetails.currentStage')}</span><b className={styles.statusTag}>{t(MODE_KEYS[model.stageGoal.mode])}</b></header>
			<h3>{model.stageGoal.title}</h3>
			<div className={styles.stageFacts}><span className={styles.stageFact}><strong>{quantity(model, model.stageGoal.progress.quantityBaseValue)} {model.card.displayUnit}</strong><small>{t('shell.goalDetails.quantityFact')}</small></span><span className={styles.stageFact}><strong>{model.stageGoal.progress.activeDays}</strong><small>{t('shell.goalDetails.activeDaysFact')}</small></span><b className={styles.stagePercent}>{Math.round(model.stageGoal.progress.ratio * 100)}%</b></div>
		</section>}
		<section className={styles.facts}><span className={styles.summaryFact}><strong>{model.longTermGoal ? quantity(model, model.longTermGoal.progress.quantityBaseValue) : '0'} {model.card.displayUnit}</strong><small>{t('shell.goalDetails.totalOutcome')}</small></span><span className={styles.summaryFact}><strong>{model.activeDays}</strong><small>{t('shell.goalDetails.activeDays')}</small></span></section>
		<header className={styles.sectionTitle}><h3>{t('shell.goalDetails.recent')}</h3><Link to={APP_ROUTES.HISTORY}>{t('shell.goalDetails.allHistory')}</Link></header>
		<div className={styles.records}>{model.recentRecords.length > 0 ? model.recentRecords.map((record) => <article key={record.id}><span><FiCalendar aria-hidden='true' /><b>{record.localDate}</b></span><strong>{record.displayValue} {record.displayUnit}</strong></article>) : <p>{t('shell.goalDetails.noRecords')}</p>}</div>
	</div>;
}

export { GoalDetailsPage };
