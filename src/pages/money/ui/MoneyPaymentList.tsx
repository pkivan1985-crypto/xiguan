/* eslint-disable i18next/no-literal-string -- Money ships in the existing primary Chinese locale. */
import { Link } from 'react-router';
import type { MoneyPayment } from '@entities/money';
import { moneyLabel } from '../model/moneyUi';
import styles from './MoneyPage.module.css';

export function MoneyPaymentList({ payments, billId }: { payments: MoneyPayment[]; billId: string }) {
	return <section className={styles.records} aria-label='付款记录'>
		{payments.length === 0 && <p className={styles.muted}>还没有付款记录。</p>}
		{[...payments].sort((a, b) => b.localDate.localeCompare(a.localDate) || b.occurredTime.localeCompare(a.occurredTime)).map((payment) => <Link key={payment.id} className={styles.record} to={`/money/bills/${encodeURIComponent(billId)}/pay?payment=${encodeURIComponent(payment.id)}`}>
			<strong>{payment.localDate} {payment.occurredTime}</strong><span className={styles.amount}>{moneyLabel(payment.amountCents)}</span>
			<small>{payment.revokedAt ? '已撤销' : payment.sourceUnavailable ? '原账目不可用，不计入已付' : payment.ownedEntryId ? '已登记付款 · 修改' : '关联原有账目 · 查看'}{payment.accountLabel && ` · ${payment.accountLabel}`}</small>
			{payment.note && <small>{payment.note}</small>}
		</Link>)}
	</section>;
}
