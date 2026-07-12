/* eslint-disable i18next/no-literal-string -- update/delete are domain operation identifiers. */
import styles from './HistoryPage.module.css';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { FiClock, FiRefreshCw } from 'react-icons/fi';
import { parseQuantityToBase } from '@entities/card-template';
import { correctActionRecordInApp } from '@features/correct-action-record';
import { loadHistoryInApp, type HistoryModel, type HistoryRecordModel } from '@features/load-history';
import { APP_ROUTES } from '@shared/config';
import { formatLocalDate } from '@shared/lib/date';
import { ActionRecordEditor } from '@widgets/action-record-editor';
import { HistoryList } from '@widgets/history-list';
import { historyErrorKey } from '../model/historyPage';

function HistoryPage() {
	const { t } = useTranslation();
	const currentLocalDate = useMemo(() => formatLocalDate(new Date()), []);
	const [model, setModel] = useState<HistoryModel | null>(null);
	const [loadError, setLoadError] = useState(false);
	const [retryNonce, setRetryNonce] = useState(0);
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [saving, setSaving] = useState(false);
	const [actionError, setActionError] = useState<string>();
	const correctionIds = useRef<{ update?: string; delete?: string }>({});

	useEffect(() => {
		let active = true;
		void loadHistoryInApp(currentLocalDate).then((next) => { if (active) setModel(next); }).catch(() => { if (active) setLoadError(true); });
		return () => { active = false; };
	}, [currentLocalDate, retryNonce]);

	const selected = model?.groups.flatMap(({ records }) => records).find(({ id }) => id === selectedId);
	const reload = async () => setModel(await loadHistoryInApp(formatLocalDate(new Date())));
	const closeEditor = () => { setSelectedId(null); setActionError(undefined); correctionIds.current = {}; };
	const runCorrection = async (record: HistoryRecordModel, operation: 'update' | 'delete', valueText?: string) => {
		setSaving(true); setActionError(undefined);
		try {
			const quantityBaseValue = operation === 'update' ? parseQuantityToBase(valueText ?? '', {
				baseUnit: record.displayUnit,
				displayUnit: record.displayUnit,
				basePerDisplayUnit: record.basePerDisplayUnit,
				maxDecimalPlaces: record.maxDecimalPlaces,
				confirmationThresholdDisplay: record.confirmationThresholdDisplay,
			}, { confirmedOverLimit: true }) : undefined;
			const correctionId = correctionIds.current[operation] ?? crypto.randomUUID();
			correctionIds.current[operation] = correctionId;
			await correctActionRecordInApp({
				actionRecordId: record.id,
				operation,
				quantityBaseValue,
				currentLocalDate: formatLocalDate(new Date()),
				nowIso: new Date().toISOString(),
				correctionId,
			});
			await reload();
			closeEditor();
		} catch (error) {
			setActionError(t(historyErrorKey(error)));
		} finally {
			setSaving(false);
		}
	};

	if (loadError) return <section className={styles.state}><h2>{t('shell.history.loadError')}</h2><button type='button' onClick={() => { setModel(null); setLoadError(false); setRetryNonce((value) => value + 1); }}><FiRefreshCw aria-hidden='true' />{t('shell.history.retry')}</button></section>;
	if (!model) return <section className={styles.state}><p>{t('shell.history.loading')}</p></section>;
	if (model.groups.length === 0) return <section className={styles.empty}><div className={styles.icon}><FiClock aria-hidden='true' /></div><h2>{t('shell.history.emptyTitle')}</h2><p>{t('shell.history.emptyDescription')}</p><Link to={APP_ROUTES.TODAY}>{t('shell.history.recordToday')}</Link></section>;

	return <div className={styles.page}>
		<HistoryList model={model} currentLocalDate={currentLocalDate} onCorrect={(recordId) => { correctionIds.current = {}; setActionError(undefined); setSelectedId(recordId); }} />
		{selected && <ActionRecordEditor record={selected} saving={saving} error={actionError} onClose={closeEditor} onSave={(value) => void runCorrection(selected, 'update', value)} onDelete={() => void runCorrection(selected, 'delete')} />}
	</div>;
}

export { HistoryPage };
