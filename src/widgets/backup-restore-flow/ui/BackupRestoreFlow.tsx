import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import type { BackupPreview } from '@entities/backup';
import styles from './BackupRestoreFlow.module.css';

export type RestoreFlowViewState =
	| { step: 'password' }
	| { step: 'preview'; preview: BackupPreview }
	| { step: 'restoring'; preview: BackupPreview }
	| { step: 'error'; message: string };

interface Props { state: RestoreFlowViewState; onPassword(password: string): void | Promise<void>; onConfirm(): void | Promise<void>; onCancel(): void; }

export function BackupRestoreFlow({ state, onPassword, onConfirm, onCancel }: Props) {
	const { t } = useTranslation();
	const [password, setPassword] = useState('');
	const submitPassword = (event: FormEvent) => { event.preventDefault(); void onPassword(password); };
	const preview = state.step === 'preview' || state.step === 'restoring' ? state.preview : null;
	return <div className={styles.overlay} role='presentation'>
		<section className={styles.sheet} role='dialog' aria-modal='true' aria-labelledby='restore-title'>
			{state.step === 'password' && <form onSubmit={submitPassword}><h2 id='restore-title'>{t('shell.dataManagement.restore.passwordTitle')}</h2><label>{t('shell.dataManagement.encryption.password')}<input autoFocus type='password' value={password} onChange={(event) => setPassword(event.target.value)} /></label><div className={styles.actions}><button type='button' onClick={onCancel}>{t('common.cancel')}</button><button type='submit'>{t('shell.dataManagement.restore.unlock')}</button></div></form>}
			{preview && <><h2 id='restore-title'>{t('shell.dataManagement.restore.previewTitle')}</h2><p className={styles.warning}>{t('shell.dataManagement.restore.replaceWarning')}</p><dl><div><dt>{t('shell.dataManagement.restore.cards')}</dt><dd>{preview.userCards}</dd></div><div><dt>{t('shell.dataManagement.restore.goals')}</dt><dd>{preview.longTermGoals + preview.stageGoals}</dd></div><div><dt>{t('shell.dataManagement.restore.records')}</dt><dd>{preview.actionRecords}</dd></div><div><dt>{t('shell.dataManagement.restore.batches')}</dt><dd>{preview.outcomeBatches}</dd></div></dl><div className={styles.actions}><button type='button' onClick={onCancel} disabled={state.step === 'restoring'}>{t('common.cancel')}</button><button type='button' onClick={() => void onConfirm()} disabled={state.step === 'restoring'}>{state.step === 'restoring' ? t('shell.dataManagement.restore.restoring') : t('shell.dataManagement.restore.confirm')}</button></div></>}
			{state.step === 'error' && <><h2 id='restore-title'>{t('shell.dataManagement.restore.errorTitle')}</h2><p role='alert'>{state.message}</p><div className={styles.actions}><button type='button' onClick={onCancel}>{t('common.close')}</button></div></>}
		</section>
	</div>;
}
