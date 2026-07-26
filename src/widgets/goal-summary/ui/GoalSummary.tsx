/* eslint-disable i18next/no-literal-string -- Goal-kind identifiers are stable domain values. */
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import {
	PiCaretRight,
	PiCheckCircle,
	PiFlagPennant,
	PiTarget,
} from 'react-icons/pi';
import { Link } from 'react-router';

import { formatQuantityFromBase } from '@entities/card-template';
import type { GoalProgress, GoalStatus } from '@entities/goal';
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

function quantityProgressText(
	summary: HomeGoalSummary,
	progress: GoalProgress,
	targetQuantityBase: number | undefined,
	t: TFunction,
): string {
	const current = displayValue(summary, progress.quantityBaseValue);
	return targetQuantityBase === undefined
		? t('shell.progress.currentProgress', { current, unit: summary.displayUnit })
		: t('shell.progress.quantityProgress', {
			current,
			target: displayValue(summary, targetQuantityBase),
			unit: summary.displayUnit,
		});
}

function activeDaysProgressText(
	progress: GoalProgress,
	targetActiveDays: number | undefined,
	t: TFunction,
): string {
	return targetActiveDays === undefined
		? t('shell.progress.activeDaysCurrent', { current: progress.activeDays })
		: t('shell.progress.activeDaysProgress', {
			current: progress.activeDays,
			target: targetActiveDays,
		});
}

interface GoalProgressRowProps {
	kind: 'longTerm' | 'stage';
	title: string;
	status: GoalStatus;
	progress: GoalProgress;
	valueTexts: readonly string[];
	t: TFunction;
}

function GoalProgressRow({
	kind,
	title,
	status,
	progress,
	valueTexts,
	t,
}: GoalProgressRowProps) {
	const completed = progress.completed || status === 'completed';
	const combined = valueTexts.length > 1;
	const valueText = combined
		? t('shell.progress.combinedConditions', {
			quantity: valueTexts[0],
			activeDays: valueTexts[1],
		})
		: valueTexts[0]!;
	const progressLabel = t(
		kind === 'longTerm'
			? 'shell.progress.longTermProgressLabel'
			: 'shell.progress.stageProgressLabel',
		{ title },
	);
	return (
		<span
			className={styles.goalRow}
			data-combined={combined || undefined}
		>
			<span className={styles.goalLabel}>
				{kind === 'longTerm'
					? <PiTarget aria-hidden='true' />
					: <PiFlagPennant aria-hidden='true' />}
				<b>{title}</b>
				{completed && (
					<small>
						<PiCheckCircle aria-hidden='true' />
						{t('shell.goalDetails.status.completed')}
					</small>
				)}
			</span>
			<span
				className={styles.bar}
				role='progressbar'
				aria-label={progressLabel}
				aria-valuemin={0}
				aria-valuemax={100}
				aria-valuenow={Math.round(progress.ratio * 100)}
				aria-valuetext={valueText}
				data-completed={completed || undefined}
			>
				<i style={{ width: `${progress.ratio * 100}%` }} />
			</span>
			<span className={styles.value}>
				{valueTexts.map((condition) => <span key={condition}>{condition}</span>)}
			</span>
		</span>
	);
}

function GoalSummary({ summaries }: GoalSummaryProps) {
	const { t } = useTranslation();
	return <div className={styles.list}>{summaries.map((summary) => {
		const longTerm = summary.longTermGoal;
		const stage = summary.stageGoal;
		const hasGoal = Boolean(longTerm || stage);
		const stageValueTexts = stage
			? stage.mode === 'activeDays'
				? [activeDaysProgressText(stage.progress, stage.targetActiveDays, t)]
				: stage.mode === 'both'
					? [
						quantityProgressText(
							summary,
							stage.progress,
							stage.targetQuantityBase,
							t,
						),
						activeDaysProgressText(
							stage.progress,
							stage.targetActiveDays,
							t,
						),
					]
					: [quantityProgressText(
						summary,
						stage.progress,
						stage.targetQuantityBase,
						t,
					)]
			: [];
		return <Link className={styles.card} to={APP_ROUTES.goalDetails(summary.userCardId)} key={summary.userCardId}>
			<span className={styles.heading}>
				<span className={styles.icon}><PiTarget aria-hidden='true' /></span>
				<strong>{summary.cardTitle}</strong>
				<PiCaretRight aria-hidden='true' />
			</span>
			{hasGoal ? (
				<span
					className={styles.goalDetails}
					role='group'
					aria-label={summary.cardTitle}
				>
					{stage && (
						<GoalProgressRow
							kind='stage'
							title={stage.title}
							status={stage.status}
							progress={stage.progress}
							valueTexts={stageValueTexts}
							t={t}
						/>
					)}
					{longTerm && (
						<GoalProgressRow
							kind='longTerm'
							title={longTerm.title}
							status={longTerm.status}
							progress={longTerm.progress}
							valueTexts={[
								quantityProgressText(
									summary,
									longTerm.progress,
									longTerm.targetQuantityBase,
									t,
								),
							]}
							t={t}
						/>
					)}
				</span>
			) : <small className={styles.noGoal}>{t('shell.home.noGoalForCard')}</small>}
		</Link>;
	})}</div>;
}

export { GoalSummary };
export type { GoalSummaryProps };
