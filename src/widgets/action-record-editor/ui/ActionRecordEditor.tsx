/* eslint-disable i18next/no-literal-string -- update/delete are domain operation identifiers. */
import styles from './ActionRecordEditor.module.css';
import { type FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FiTrash2, FiX } from 'react-icons/fi';
import type { HistoryRecordModel } from '@features/load-history';

type ConfirmationKind = 'update' | 'delete';

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
	onSave: (valueText: string) => void;
	onDelete: () => void;
	onClose: () => void;
}

function EditorConfirmation({ kind, busy, onConfirm, onCancel }: EditorConfirmationProps) {
	const { t } = useTranslation();
	const isDelete = kind === 'delete';
	return <div className={styles.confirmation} role='alertdialog' aria-modal='true' aria-labelledby='record-confirmation-title'>
		<h3 id='record-confirmation-title'>{t(isDelete ? 'shell.history.deleteConfirmationTitle' : 'shell.history.updateConfirmationTitle')}</h3>
		<p>{t('shell.history.recalculationImpact')}</p>
		<div className={styles.confirmationActions}>
			<button className={styles.secondary} type='button' onClick={onCancel} disabled={busy}>{t('common.cancel')}</button>
			<button className={isDelete ? styles.danger : styles.primary} type='button' onClick={onConfirm} disabled={busy}>
				{t(isDelete ? 'shell.history.confirmDelete' : 'shell.history.confirmUpdate')}
			</button>
		</div>
	</div>;
}

function ActionRecordEditor({ record, saving, error, onSave, onDelete, onClose }: ActionRecordEditorProps) {
	const { t } = useTranslation();
	const [valueText, setValueText] = useState(record.displayValue);
	const [confirmation, setConfirmation] = useState<ConfirmationKind | null>(null);
	const submit = (event: FormEvent) => {
		event.preventDefault();
		setConfirmation('update');
	};

	return <div className={styles.overlay}>
		<section className={styles.sheet} role={confirmation ? undefined : 'dialog'} aria-modal={confirmation ? undefined : 'true'} aria-labelledby={confirmation ? undefined : 'record-editor-title'}>
			{confirmation ? <EditorConfirmation
				kind={confirmation}
				busy={saving}
				onCancel={() => setConfirmation(null)}
				onConfirm={() => confirmation === 'update' ? onSave(valueText) : onDelete()}
			/> : <>
				<span className={styles.grab} aria-hidden='true' />
				<header><h2 id='record-editor-title'>{t('shell.history.editorTitle')}</h2><button className={styles.closeButton} type='button' onClick={onClose} disabled={saving} aria-label={t('common.close')}><FiX aria-hidden='true' /></button></header>
				<form onSubmit={submit}>
					<label htmlFor='correct-record-value'>{record.cardTitle}</label>
					<div className={styles.inputRow}><input id='correct-record-value' autoFocus inputMode='decimal' value={valueText} onChange={(event) => setValueText(event.target.value)} disabled={saving} /><span>{record.displayUnit}</span></div>
					<p className={styles.impact}>{t('shell.history.recalculationImpact')}</p>
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
