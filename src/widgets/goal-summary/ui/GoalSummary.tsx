import styles from './GoalSummary.module.css';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { FiArrowUpRight, FiChevronRight } from 'react-icons/fi';
import { formatQuantityFromBase } from '@entities/card-template';
import type { HomeGoalSummary } from '@features/load-home-dashboard';
import { APP_ROUTES } from '@shared/config';

interface GoalSummaryProps { summaries: readonly HomeGoalSummary[]; }

function displayValue(summary: HomeGoalSummary, baseValue: number): string {
	return formatQuantityFromBase(baseValue, {
		baseUnit: summary.displayUnit, displayUnit: summary.displayUnit, basePerDisplayUnit: summary.basePerDisplayUnit,
		maxDecimalPlaces: summary.maxDecimalPlaces, confirmationThresholdDisplay: Number.MAX_SAFE_INTEGER,
	});
}

function GoalSummary({ summaries }: GoalSummaryProps) {
	const { t } = useTranslation();
	return <div className={styles.list}>{summaries.map((summary) => {
		const primary = summary.stageGoal ?? summary.longTermGoal;
		const progress = primary?.progress;
		return <Link className={styles.card} to={APP_ROUTES.goalDetails(summary.userCardId)} key={summary.userCardId}>
			<span className={styles.icon}><FiArrowUpRight aria-hidden='true' /></span>
			<span className={styles.copy}>
				<strong>{summary.cardTitle}</strong>
				{primary && progress ? <><small>{primary.title}</small><span className={styles.value}>{displayValue(summary, progress.quantityBaseValue)} {summary.displayUnit}</span></> : <small>{t('shell.home.noGoalForCard')}</small>}
				{summary.stageGoal && summary.longTermGoal && <small className={styles.secondary}>{summary.longTermGoal.title}</small>}
			</span>
			<span className={styles.progress}>{progress && <b>{Math.round(progress.ratio * 100)}%</b>}<FiChevronRight aria-hidden='true' /></span>
			{progress && <span className={styles.bar}><i style={{ width: `${progress.ratio * 100}%` }} /></span>}
		</Link>;
	})}</div>;
}

export { GoalSummary };
export type { GoalSummaryProps };
