import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';

import styles from './BackupExportSheet.module.css';

interface BackupExportSheetProps {
	busy: boolean;
	onSubmit(password: string): void | Promise<void>;
	onClose(): void;
}

export function BackupExportSheet({ busy, onSubmit, onClose }: BackupExportSheetProps) {
	const { t } = useTranslation();
	const [password, setPassword] = useState('');
	const [confirmation, setConfirmation] = useState('');
	const [error, setError] = useState('');
	const submit = (event: FormEvent) => {
		event.preventDefault();
		if (password.length < 8) return setError(t('shell.dataManagement.encryption.passwordLength'));
		if (password !== confirmation) return setError(t('shell.dataManagement.encryption.passwordMismatch'));
		setError('');
		void onSubmit(password);
	};
	return <div className={styles.overlay} role='presentation' onMouseDown={(event) => event.target === event.currentTarget && !busy && onClose()}>
		<form className={styles.sheet} role='dialog' aria-modal='true' aria-labelledby='backup-export-title' onSubmit={submit}>
			<h2 id='backup-export-title'>{t('shell.dataManagement.encryption.title')}</h2>
			<p>{t('shell.dataManagement.encryption.passwordWarning')}</p>
			<label>{t('shell.dataManagement.encryption.password')}<input autoFocus type='password' autoComplete='new-password' value={password} onChange={(event) => setPassword(event.target.value)} disabled={busy} /></label>
			<label>{t('shell.dataManagement.encryption.confirmPassword')}<input type='password' autoComplete='new-password' value={confirmation} onChange={(event) => setConfirmation(event.target.value)} disabled={busy} /></label>
			{error && <p className={styles.error} role='alert'>{error}</p>}
			<div className={styles.actions}><button type='button' onClick={onClose} disabled={busy}>{t('common.cancel')}</button><button type='submit' disabled={busy}>{busy ? t('shell.dataManagement.exporting') : t('shell.dataManagement.exportEncrypted')}</button></div>
		</form>
	</div>;
}
