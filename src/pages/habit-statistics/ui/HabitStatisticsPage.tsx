/* eslint-disable i18next/no-literal-string -- Stable metadata separators and view option values are not user-facing prose. */
import styles from './HabitStatisticsPage.module.css';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router';
import { FiArrowLeft, FiCalendar, FiCheckCircle, FiClock, FiFlag, FiPlus, FiTarget } from 'react-icons/fi';
import { PiArticle, PiBroadcast, PiMicrophone, PiPlus, PiVideoCamera } from 'react-icons/pi';
import { formatQuantityFromBase } from '@entities/card-template';
import { addStageGoalInApp } from '@features/add-stage-goal';
import { loadGoalDetailsInApp } from '@features/load-goal-details';
import type { GoalDetailsModel, GoalDetailsStageGoal } from '@features/load-goal-details';
import { APP_ROUTES } from '@shared/config';
import { formatLocalDate } from '@shared/lib/date';
import { HabitGlyph } from '@widgets/habit-glyph';

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

function stageTarget(model: GoalDetailsModel, stage: GoalDetailsStageGoal, activeDaysText: string): string {
	if (stage.mode === 'activeDays') return activeDaysText;
	return `${quantity(model, stage.progress.quantityBaseValue)} / ${quantity(model, stage.targetQuantityBase ?? 0)} ${model.card.displayUnit}`;
}

function GoalDetailsPage() {
	const { t } = useTranslation();
	const { userCardId } = useParams();
	const [model, setModel] = useState<GoalDetailsModel | null>(null);
	const [error, setError] = useState(false);
	const [showStageForm, setShowStageForm] = useState(false);
	const [stageTitle, setStageTitle] = useState('');
	const [stageTargetValue, setStageTargetValue] = useState('');
	const [stageSaving, setStageSaving] = useState(false);
	const [stageError, setStageError] = useState(false);

	useEffect(() => {
		let active = true;
		if (!userCardId) return () => { active = false; };
		void loadGoalDetailsInApp(userCardId).then((next) => { if (active) setModel(next); }).catch(() => { if (active) setError(true); });
		return () => { active = false; };
	}, [userCardId]);

	async function addStage(): Promise<void> {
		if (!userCardId || !model?.longTermGoal || !stageTitle.trim() || !stageTargetValue.trim() || stageSaving) {
			setStageError(true);
			return;
		}
		setStageSaving(true);
		setStageError(false);
		try {
			await addStageGoalInApp({
				id: crypto.randomUUID(),
				userCardId,
				longTermGoalId: model.longTermGoal.id,
				title: stageTitle,
				targetDisplay: stageTargetValue,
				startDate: formatLocalDate(new Date()),
				nowIso: new Date().toISOString(),
			});
			setModel(await loadGoalDetailsInApp(userCardId));
			setStageTitle('');
			setStageTargetValue('');
			setShowStageForm(false);
		} catch {
			setStageError(true);
		} finally {
			setStageSaving(false);
		}
	}

	if (!userCardId || error) return <section className={styles.state}><h2>{t('shell.goalDetails.notFound')}</h2><Link to={APP_ROUTES.DECK}>{t('shell.goalDetails.backToDeck')}</Link></section>;
	if (!model) return <section className={styles.state}><p>{t('shell.goalDetails.loading')}</p></section>;
	if (model.card.officialCardId === 'media-output') {
		const currentMonth = formatLocalDate(new Date()).slice(0, 7);
		const published = model.mediaEntries.filter(({ status }) => status === 'published');
		const monthPublished = published.filter(({ localDate }) => localDate.startsWith(currentMonth));
		const typeIcons = { article: PiArticle, 'short-video': PiVideoCamera, audio: PiMicrophone, livestream: PiBroadcast } as const;
		const typeCounts = (Object.keys(typeIcons) as Array<keyof typeof typeIcons>).map((type) => ({ type, count: monthPublished.filter((entry) => entry.type === type).length, Icon: typeIcons[type] }));
		const target = model.longTermGoal?.targetQuantityBase ?? 0;
		const ratio = target ? Math.min(1, published.length / target) : 0;
		return <div className={`${styles.page} ${styles.mediaProgressPage}`}>
			<header className={styles.mediaProgressHeader}><Link to={APP_ROUTES.DECK} aria-label={t('shell.goalDetails.backToDeck')}><FiArrowLeft /></Link><h2>{t('shell.goalDetails.media.title')}</h2><span /></header>
			<section className={styles.mediaProgressIdentity}><HabitGlyph iconKey={model.card.iconKey} accent={model.card.accent} label={model.card.title} decorative size='lg' /><div><strong>{model.card.title}</strong><small>{t('shell.goalDetails.media.subtitle')}</small></div></section>
			<section className={styles.mediaProgressSummary}><h3>{t('shell.goalDetails.media.monthPublished', { current: monthPublished.length })}</h3><span><i style={{ width: `${ratio * 100}%` }} /></span><p>{t('shell.goalDetails.media.totalPublished', { current: published.length, target })}</p></section>
			<section className={styles.mediaTypeSummary}><h3>{t('shell.goalDetails.media.monthTypes')}</h3><div>{typeCounts.map(({ type, count, Icon }) => <span key={type}><Icon /><small>{t(`shell.record.media.types.${type}`)}</small><strong>{count}</strong></span>)}</div></section>
			<section className={styles.mediaRecent}><h3>{t('shell.goalDetails.media.recent')}</h3>{model.mediaEntries.slice(0, 5).map((entry) => { const Icon = typeIcons[entry.type]; return <Link key={`${entry.localDate}-${entry.id}`} to={`${APP_ROUTES.habitRecord(model.card.id, entry.localDate)}&entry=${encodeURIComponent(entry.id)}`}><Icon /><span><strong>{entry.title}</strong><small>{entry.localDate} · {entry.platform || t(`shell.record.media.types.${entry.type}`)} · {t(`shell.record.media.statuses.${entry.status}`)}</small></span><b>{entry.views ?? '—'}</b></Link>; })}{model.mediaEntries.length === 0 && <p>{t('shell.goalDetails.noRecords')}</p>}</section>
			<Link className={styles.mediaRecordAction} to={`${APP_ROUTES.habitRecord(model.card.id, formatLocalDate(new Date()))}&entry=new`}><PiPlus />{t('shell.record.media.addEntry')}</Link>
		</div>;
	}

	return <div className={styles.page}>
		<header className={styles.pageHeader}><Link to={APP_ROUTES.HOME} aria-label={t('shell.goalDetails.backHome')}><FiArrowLeft aria-hidden='true' /></Link><span><small>{t('shell.goalDetails.title')}</small><h2>{model.card.title}</h2></span><b>{model.card.displayUnit}</b></header>
		{model.stageGoal && <section className={styles.stageCard}>
			<header><span className={styles.goalType}><FiFlag aria-hidden='true' />{t('shell.goalDetails.currentStage')}</span><b className={styles.statusTag}>{t(MODE_KEYS[model.stageGoal.mode])}</b></header>
			<h3>{model.stageGoal.title}</h3>
			<div className={styles.stageFacts}><span className={styles.stageFact}><strong>{quantity(model, model.stageGoal.progress.quantityBaseValue)} {model.card.displayUnit}</strong><small>{t('shell.goalDetails.quantityFact')}</small></span><span className={styles.stageFact}><strong>{model.stageGoal.progress.activeDays}</strong><small>{t('shell.goalDetails.activeDaysFact')}</small></span><b className={styles.stagePercent}>{Math.round(model.stageGoal.progress.ratio * 100)}%</b></div>
		</section>}
		{model.longTermGoal && <section className={styles.stageRoute}>
			<header className={styles.sectionTitle}><span><h3>{t('shell.goalDetails.stageRoute')}</h3><small>{t('shell.goalDetails.stageCount', { count: model.stageGoals.length })}</small></span>{model.longTermGoal.status === 'active' && <button type='button' onClick={() => { setShowStageForm((value) => !value); setStageError(false); }}><FiPlus aria-hidden='true' />{t('shell.goalDetails.addStage')}</button>}</header>
			{showStageForm && <div className={styles.stageForm}>
				<input value={stageTitle} placeholder={t('shell.createCard.planName')} onChange={(event) => { setStageTitle(event.target.value); setStageError(false); }} />
				<input type='number' min='1' inputMode='decimal' value={stageTargetValue} placeholder={t('shell.createCard.planTarget')} onChange={(event) => { setStageTargetValue(event.target.value); setStageError(false); }} />
				<button type='button' disabled={stageSaving} onClick={() => { void addStage(); }}>{t('shell.goalDetails.saveStage')}</button>
				{stageError && <small role='alert'>{t('shell.goalDetails.stageSaveError')}</small>}
			</div>}
			<div className={styles.stageRouteList}>{model.stageGoals.map((stage, index) => <article data-status={stage.status} key={stage.id}>
				<span className={styles.stageRouteIcon}>{stage.status === 'completed' ? <FiCheckCircle aria-hidden='true' /> : stage.status === 'active' ? <FiFlag aria-hidden='true' /> : <FiClock aria-hidden='true' />}</span>
				<span><small>{t('shell.createCard.stageNumber', { number: index + 1 })}</small><strong>{stage.title}</strong></span>
				<span className={styles.stageRouteValue}><b>{stageTarget(model, stage, String(t('shell.progress.activeDaysProgress', { current: stage.progress.activeDays, target: stage.targetActiveDays })))}</b><small>{t(STATUS_KEYS[stage.status])}</small></span>
			</article>)}</div>
		</section>}
		{model.longTermGoal && <section className={styles.goalCard}>
			<header><span className={styles.goalType}><FiTarget aria-hidden='true' />{t('shell.goalDetails.longTerm')}</span><b className={styles.statusTag}>{t(STATUS_KEYS[model.longTermGoal.status])}</b></header>
			<h3>{model.longTermGoal.title}</h3>
			<div className={styles.metric}><strong>{quantity(model, model.longTermGoal.progress.quantityBaseValue)}</strong><span className={styles.metricTarget}>/ {quantity(model, model.longTermGoal.targetQuantityBase)} {model.card.displayUnit}</span></div>
			<span className={styles.bar}><i style={{ width: `${model.longTermGoal.progress.ratio * 100}%` }} /></span>
			<footer><span>{Math.round(model.longTermGoal.progress.ratio * 100)}%</span><span>{model.longTermGoal.endDate ?? t('shell.goalDetails.noDeadline')}</span></footer>
			{model.longTermGoal.completionSnapshot && <p className={styles.snapshot}>{t('shell.goalDetails.completedAt', { date: model.longTermGoal.completionSnapshot.completedAt })}</p>}
		</section>}
		<section className={styles.facts}><span className={styles.summaryFact}><strong>{model.longTermGoal ? quantity(model, model.longTermGoal.progress.quantityBaseValue) : '0'} {model.card.displayUnit}</strong><small>{t('shell.goalDetails.totalOutcome')}</small></span><span className={styles.summaryFact}><strong>{model.activeDays}</strong><small>{t('shell.goalDetails.activeDays')}</small></span></section>
		<header className={styles.sectionTitle}><h3>{t('shell.goalDetails.recent')}</h3><Link to={APP_ROUTES.HISTORY}>{t('shell.goalDetails.allHistory')}</Link></header>
		<div className={styles.records}>{model.recentRecords.length > 0 ? model.recentRecords.map((record) => <article key={record.id}><span><FiCalendar aria-hidden='true' /><b>{record.localDate}</b></span><strong>{record.displayValue} {record.displayUnit}</strong></article>) : <p>{t('shell.goalDetails.noRecords')}</p>}</div>
	</div>;
}

export { GoalDetailsPage };
