import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { PiCaretRight, PiFlagPennant, PiTarget } from 'react-icons/pi';
import { Link } from 'react-router';

import { formatQuantityFromBase } from '@entities/card-template';
import type { GoalProgress } from '@entities/goal';
import type { HomeGoalSummary } from '@features/load-home-dashboard';
import { APP_ROUTES } from '@shared/config';

import styles from './GoalSummary.module.css';

interface GoalSummaryProps { summaries: readonly HomeGoalSummary[]; }

function displayValue(summary: HomeGoalSummary, baseValue: number): string {
	return formatQuantityFromBase(baseValue, {
		baseUnit: summary.displayUnit, displayUnit: summary.displayUnit, basePerDisplayUnit: summary.basePerDisplayUnit,
		maxDecimalPlaces: summary.maxDecimalPlaces, confirmationThresholdDisplay: Number.MAX_SAFE_INTEGER,
	});
}

function inferredTarget(current: number, ratio: number | undefined): number | null {
	if (!ratio || ratio <= 0 || ratio >= 1) return null;
	return Math.round(current / ratio);
}

function quantityProgressText(
	summary: HomeGoalSummary,
	progress: GoalProgress,
	t: TFunction,
): string {
	const current = displayValue(summary, progress.quantityBaseValue);
	const targetBase = inferredTarget(progress.quantityBaseValue, progress.quantityRatio);
	return targetBase === null
		? t('shell.progress.currentProgress', { current, unit: summary.displayUnit })
		: t('shell.progress.quantityProgress', {
			current,
			target: displayValue(summary, targetBase),
			unit: summary.displayUnit,
		});
}

function activeDaysProgressText(
	progress: GoalProgress,
	t: TFunction,
): string {
	const targetDays = inferredTarget(progress.activeDays, progress.activeDaysRatio);
	return targetDays === null
		? t('shell.progress.activeDaysCurrent', { current: progress.activeDays })
		: t('shell.progress.activeDaysProgress', {
			current: progress.activeDays,
			target: targetDays,
		});
}

function GoalSummary({ summaries }: GoalSummaryProps) {
	const { t } = useTranslation();
	return <div className={styles.list}>{summaries.map((summary) => {
		const longTerm = summary.longTermGoal;
		const stage = summary.stageGoal;
		const hasGoal = Boolean(longTerm || stage);
		return <Link className={styles.card} to={APP_ROUTES.goalDetails(summary.userCardId)} key={summary.userCardId}>
			<span className={styles.heading}>
				<span className={styles.icon}><PiTarget aria-hidden='true' /></span>
				<strong>{summary.cardTitle}</strong>
				<PiCaretRight aria-hidden='true' />
			</span>
			{hasGoal ? (
				<span className={styles.goalDetails}>
					<span className={styles.labels}>
						<span>{longTerm && <><PiTarget aria-hidden='true' /><b>{longTerm.title}</b></>}</span>
						<span>{stage && <><PiFlagPennant aria-hidden='true' /><b>{stage.title}</b></>}</span>
					</span>
					<span
						className={styles.bar}
						role='progressbar'
						aria-label={longTerm ? t('shell.progress.longTermProgressLabel', { title: longTerm.title }) : undefined}
						aria-valuemin={0}
						aria-valuemax={100}
						aria-valuenow={longTerm ? Math.round(longTerm.progress.ratio * 100) : 0}
					>
						{longTerm && <i style={{ width: `${longTerm.progress.ratio * 100}%` }} />}
						{stage && (
							<em
								role='progressbar'
								aria-label={t('shell.progress.stageProgressLabel', { title: stage.title })}
								aria-valuemin={0}
								aria-valuemax={100}
								aria-valuenow={Math.round(stage.progress.ratio * 100)}
								style={{ left: `${stage.progress.ratio * 100}%` }}
							/>
						)}
					</span>
					<span className={styles.values}>
						<span>{longTerm && quantityProgressText(summary, longTerm.progress, t)}</span>
						<span>{stage && (stage.mode === 'activeDays'
							? activeDaysProgressText(stage.progress, t)
							: quantityProgressText(summary, stage.progress, t))}</span>
					</span>
				</span>
			) : <small className={styles.noGoal}>{t('shell.home.noGoalForCard')}</small>}
		</Link>;
	})}</div>;
}

export { GoalSummary };
export type { GoalSummaryProps };
