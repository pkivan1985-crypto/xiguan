/* eslint-disable i18next/no-literal-string -- Money ships in the existing primary Chinese locale. */
import { summarizeMoneyMonth, type MoneyView } from '@entities/money';
import { moneyLabel } from '../model/moneyUi';
import styles from './MoneyPage.module.css';

export function MoneyTotals({ view, month }: { view: MoneyView; month: string }) {
	const summary = summarizeMoneyMonth(view, month);
	return <dl className={styles.totals} aria-label='月份账单合计'>
		<div><dt>本月应付</dt><dd>{moneyLabel(summary.plannedCents)}</dd></div>
		<div><dt>本月实付</dt><dd>{moneyLabel(summary.paidCents)}</dd></div>
		<div><dt>本月待付</dt><dd>{moneyLabel(summary.remainingCents)}</dd></div>
		<div><dt>已付</dt><dd>{summary.paidCount}/{summary.billCount} 项</dd></div>
	</dl>;
}
