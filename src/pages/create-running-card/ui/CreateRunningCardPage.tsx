/* eslint-disable i18next/no-literal-string -- Form field keys and fallback error codes are implementation identifiers. */
import styles from './CreateRunningCardPage.module.css';
import { useReducer, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FiArrowRight, FiCalendar, FiCheck, FiChevronLeft, FiFlag, FiTarget, FiX } from 'react-icons/fi';
import { useNavigate } from 'react-router';
import { createRunningCardInApp } from '@features/create-running-card';
import { APP_ROUTES } from '@shared/config';
import { formatLocalDate } from '@shared/lib/date';
import { createInitialFormState, formReducer, type FormField, validateCurrentStep } from '../model/createRunningCardForm';

const STEP_KEYS = ['card', 'longTerm', 'stage', 'review'] as const;

function CreateRunningCardPage() {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const [state, dispatch] = useReducer(formReducer, formatLocalDate(new Date()), createInitialFormState);
	const [invalidField, setInvalidField] = useState<FormField | null>(null);
	const stepKey = STEP_KEYS[state.step]!;
	const update = (field: FormField, value: string) => { setInvalidField(null); dispatch({ type: 'update', field, value }); };
	const close = () => navigate(APP_ROUTES.DECK);
	const back = () => state.step === 0 ? close() : dispatch({ type: 'back' });
	const next = () => {
		const invalid = validateCurrentStep(state);
		if (invalid) return setInvalidField(invalid);
		dispatch({ type: 'next' });
	};
	const submit = async () => {
		if (state.status === 'submitting') return;
		dispatch({ type: 'submit' });
		try {
			await createRunningCardInApp({
				...state.values,
				endDate: state.values.endDate || undefined,
				nowIso: new Date().toISOString(),
				ids: { userCardId: crypto.randomUUID(), longTermGoalId: crypto.randomUUID(), stageGoalId: crypto.randomUUID() },
			});
			navigate(APP_ROUTES.DECK, { replace: true, state: { created: true } });
		} catch (error) {
			dispatch({ type: 'error', errorCode: error instanceof Error ? error.message : 'SAVE_FAILED' });
		}
	};
	const fieldError = (field: FormField) => invalidField === field ? <small className={styles.error}>{t('shell.createCard.required')}</small> : null;

	return (
		<main className={styles.page}>
			<header className={styles.header}>
				<button type='button' onClick={back} aria-label={t('shell.createCard.back')}><FiChevronLeft aria-hidden='true' /></button>
				<h1>{t('shell.createCard.title')}</h1>
				<button type='button' onClick={close} aria-label={t('shell.createCard.close')}><FiX aria-hidden='true' /></button>
			</header>
			<div className={styles.progress} aria-label={t('shell.createCard.progress', { current: state.step + 1 })}>
				{STEP_KEYS.map((key, index) => <i key={key} className={index <= state.step ? styles.active : ''} />)}
			</div>
			<section className={styles.content}>
				<p className={styles.step}><FiTarget aria-hidden='true' />{t('shell.createCard.step', { current: state.step + 1 })}</p>
				<h2>{t(`shell.createCard.steps.${stepKey}.title`)}</h2>
				<p className={styles.description}>{t(`shell.createCard.steps.${stepKey}.description`)}</p>

				{state.step === 0 && <div className={styles.fields}>
					<div className={styles.template}><FiTarget aria-hidden='true' /><div><small>{t('shell.createCard.template')}</small><strong>{t('shell.createCard.running')}</strong></div></div>
					<label><span><FiFlag aria-hidden='true' />{t('shell.createCard.cardTitle')}</span><input value={state.values.cardTitle} onChange={(event) => update('cardTitle', event.target.value)} autoFocus />{fieldError('cardTitle')}</label>
				</div>}
				{state.step === 1 && <div className={styles.fields}>
					<label><span><FiFlag aria-hidden='true' />{t('shell.createCard.longTitle')}</span><input value={state.values.longTermTitle} onChange={(event) => update('longTermTitle', event.target.value)} autoFocus />{fieldError('longTermTitle')}</label>
					<label><span><FiTarget aria-hidden='true' />{t('shell.createCard.targetKm')}</span><input type='number' inputMode='decimal' value={state.values.longTermTargetDisplay} onChange={(event) => update('longTermTargetDisplay', event.target.value)} />{fieldError('longTermTargetDisplay')}</label>
					<label><span><FiCalendar aria-hidden='true' />{t('shell.createCard.startDate')}</span><input type='date' value={state.values.startDate} onChange={(event) => update('startDate', event.target.value)} /></label>
					<label><span><FiCalendar aria-hidden='true' />{t('shell.createCard.endDate')}</span><input type='date' value={state.values.endDate} min={state.values.startDate} onChange={(event) => update('endDate', event.target.value)} />{fieldError('endDate')}</label>
				</div>}
				{state.step === 2 && <div className={styles.fields}>
					<label><span><FiFlag aria-hidden='true' />{t('shell.createCard.stageTitle')}</span><input value={state.values.stageTitle} onChange={(event) => update('stageTitle', event.target.value)} autoFocus />{fieldError('stageTitle')}</label>
					<label><span><FiTarget aria-hidden='true' />{t('shell.createCard.stageKm')}</span><input type='number' inputMode='decimal' value={state.values.stageTargetDisplay} onChange={(event) => update('stageTargetDisplay', event.target.value)} />{fieldError('stageTargetDisplay')}</label>
				</div>}
				{state.step === 3 && <div className={styles.review}>
					<div><small>{t('shell.createCard.card')}</small><strong>{state.values.cardTitle}</strong><span>{t('shell.createCard.running')}</span></div>
					<div><small>{t('shell.createCard.longTerm')}</small><strong>{state.values.longTermTitle}</strong><span>{t('shell.createCard.kmValue', { value: state.values.longTermTargetDisplay })}</span></div>
					<div><small>{t('shell.createCard.stage')}</small><strong>{state.values.stageTitle}</strong><span>{t('shell.createCard.kmValue', { value: state.values.stageTargetDisplay })}</span></div>
					<p><FiCheck aria-hidden='true' />{t('shell.createCard.atomicNote')}</p>
				</div>}
				{state.status === 'error' && <p className={styles.saveError}>{t('shell.createCard.saveError')}</p>}
			</section>
			<footer className={styles.actions}>
				<button type='button' className={styles.secondary} onClick={back}><FiChevronLeft aria-hidden='true' />{state.step === 0 ? t('shell.createCard.cancel') : t('shell.createCard.previous')}</button>
				<button type='button' className={styles.primary} disabled={state.status === 'submitting'} onClick={state.step === 3 ? submit : next}>{state.step === 3 ? <><FiCheck aria-hidden='true' />{t('shell.createCard.create')}</> : <>{t('shell.createCard.continue')}<FiArrowRight aria-hidden='true' /></>}</button>
			</footer>
		</main>
	);
}

export { CreateRunningCardPage };
