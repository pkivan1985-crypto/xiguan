/* eslint-disable i18next/no-literal-string -- update/delete are domain operation identifiers. */
import styles from './ActionRecordEditor.module.css';
import { keepFocusInsideConfirmation, type FocusTarget } from './keepFocusInsideConfirmation';
import { type FormEvent, type KeyboardEvent as ReactKeyboardEvent, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FiActivity, FiClock, FiHeart, FiTrash2, FiX } from 'react-icons/fi';
import { parseQuantityToBase } from '@entities/card-template';
import type { HistoryRecordModel } from '@features/load-history';
import { SegmentedPaceInput } from '@shared/ui/segmented-pace-input/SegmentedPaceInput';

type ConfirmationKind = 'update' | 'delete';

export interface ActionRecordEditValue {
	valueText: string;
	durationSeconds?: number;
	averagePaceSecondsPerKm?: number;
	averageHeartRateBpm?: number;
	note?: string;
}

interface EditorConfirmationProps {
	kind: ConfirmationKind;
	busy: boolean;
	onConfirm: () => void;
	onCancel: () => void;
}

interface ActionRecordEditorProps {
	record: HistoryRecordModel;
	saving: boolean;
	error?: string;
	onSave: (value: ActionRecordEditValue) => void;
	onDelete: () => void;
	onClose: () => void;
}

function formatPace(seconds: number | undefined): string {
	if (!seconds) return '';
	return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

function parsePace(value: string): number | undefined {
	const match = /^(\d{1,2}):([0-5]\d)$/.exec(value.trim());
	if (!match) return undefined;
	const seconds = Number(match[1]) * 60 + Number(match[2]);
	return seconds > 0 ? seconds : undefined;
}

function EditorConfirmation({ kind, busy, onConfirm, onCancel }: EditorConfirmationProps) {
	const { t } = useTranslation();
	const isDelete = kind === 'delete';
	const cancelButtonRef = useRef<HTMLButtonElement>(null);
	const confirmButtonRef = useRef<HTMLButtonElement>(null);
	const trapFocus = (event: ReactKeyboardEvent<HTMLDivElement>) => keepFocusInsideConfirmation(
		event,
		document.activeElement as FocusTarget | null,
		cancelButtonRef.current,
		confirmButtonRef.current,
	);
	return <div className={styles.confirmation} role='alertdialog' aria-modal='true' aria-labelledby='record-confirmation-title' onKeyDown={trapFocus}>
		<h3 id='record-confirmation-title'>{t(isDelete ? 'shell.history.deleteConfirmationTitle' : 'shell.history.updateConfirmationTitle')}</h3>
		<p>{t('shell.history.recalculationImpact')}</p>
		<div className={styles.confirmationActions}>
			<button ref={cancelButtonRef} className={styles.secondary} type='button' onClick={onCancel} disabled={busy} autoFocus>{t('common.cancel')}</button>
			<button ref={confirmButtonRef} className={isDelete ? styles.danger : styles.primary} type='button' onClick={onConfirm} disabled={busy}>
				{t(isDelete ? 'shell.history.confirmDelete' : 'shell.history.confirmUpdate')}
			</button>
		</div>
	</div>;
}

function ActionRecordEditor({ record, saving, error, onSave, onDelete, onClose }: ActionRecordEditorProps) {
	const { t } = useTranslation();
	const [valueText, setValueText] = useState(record.displayValue);
	const [durationMinutes, setDurationMinutes] = useState(
		record.durationSeconds ? String(record.durationSeconds / 60) : '',
	);
	const [paceText, setPaceText] = useState(formatPace(record.averagePaceSecondsPerKm));
	const [heartRateText, setHeartRateText] = useState(
		record.averageHeartRateBpm ? String(record.averageHeartRateBpm) : '',
	);
	const [note, setNote] = useState(record.note ?? '');
	const [pendingValue, setPendingValue] = useState<ActionRecordEditValue>();
	const [invalid, setInvalid] = useState(false);
	const [confirmation, setConfirmation] = useState<ConfirmationKind | null>(null);
	const submit = (event: FormEvent) => {
		event.preventDefault();
		let quantityValid = true;
		try {
			parseQuantityToBase(valueText, {
				baseUnit: record.displayUnit,
				displayUnit: record.displayUnit,
				basePerDisplayUnit: record.basePerDisplayUnit,
				maxDecimalPlaces: record.maxDecimalPlaces,
				confirmationThresholdDisplay: record.confirmationThresholdDisplay,
			}, { confirmedOverLimit: true });
		} catch {
			quantityValid = false;
		}
		const durationSeconds = durationMinutes
			? Math.round(Number(durationMinutes) * 60)
			: undefined;
		const averagePaceSecondsPerKm = paceText ? parsePace(paceText) : undefined;
		const averageHeartRateBpm = heartRateText ? Number(heartRateText) : undefined;
		const valid = quantityValid
			&& (!durationSeconds || durationSeconds > 0)
			&& (!paceText || averagePaceSecondsPerKm !== undefined)
			&& (!averageHeartRateBpm || (
				Number.isSafeInteger(averageHeartRateBpm)
				&& averageHeartRateBpm >= 30
				&& averageHeartRateBpm <= 240
			));
		if (!valid) {
			setInvalid(true);
			return;
		}
		setPendingValue({
			valueText,
			durationSeconds,
			averagePaceSecondsPerKm,
			averageHeartRateBpm,
			note: note.trim() || undefined,
		});
		setConfirmation('update');
	};

	return <div className={styles.overlay}>
		<section className={styles.sheet} role={confirmation ? undefined : 'dialog'} aria-modal={confirmation ? undefined : 'true'} aria-labelledby={confirmation ? undefined : 'record-editor-title'}>
			{confirmation ? <EditorConfirmation
				kind={confirmation}
				busy={saving}
				onCancel={() => setConfirmation(null)}
				onConfirm={() => {
					if (confirmation === 'update') {
						if (pendingValue) onSave(pendingValue);
						return;
					}
					onDelete();
				}}
			/> : <>
				<span className={styles.grab} aria-hidden='true' />
				<header>
					<div>
						<h2 id='record-editor-title'>{t('shell.history.editorTitle')}</h2>
						<small>{record.localDate}</small>
					</div>
					<button className={styles.closeButton} type='button' onClick={onClose} disabled={saving} aria-label={t('common.close')}><FiX aria-hidden='true' /></button>
				</header>
				<form onSubmit={submit}>
					<label htmlFor='correct-record-value'>{record.cardTitle}</label>
					<div className={styles.inputRow}><input id='correct-record-value' autoFocus inputMode='decimal' value={valueText} onChange={(event) => { setValueText(event.target.value); setInvalid(false); }} disabled={saving} /><span>{record.displayUnit}</span></div>
					{record.supportsTrainingDetails && (
						<div className={styles.trainingFields}>
							<label>
								<FiClock aria-hidden='true' />
								<span>{t('shell.today.durationMinutes')}</span>
								<input
									type='number'
									inputMode='decimal'
									min='0.1'
									step='0.1'
									value={durationMinutes}
									onChange={(event) => { setDurationMinutes(event.target.value); setInvalid(false); }}
									placeholder={t('shell.today.optional')}
								/>
							</label>
							<SegmentedPaceInput
								className={styles.paceField}
								label={t('shell.today.averagePace')}
								value={paceText}
								onChange={(value) => { setPaceText(value); setInvalid(false); }}
								invalid={invalid && Boolean(paceText) && parsePace(paceText) === undefined}
								icon={<FiActivity aria-hidden='true' />}
							/>
							<label>
								<FiHeart aria-hidden='true' />
								<span>{t('shell.today.averageHeartRate')}</span>
								<input
									type='number'
									inputMode='numeric'
									min='30'
									max='240'
									value={heartRateText}
									onChange={(event) => { setHeartRateText(event.target.value); setInvalid(false); }}
									placeholder={t('shell.today.optional')}
								/>
							</label>
							<label className={styles.noteField}>
								<span>{t('shell.today.trainingNote')}</span>
								<input
									type='text'
									maxLength={280}
									value={note}
									onChange={(event) => setNote(event.target.value)}
									placeholder={t('shell.today.trainingNotePlaceholder')}
								/>
							</label>
						</div>
					)}
					<p className={styles.impact}>{t('shell.history.recalculationImpact')}</p>
					{invalid && <p className={styles.error} role='alert'>{t('shell.today.actualEntryInvalid')}</p>}
					{error && <p className={styles.error} role='alert'>{error}</p>}
					<div className={styles.actions}>
						<button className={styles.delete} type='button' onClick={() => setConfirmation('delete')} disabled={saving}><FiTrash2 aria-hidden='true' />{t('shell.history.deleteRecord')}</button>
						<button className={styles.primary} type='submit' disabled={saving || !valueText.trim()}>{t('shell.history.saveChanges')}</button>
					</div>
				</form>
			</>}
		</section>
	</div>;
}

export { ActionRecordEditor, EditorConfirmation };
export type { ActionRecordEditorProps, EditorConfirmationProps };
