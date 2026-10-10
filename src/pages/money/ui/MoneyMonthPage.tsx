/* eslint-disable i18next/no-literal-string -- Money ships in the existing primary Chinese locale. */
import { useParams, useSearchParams } from 'react-router';
import { summarizeMoneyMonth } from '@entities/money';
import { MoneyBillRow } from '@widgets/money';
import { moneyHomePath, moneyMonthLabel, validMoneyMonth } from '../model/moneyNavigation';
import { billRowView, MONEY_CATEGORIES, moneyLabel } from '../model/moneyUi';
import { useMoneyView } from '../model/useMoneyView';
import { MoneyFormPage, MoneyLoadState } from './MoneyLayout';
import { MoneyTotals } from './MoneyTotals';
import { MoneyPaymentList } from './MoneyPaymentList';
import styles from './MoneyPage.module.css';

export function MoneyMonthPage() {
	const { month: routeMonth } = useParams();
	const [params] = useSearchParams();
	const month = validMoneyMonth(routeMonth);
	const { view, error, reload } = useMoneyView(month);
	return <MoneyFormPage title={`${moneyMonthLabel(month)}账单`} backTo={moneyHomePath(params.get('from') ? validMoneyMonth(params.get('from')) : month)}>
		{!view ? <MoneyLoadState error={error} onRetry={reload} /> : <>
			<section className={styles.card}><MoneyTotals view={view} month={month} /><p className={styles.muted}>{summarizeMoneyMonth(view, month).completed ? '本月账单已全部付清' : summarizeMoneyMonth(view, month).billCount === 0 ? '本月暂无账单，不计为已付清月份' : '本月账单待补齐'}</p></section>
			{MONEY_CATEGORIES.map(({ category, title }) => {
				const bills = view.bills.filter((bill) => bill.month === month && bill.category === category).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
				const summary = summarizeMoneyMonth({ ...view, bills }, month);
				return <section className={styles.card} key={category}>
					<h2>{title}</h2><p className={styles.muted}>应付 {moneyLabel(summary.plannedCents)} · 实付 {moneyLabel(summary.paidCents)} · 待付 {moneyLabel(summary.remainingCents)}</p>
					{bills.length === 0 && <p className={styles.muted}>暂无账单</p>}
					{bills.map((bill) => <div key={bill.id}>
						<MoneyBillRow bill={billRowView(bill, view)} />
						<details><summary className={styles.textAction}>付款记录 · 实付 {moneyLabel(billRowView(bill, view).paidCents)} · {billRowView(bill, view).completed ? '已付清' : '待付'}</summary><MoneyPaymentList payments={view.payments.filter((payment) => payment.billId === bill.id)} billId={bill.id} /></details>
					</div>)}
				</section>;
			})}
			<MoneyTotals view={view} month={month} />
		</>}
	</MoneyFormPage>;
}
