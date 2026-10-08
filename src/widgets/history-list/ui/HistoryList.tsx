/* eslint-disable i18next/no-literal-string -- Bookkeeping ledger labels are fixed primary-locale UI copy. */
import styles from './HistoryList.module.css';
import { useTranslation } from 'react-i18next';
import { FiClock, FiMoreHorizontal } from 'react-icons/fi';
import { Link } from 'react-router';
import type { HistoryModel } from '@features/load-history';
import { parseLocalDate } from '@shared/lib/date';
import { APP_ROUTES } from '@shared/config';

interface HistoryListProps {
	model: HistoryModel;
	currentLocalDate: string;
	onCorrect: (recordId: string) => void;
}

function displayDate(localDate: string, currentLocalDate: string, todayLabel: string): string {
	if (localDate === currentLocalDate) return todayLabel;
	parseLocalDate(localDate);
	const [year, month, day] = localDate.split('-').map(Number);
	return new Intl.DateTimeFormat(undefined, { month: 'long', day: 'numeric' }).format(new Date(year, month - 1, day));
}

function displayTime(iso: string): string {
	return new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
}

function bookkeepingAmount(amountCents: number): string {
	return new Intl.NumberFormat('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amountCents / 100);
}

function HistoryList({ model, currentLocalDate, onCorrect }: HistoryListProps) {
	const { t } = useTranslation();
	return <div className={styles.list}>{model.groups.map((group) => <section className={styles.group} key={group.localDate}>
		<header><h2>{displayDate(group.localDate, currentLocalDate, t('shell.history.today'))}</h2><span>{group.records.length}</span></header>
		{group.records.map((record) => <article className={styles.record} key={record.id}>
			<span className={styles.icon}><FiClock aria-hidden='true' /></span>
			<span className={styles.copy}>
				<strong>{record.relationAvailable ? record.cardTitle : t('shell.history.unavailable')}</strong>
				<small>{displayTime(record.lastSavedAt)}{record.stageGoalTitle ? ` · ${record.stageGoalTitle}` : record.longTermGoalTitle ? ` · ${record.longTermGoalTitle}` : ''}</small>
			</span>
			<span className={styles.value}><b>{record.displayValue} {record.displayUnit}</b>
				{record.officialCardId === 'bookkeeping' ? null : record.canCorrect
					? <button type='button' onClick={() => onCorrect(record.id)} aria-label={t('shell.history.correctRecord', { title: record.cardTitle })}><FiMoreHorizontal aria-hidden='true' /></button>
					: <small>{t('shell.history.readOnly')}</small>}
			</span>
			{record.officialCardId === 'bookkeeping' && record.userCardId && record.bookkeepingEntries && (
				<div className={styles.bookkeepingEntries}>
					{record.bookkeepingEntries.map((entry) => (
						<Link
							key={entry.id}
							className={styles.bookkeepingEntry}
							to={`${APP_ROUTES.habitRecord(record.userCardId!, record.localDate)}&entry=${encodeURIComponent(entry.id)}`}
							aria-label={`修改账目：${entry.item || entry.categoryLabel} ${entry.type === 'income' ? '收入' : '支出'} ¥${bookkeepingAmount(entry.amountCents)}`}
						>
							<span><strong>{entry.item || entry.categoryLabel}</strong><small>{entry.occurredTime} · {entry.categoryLabel} · {entry.accountLabel}</small></span>
							<b data-income={entry.type === 'income'}>{entry.type === 'income' ? '+' : '−'}¥{bookkeepingAmount(entry.amountCents)}</b>
						</Link>
					))}
				</div>
			)}
		</article>)}
	</section>)}</div>;
}

export { HistoryList };
export type { HistoryListProps };
