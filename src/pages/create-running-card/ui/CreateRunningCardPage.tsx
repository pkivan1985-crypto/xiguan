/* eslint-disable i18next/no-literal-string -- Preset IDs are stable domain identifiers. */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
	FiActivity,
	FiBookOpen,
	FiCheck,
	FiChevronLeft,
	FiDroplet,
	FiFlag,
	FiMoon,
	FiPlus,
	FiShield,
	FiTarget,
	FiTrash2,
	FiX,
} from 'react-icons/fi';
import type { IconType } from 'react-icons';
import { useNavigate } from 'react-router';

import { createHabitInApp } from '@features/create-habit';
import { APP_ROUTES } from '@shared/config';
import { formatLocalDate } from '@shared/lib/date';

import styles from './CreateRunningCardPage.module.css';

const PRESETS = [
	{ id: 'running', icon: FiActivity, labelKey: 'shell.createCard.presets.running', unitKey: 'shell.createCard.units.distance', accent: 'green' },
	{ id: 'water', icon: FiDroplet, labelKey: 'shell.createCard.presets.water', unitKey: 'shell.createCard.units.count', accent: 'cyan' },
	{ id: 'reading-time', icon: FiBookOpen, labelKey: 'shell.createCard.presets.reading', unitKey: 'shell.createCard.units.duration', accent: 'amber' },
	{ id: 'sleep', icon: FiMoon, labelKey: 'shell.createCard.presets.sleep', unitKey: 'shell.createCard.units.check', accent: 'violet' },
	{ id: 'screen-free', icon: FiShield, labelKey: 'shell.createCard.presets.screenFree', unitKey: 'shell.createCard.units.avoid', accent: 'blue' },
] as const satisfies readonly {
	id: string;
	icon: IconType;
	labelKey: string;
	unitKey: string;
	accent: string;
}[];

function CreateRunningCardPage() {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const [templateId, setTemplateId] = useState('running');
	const [cardTitle, setCardTitle] = useState('');
	const [longTitle, setLongTitle] = useState('');
	const [longTarget, setLongTarget] = useState('');
	const [stages, setStages] = useState([{ key: crypto.randomUUID(), title: '', target: '' }]);
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string>();
	const selected = PRESETS.find((preset) => preset.id === templateId)!;

	async function submit(): Promise<void> {
		if (!cardTitle.trim() || submitting) {
			if (!cardTitle.trim()) setError(t('shell.createCard.nameRequired'));
			return;
		}
		const longStarted = Boolean(longTitle.trim() || longTarget.trim());
		const hasLong = Boolean(longTitle.trim() && longTarget.trim());
		const stageStarted = stages.some(({ title, target }) => title.trim() || target.trim());
		const completeStages = stages.filter(({ title, target }) => title.trim() && target.trim());
		const hasIncompleteStage = stages.some(({ title, target }) => Boolean(title.trim()) !== Boolean(target.trim()));
		if ((longStarted && !hasLong) || hasIncompleteStage || (stageStarted && !hasLong)) {
			setError(t(stageStarted && !hasLong ? 'shell.createCard.stageNeedsLongTerm' : 'shell.createCard.incompletePlan'));
			return;
		}
		setSubmitting(true);
		setError(undefined);
		try {
			await createHabitInApp({
				templateId,
				cardTitle,
				startDate: formatLocalDate(new Date()),
				longTerm: hasLong ? { title: longTitle, targetDisplay: longTarget } : undefined,
				stages: completeStages.map(({ title, target }) => ({ title, targetDisplay: target })),
				nowIso: new Date().toISOString(),
				ids: {
					userCardId: crypto.randomUUID(),
					longTermGoalId: crypto.randomUUID(),
					stageGoalId: crypto.randomUUID(),
					stageGoalIds: completeStages.map(() => crypto.randomUUID()),
				},
			});
			navigate(APP_ROUTES.DECK, { replace: true, state: { created: true } });
		} catch {
			setError(t('shell.createCard.saveError'));
		} finally {
			setSubmitting(false);
		}
	}

	return (
		<main className={styles.page}>
			<header className={styles.header}>
				<button type='button' onClick={() => navigate(APP_ROUTES.DECK)} aria-label={t('shell.createCard.back')}><FiChevronLeft aria-hidden='true' /></button>
				<h1>{t('shell.createCard.newHabit')}</h1>
				<button type='button' onClick={() => navigate(APP_ROUTES.DECK)} aria-label={t('shell.createCard.close')}><FiX aria-hidden='true' /></button>
			</header>

			<section className={styles.content}>
				<div className={styles.intro}><span><FiTarget aria-hidden='true' /></span><div><strong>{t('shell.createCard.chooseType')}</strong><small>{t('shell.createCard.chooseTypeHint')}</small></div></div>
				<div className={styles.presets}>
					{PRESETS.map(({ id, icon: Icon, labelKey, unitKey, accent }) => (
						<button
							type='button'
							key={id}
							className={`${styles.preset} ${styles[accent]} ${id === templateId ? styles.selected : ''}`}
							aria-pressed={id === templateId}
							onClick={() => { setTemplateId(id); setError(undefined); }}
						>
							<span><Icon aria-hidden='true' /></span>
							<strong>{t(labelKey)}</strong>
							<small>{t(unitKey)}</small>
						</button>
					))}
				</div>

				<label className={styles.nameField}>
					<span><FiFlag aria-hidden='true' />{t('shell.createCard.habitName')}</span>
					<input
						value={cardTitle}
						maxLength={40}
						placeholder={t(`shell.createCard.placeholders.${selected.id}`)}
						onChange={(event) => { setCardTitle(event.target.value); setError(undefined); }}
					/>
				</label>

				<section className={styles.planSection}>
					<header><span><FiFlag aria-hidden='true' /></span><div><strong>{t('shell.createCard.stage')}</strong><small>{t('shell.createCard.stageHint')}</small></div></header>
					<div className={styles.stageList}>
						{stages.map((stage, index) => (
							<div className={styles.stageFields} key={stage.key}>
								<span className={styles.stageMeta}>
									<b>{t('shell.createCard.stageNumber', { number: index + 1 })}</b>
									<small>{t(index === 0 ? 'shell.goalDetails.status.active' : 'shell.goalDetails.status.planned')}</small>
								</span>
								<input
									value={stage.title}
									placeholder={t('shell.createCard.planName')}
									onChange={(event) => setStages((current) => current.map((item) => item.key === stage.key ? { ...item, title: event.target.value } : item))}
								/>
								<input
									type='number'
									min='1'
									inputMode='decimal'
									value={stage.target}
									placeholder={t('shell.createCard.planTarget')}
									onChange={(event) => setStages((current) => current.map((item) => item.key === stage.key ? { ...item, target: event.target.value } : item))}
								/>
								{stages.length > 1 && <button type='button' className={styles.removeStage} aria-label={t('shell.createCard.removeStage', { number: index + 1 })} onClick={() => setStages((current) => current.filter((item) => item.key !== stage.key))}><FiTrash2 aria-hidden='true' /></button>}
							</div>
						))}
					</div>
					<button type='button' className={styles.addStage} onClick={() => setStages((current) => [...current, { key: crypto.randomUUID(), title: '', target: '' }])}><FiPlus aria-hidden='true' />{t('shell.createCard.addStage')}</button>
				</section>

				<section className={styles.planSection}>
					<header><span><FiTarget aria-hidden='true' /></span><div><strong>{t('shell.createCard.longTerm')}</strong><small>{t('shell.createCard.longTermHint')}</small></div></header>
					<div className={styles.longFields}>
						<input value={longTitle} placeholder={t('shell.createCard.planName')} onChange={(event) => setLongTitle(event.target.value)} />
						<input type='number' min='1' inputMode='decimal' value={longTarget} placeholder={t('shell.createCard.planTarget')} onChange={(event) => setLongTarget(event.target.value)} />
					</div>
				</section>
				{error && <p className={styles.error} role='alert'>{error}</p>}
			</section>

			<footer className={styles.actions}>
				<button type='button' className={styles.secondary} onClick={() => navigate(APP_ROUTES.DECK)}>{t('shell.createCard.cancel')}</button>
				<button type='button' className={styles.primary} disabled={submitting} onClick={() => { void submit(); }}><FiCheck aria-hidden='true' />{t('shell.createCard.createHabit')}</button>
			</footer>
		</main>
	);
}

export { CreateRunningCardPage };
