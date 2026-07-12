/* eslint-disable i18next/no-literal-string -- Restore and clear states are domain identifiers. */
import { useState, type ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { FiDownload, FiHardDrive, FiLock, FiRefreshCw, FiTrash2 } from 'react-icons/fi';
import pkg from '../../../../package.json';
import type { ValidatedBackup } from '@entities/backup';
import { clearUserDataInApp } from '@features/data-management/clear-user-data';
import { exportBackupInApp } from '@features/data-management/export-backup';
import { inspectBackupFileInApp } from '@features/data-management/inspect-backup';
import { restoreBackupInApp } from '@features/data-management/restore-backup';
import { APP_ROUTES } from '@shared/config';
import { ShellSection } from '@shared/ui';
import { BackupExportSheet } from '@widgets/backup-export-sheet';
import { BackupRestoreFlow, type RestoreFlowViewState } from '@widgets/backup-restore-flow';
import styles from './DataManagementPage.module.css';

type ClearStep = 'closed' | 'offer' | 'confirm';

function errorCode(error: unknown): string {
	return typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : 'UNKNOWN';
}

const ERROR_KEYS = {
	FILE_TOO_LARGE: 'shell.dataManagement.errors.FILE_TOO_LARGE',
	UNSUPPORTED_FILE: 'shell.dataManagement.errors.UNSUPPORTED_FILE',
	INVALID_JSON: 'shell.dataManagement.errors.INVALID_JSON',
	UNSUPPORTED_FORMAT: 'shell.dataManagement.errors.UNSUPPORTED_FORMAT',
	PASSWORD_OR_DATA_INVALID: 'shell.dataManagement.errors.PASSWORD_OR_DATA_INVALID',
	BACKUP_VERSION_TOO_NEW: 'shell.dataManagement.errors.BACKUP_VERSION_TOO_NEW',
	CHECKSUM_MISMATCH: 'shell.dataManagement.errors.CHECKSUM_MISMATCH',
	RELATIONSHIP_INVALID: 'shell.dataManagement.errors.RELATIONSHIP_INVALID',
	TEMPLATE_INCOMPATIBLE: 'shell.dataManagement.errors.TEMPLATE_INCOMPATIBLE',
	UNKNOWN: 'shell.dataManagement.errors.UNKNOWN',
} as const;

function errorKey(error: unknown): typeof ERROR_KEYS[keyof typeof ERROR_KEYS] {
	const code = errorCode(error) as keyof typeof ERROR_KEYS;
	return ERROR_KEYS[code] ?? ERROR_KEYS.UNKNOWN;
}

function DataManagementPage() {
	const { t } = useTranslation();
	const [exportOpen, setExportOpen] = useState(false);
	const [busy, setBusy] = useState(false);
	const [message, setMessage] = useState('');
	const [selectedFile, setSelectedFile] = useState<File | null>(null);
	const [validated, setValidated] = useState<ValidatedBackup | null>(null);
	const [restoreState, setRestoreState] = useState<RestoreFlowViewState | null>(null);
	const [clearStep, setClearStep] = useState<ClearStep>('closed');
	const [clearPhrase, setClearPhrase] = useState('');

	const exportBackup = async (password?: string) => {
		setBusy(true); setMessage('');
		try {
			await exportBackupInApp({ nowIso: new Date().toISOString(), appVersion: pkg.version, password });
			setMessage(t('shell.dataManagement.exportSuccess'));
			setExportOpen(false);
		} catch {
			setMessage(t('shell.dataManagement.exportError'));
		} finally { setBusy(false); }
	};

	const inspect = async (file: File, password?: string) => {
		setBusy(true); setMessage('');
		try {
			const result = await inspectBackupFileInApp(file, password);
			if (result.kind === 'password-required') setRestoreState({ step: 'password' });
			else { setValidated(result.backup); setRestoreState({ step: 'preview', preview: result.preview }); }
		} catch (error) {
			setRestoreState({ step: 'error', message: t(errorKey(error)) });
		} finally { setBusy(false); }
	};

	const chooseFile = (event: ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		if (file) { setSelectedFile(file); void inspect(file); }
		event.target.value = '';
	};

	const restore = async () => {
		if (!validated || !restoreState || restoreState.step !== 'preview') return;
		setRestoreState({ step: 'restoring', preview: restoreState.preview });
		try {
			await restoreBackupInApp(validated);
			window.location.assign(APP_ROUTES.HOME);
		} catch (error) {
			setRestoreState({ step: 'error', message: t(errorKey(error)) });
		}
	};

	const clear = async () => {
		if (clearPhrase !== t('shell.dataManagement.clear.phrase')) return setMessage(t('shell.dataManagement.clear.phraseError'));
		setBusy(true);
		try { await clearUserDataInApp(); window.location.assign(APP_ROUTES.HOME); }
		catch { setMessage(t('shell.dataManagement.clear.error')); setClearStep('closed'); }
		finally { setBusy(false); }
	};

	return <div className={styles.page}>
		<ShellSection title={t('shell.dataManagement.localTitle')} description={t('shell.dataManagement.localDescription')}><div className={styles.notice}><FiHardDrive aria-hidden='true' />{t('shell.dataManagement.localNotice')}</div></ShellSection>
		<ShellSection title={t('shell.dataManagement.backupTitle')} description={t('shell.dataManagement.backupDescription')}><div className={styles.actions}><button className={styles.primary} onClick={() => void exportBackup()} disabled={busy}><FiDownload aria-hidden='true' />{t('shell.dataManagement.exportPlain')}</button><button onClick={() => setExportOpen(true)} disabled={busy}><FiLock aria-hidden='true' />{t('shell.dataManagement.exportEncrypted')}</button><label className={styles.fileButton}><FiRefreshCw aria-hidden='true' />{t('shell.dataManagement.restore.action')}<input type='file' accept='.json,application/json' onChange={chooseFile} disabled={busy} /></label></div>{message && <p className={styles.message} role='status'>{message}</p>}</ShellSection>
		<ShellSection title={t('shell.dataManagement.dangerTitle')} description={t('shell.dataManagement.dangerDescription')} className={styles.danger}><button className={styles.dangerButton} onClick={() => setClearStep('offer')}><FiTrash2 aria-hidden='true' />{t('shell.dataManagement.clear.action')}</button></ShellSection>
		{exportOpen && <BackupExportSheet busy={busy} onSubmit={exportBackup} onClose={() => setExportOpen(false)} />}
		{restoreState && <BackupRestoreFlow state={restoreState} onPassword={(password) => { if (selectedFile) return inspect(selectedFile, password); }} onConfirm={restore} onCancel={() => { setRestoreState(null); setSelectedFile(null); setValidated(null); }} />}
		{clearStep !== 'closed' && <div className={styles.overlay}><section className={styles.clearDialog} role='dialog' aria-modal='true' aria-labelledby='clear-title'><h2 id='clear-title'>{t('shell.dataManagement.clear.title')}</h2>{clearStep === 'offer' ? <><p>{t('shell.dataManagement.clear.offer')}</p><div className={styles.split}><button onClick={() => void exportBackup()}>{t('shell.dataManagement.clear.backupFirst')}</button><button className={styles.dangerButton} onClick={() => setClearStep('confirm')}>{t('shell.dataManagement.clear.continue')}</button></div></> : <><p>{t('shell.dataManagement.clear.typePhrase')}</p><input autoFocus value={clearPhrase} onChange={(event) => setClearPhrase(event.target.value)} /><div className={styles.split}><button onClick={() => setClearStep('closed')}>{t('common.cancel')}</button><button className={styles.dangerButton} onClick={() => void clear()} disabled={busy}>{t('shell.dataManagement.clear.confirm')}</button></div></>}</section></div>}
	</div>;
}

export { DataManagementPage };
