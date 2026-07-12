/* eslint-disable i18next/no-literal-string -- Screen discriminants and domain error codes are not user-facing copy. */
import { useCallback, useEffect, useState } from 'react';
import { FiAlertCircle, FiCheckCircle, FiPlay, FiRotateCcw } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';

import { useSettingsStore } from '@entities/settings';
import type { OutcomeBatch } from '@entities/outcome-batch';
import { assignTodayCard, removeTodayCard, swapTodaySlots, updateTodayValue } from '@entities/today-draft';
import { loadTodayOutcomeForDate, type TodayOutcomeView } from '@features/load-today-outcome';
import { advanceOutcomePlaybackInApp, beginOutcomePlaybackInApp, completeOutcomePlaybackInApp } from '@features/manage-outcome-playback';
import { updateTodayDraftInApp } from '@features/manage-today-draft';
import { saveTodayOutcomeInApp } from '@features/save-today-outcome';
import { formatLocalDate } from '@shared/lib/date';
import { useSystemMotion } from '@shared/lib/react';
import { OutcomePlayback } from '@widgets/outcome-playback';
import { OutcomeSummary } from '@widgets/outcome-summary';
import { TodayCardPicker } from '@widgets/today-card-picker';
import { TodayOutcomeEditor } from '@widgets/today-outcome-editor';

import styles from './TodayPage.module.css';
import { todayErrorKey, type TodayErrorKey } from '../model/todayPage';

type TodayScreen =
	| { kind: 'loading' }
	| { kind: 'editing'; view: TodayOutcomeView }
	| { kind: 'submitting'; view: TodayOutcomeView; submissionId: string }
	| { kind: 'confirmingLimit'; view: TodayOutcomeView; submissionId: string }
	| { kind: 'error'; view?: TodayOutcomeView; messageKey: TodayErrorKey; submissionId?: string }
	| { kind: 'playback'; batch: OutcomeBatch }
	| { kind: 'summary'; batch: OutcomeBatch };

function TodayPage() {
	const { t } = useTranslation();
	const [localDate] = useState(() => formatLocalDate(new Date()));
	const [screen, setScreen] = useState<TodayScreen>({ kind: 'loading' });
	const [pickerOpen, setPickerOpen] = useState(false);
	const [editPending, setEditPending] = useState(false);
	const systemReducedMotion = useSystemMotion();
	const animationsEnabled = useSettingsStore((state) => state.settings.isAnimationsEnabled);
	const reducedMotion = systemReducedMotion || !animationsEnabled;

	const load = useCallback(async () => loadTodayOutcomeForDate(localDate, new Date().toISOString()), [localDate]);

	useEffect(() => {
		let active = true;
		load().then((view) => { if (active) setScreen({ kind: 'editing', view }); })
			.catch((error) => { if (active) setScreen({ kind: 'error', messageKey: todayErrorKey(error) }); });
		return () => { active = false; };
	}, [load]);

	const activeView = screen.kind === 'editing' || screen.kind === 'submitting' || screen.kind === 'confirmingLimit' || screen.kind === 'error'
		? screen.view
		: undefined;

	async function mutateDraft(update: Parameters<typeof updateTodayDraftInApp>[1]): Promise<void> {
		if (!activeView || editPending) return;
		setEditPending(true);
		try {
			await updateTodayDraftInApp(localDate, update);
			setScreen({ kind: 'editing', view: await load() });
		} catch (error) {
			setScreen({ kind: 'error', view: activeView, messageKey: todayErrorKey(error) });
		} finally {
			setEditPending(false);
		}
	}

	async function performSave(view: TodayOutcomeView, submissionId: string, confirmedOverLimit = false): Promise<void> {
		setScreen({ kind: 'submitting', view, submissionId });
		try {
			const batch = await saveTodayOutcomeInApp({
				localDate,
				currentLocalDate: formatLocalDate(new Date()),
				nowIso: new Date().toISOString(),
				submissionId,
				confirmedOverLimit,
			});
			setScreen({ kind: 'playback', batch: await beginOutcomePlaybackInApp(batch.id, new Date().toISOString()) });
		} catch (error) {
			if (error instanceof Error && error.message === 'QUANTITY_CONFIRMATION_REQUIRED') {
				setScreen({ kind: 'confirmingLimit', view, submissionId });
				return;
			}
			setScreen({ kind: 'error', view, messageKey: todayErrorKey(error), submissionId });
		}
	}

	async function resumeBatch(batch: OutcomeBatch): Promise<void> {
		try {
			setScreen({ kind: 'playback', batch: await beginOutcomePlaybackInApp(batch.id, new Date().toISOString()) });
		} catch (error) {
			setScreen({ kind: 'error', view: activeView, messageKey: todayErrorKey(error) });
		}
	}

	async function showSummary(batch: OutcomeBatch): Promise<void> {
		try {
			setScreen({ kind: 'summary', batch: await completeOutcomePlaybackInApp(batch.id, new Date().toISOString()) });
		} catch (error) {
			setScreen({ kind: 'error', view: activeView, messageKey: todayErrorKey(error) });
		}
	}

	async function advancePlayback(batch: OutcomeBatch): Promise<void> {
		try {
			const next = await advanceOutcomePlaybackInApp(batch.id, new Date().toISOString());
			setScreen(next.status === 'completed' ? { kind: 'summary', batch: next } : { kind: 'playback', batch: next });
		} catch (error) {
			setScreen({ kind: 'error', messageKey: todayErrorKey(error) });
		}
	}

	if (screen.kind === 'loading') return <p className={styles.loading}>{t('shell.today.loading')}</p>;
	if (screen.kind === 'playback') return <OutcomePlayback batch={screen.batch} reducedMotion={reducedMotion} onNext={() => { void advancePlayback(screen.batch); }} onSummary={() => { void showSummary(screen.batch); }} />;
	if (screen.kind === 'summary') return <OutcomeSummary batch={screen.batch} onBack={() => { setScreen({ kind: 'loading' }); void load().then((view) => setScreen({ kind: 'editing', view })).catch((error) => setScreen({ kind: 'error', messageKey: todayErrorKey(error) })); }} />;

	if (!activeView) {
		const messageKey = screen.kind === 'error' ? screen.messageKey : 'shell.today.submitError';
		return <div className={styles.failure}><FiAlertCircle /><p>{t(messageKey)}</p><button type='button' onClick={() => { setScreen({ kind: 'loading' }); void load().then((view) => setScreen({ kind: 'editing', view })).catch((error) => setScreen({ kind: 'error', messageKey: todayErrorKey(error) })); }}><FiRotateCcw />{t('shell.today.retry')}</button></div>;
	}

	return <div className={styles.page}>
		{activeView.recoverableBatch && screen.kind === 'editing' && <aside className={styles.recovery}><FiPlay /><div><strong>{t('shell.today.resumeTitle')}</strong><p>{t('shell.today.resumeDescription')}</p></div><div><button type='button' onClick={() => { void resumeBatch(activeView.recoverableBatch!); }}>{t('shell.today.resume')}</button><button type='button' onClick={() => { void showSummary(activeView.recoverableBatch!); }}>{t('shell.today.viewSummary')}</button></div></aside>}
		{screen.kind === 'error' && <div className={styles.alert} role='alert'><FiAlertCircle /><span>{t(screen.messageKey)}</span><button type='button' onClick={() => screen.submissionId ? void performSave(activeView, screen.submissionId) : setScreen({ kind: 'editing', view: activeView })}>{t('shell.today.retry')}</button></div>}
		<TodayOutcomeEditor
			view={activeView}
			disabled={editPending || screen.kind === 'submitting' || screen.kind === 'confirmingLimit'}
			onValueChange={(slotIndex, valueText) => { void mutateDraft((draft) => updateTodayValue(draft, slotIndex, valueText, new Date().toISOString())); }}
			onMove={(slotIndex, direction) => { void mutateDraft((draft) => swapTodaySlots(draft, slotIndex, slotIndex + direction, new Date().toISOString())); }}
			onRemove={(slotIndex) => { void mutateDraft((draft) => removeTodayCard(draft, slotIndex, new Date().toISOString())); }}
			onOpenPicker={() => setPickerOpen(true)}
			onSubmit={() => { void performSave(activeView, crypto.randomUUID()); }}
		/>
		{screen.kind === 'submitting' && <div className={styles.status}><FiCheckCircle />{t('shell.today.submitting')}</div>}
		{screen.kind === 'confirmingLimit' && <div className={styles.confirm} role='alertdialog' aria-label={t('shell.today.confirmLimitTitle')}><div><FiAlertCircle /><strong>{t('shell.today.confirmLimitTitle')}</strong><p>{t('shell.today.confirmLimitDescription')}</p></div><div><button type='button' onClick={() => setScreen({ kind: 'editing', view: activeView })}>{t('common.cancel')}</button><button type='button' onClick={() => { void performSave(activeView, screen.submissionId, true); }}>{t('shell.today.confirmAndSave')}</button></div></div>}
		<TodayCardPicker open={pickerOpen} cards={activeView.availableCards} onClose={() => setPickerOpen(false)} onSelect={(userCardId) => {
			const emptySlot = activeView.draft.slots.find(({ userCardId: assigned }) => !assigned);
			setPickerOpen(false);
			if (emptySlot) void mutateDraft((draft) => assignTodayCard(draft, emptySlot.slotIndex, userCardId, new Date().toISOString()));
		}} />
	</div>;
}

export { TodayPage };
