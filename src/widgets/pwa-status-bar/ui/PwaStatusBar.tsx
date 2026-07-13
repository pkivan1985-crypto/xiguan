import styles from './PwaStatusBar.module.css';
import { useTranslation } from 'react-i18next';
import type { UpdateState } from '@features/pwa-update';
import { usePwaUpdate } from '@features/pwa-update';
import type { CriticalOperationKind } from '@shared/lib/app-lifecycle';

const BLOCKED_COPY_KEYS: Record<CriticalOperationKind, `shell.pwa.blocked.${CriticalOperationKind}`> = {
	'clear-data': 'shell.pwa.blocked.clear-data',
	'correct-record': 'shell.pwa.blocked.correct-record',
	'create-card': 'shell.pwa.blocked.create-card',
	'restore-backup': 'shell.pwa.blocked.restore-backup',
	'save-outcome': 'shell.pwa.blocked.save-outcome',
};

export interface PwaStatusBarViewValue {
	state: UpdateState;
	online: boolean;
	dismissed: boolean;
	offlineNoticeDismissed: boolean;
	onDismiss(): void;
	onDismissOfflineNotice(): void;
	onApply(): Promise<void>;
	onRetry(): Promise<void>;
}

export function PwaStatusBarView({ value }: { value: PwaStatusBarViewValue }) {
	const { t } = useTranslation();
	if (!value.online) {
		if (value.offlineNoticeDismissed) return null;
		return <section className={styles.statusBar} role='status' aria-live='polite'>
			<div><strong>{t('shell.pwa.offlineTitle')}</strong><small>{t('shell.pwa.offlineDescription')}</small></div>
			<div className={styles.actions}><button type='button' onClick={value.onDismissOfflineNotice}>{t('common.close')}</button></div>
		</section>;
	}
	if (value.dismissed && (value.state.kind === 'available' || value.state.kind === 'blocked')) return null;
	if (value.state.kind === 'idle' || value.state.kind === 'checking') return null;

	if (value.state.kind === 'failed') {
		return <section className={styles.statusBar} role='status' aria-live='polite'>
			<div><strong>{t('shell.pwa.failedTitle')}</strong><small>{t('shell.pwa.failedDescription')}</small></div>
			<div className={styles.actions}><button type='button' onClick={() => void value.onRetry()}>{t('shell.pwa.retry')}</button></div>
		</section>;
	}

	if (value.state.kind === 'applying') {
		return <section className={styles.statusBar} role='status' aria-live='polite'>
			<div><strong>{t('shell.pwa.applyingTitle')}</strong><small>{t('shell.pwa.applyingDescription')}</small></div>
		</section>;
	}

	const blockedOperation = value.state.kind === 'blocked' ? value.state.operation : null;
	const blocked = Boolean(blockedOperation);
	return <section className={styles.statusBar} role='status' aria-live='polite'>
		<div>
			<strong>{t('shell.pwa.updateTitle')}</strong>
			<small>{blockedOperation
				? t(BLOCKED_COPY_KEYS[blockedOperation])
				: t('shell.pwa.updateDescription')}</small>
		</div>
		<div className={styles.actions}>
			<button type='button' onClick={value.onDismiss}>{t('shell.pwa.later')}</button>
			<button className={styles.primary} type='button' disabled={blocked} onClick={() => void value.onApply()}>
				{t('shell.pwa.updateNow')}
			</button>
		</div>
	</section>;
}

export function PwaStatusBar() {
	const update = usePwaUpdate();
	return <PwaStatusBarView value={{
		state: update.state,
		online: update.online,
		dismissed: update.dismissed,
		offlineNoticeDismissed: update.offlineNoticeDismissed,
		onDismiss: update.dismiss,
		onDismissOfflineNotice: update.dismissOfflineNotice,
		onApply: update.applyUpdate,
		onRetry: update.checkForUpdate,
	}} />;
}
