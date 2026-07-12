import { FiActivity, FiCheck, FiChevronLeft, FiInfo } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';

import { formatOutcomeItem, type OutcomeBatch, type OutcomeBatchItem } from '@entities/outcome-batch';

import styles from './OutcomeSummary.module.css';

interface OutcomeSummaryProps { batch: OutcomeBatch; onBack: () => void }

function groupTotals(items: OutcomeBatchItem[]): Array<{ unit: string; value: string }> {
	const groups = new Map<string, { total: number; precision: number }>();
	for (const item of items) {
		const current = groups.get(item.displayUnit) ?? { total: 0, precision: 2 };
		current.total += item.quantityBaseValue / item.basePerDisplayUnit;
		current.precision = Math.max(current.precision, item.maxDecimalPlaces);
		groups.set(item.displayUnit, current);
	}
	return [...groups].map(([unit, { total, precision }]) => ({ unit, value: total.toFixed(precision).replace(/(\.\d{2}.*?)0+$/, '$1') }));
}

function OutcomeSummary({ batch, onBack }: OutcomeSummaryProps) {
	const { t } = useTranslation();
	const totals = groupTotals(batch.items);
	return <main className={styles.summary}>
		<section className={styles.hero}><span><FiCheck /></span><p>{batch.localDate} · {t('shell.today.batchSaved')}</p><div className={styles.totals}>{totals.map(({ unit, value }) => <h2 key={unit}>{t('shell.today.unitTotal', { value, unit })}</h2>)}</div><strong>{t('shell.today.summaryCards', { count: batch.items.length })}</strong></section>
		<section className={styles.list}><h3>{t('shell.today.summaryResults')}</h3>{batch.items.map((item) => <div className={styles.row} key={`${item.slotIndex}:${item.userCardId}`}><span className={styles.icon}><FiActivity /></span><div><strong>{item.cardTitle}</strong><small>{item.longTermChange ? t('shell.today.longTermChange') : item.stageChange ? t('shell.today.stageChange') : t('shell.today.batchSaved')}</small></div><b>{formatOutcomeItem(item)} {item.displayUnit}</b></div>)}</section>
		<div className={styles.tip}><FiInfo /><span>{t('shell.today.overwriteNote')}</span></div>
		<button className={styles.back} type='button' onClick={onBack}><FiChevronLeft />{t('shell.today.backToEditor')}</button>
	</main>;
}

export { OutcomeSummary };
