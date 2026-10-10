/* eslint-disable i18next/no-literal-string -- Money ships in the existing primary Chinese locale. */
import { Link, useParams, useSearchParams } from 'react-router';
import { summarizeMoneyBill } from '@entities/money';
import { moneyHomePath, moneyMonthLabel, validMoneyMonth } from '../model/moneyNavigation';
import { moneyLabel } from '../model/moneyUi';
import { useMoneyView } from '../model/useMoneyView';
import { MoneyFormPage, MoneyLoadState } from './MoneyLayout';
import { MoneyPaymentList } from './MoneyPaymentList';
import styles from './MoneyPage.module.css';

export function MoneyBillDetailsPage() {
	const { billId } = useParams();
	const [params] = useSearchParams();
	const month = validMoneyMonth(params.get('month'));
	const { view, error, reload } = useMoneyView(month);
	const bill = view?.bills.find(({ id }) => id === billId);
	const summary = view && bill ? summarizeMoneyBill(bill, view.payments) : null;
	return <MoneyFormPage title='账单详情' backTo={moneyHomePath(bill?.month ?? month)}>
		{!view ? <MoneyLoadState error={error} onRetry={reload} /> : !bill || !summary ? <p className={styles.muted}>未找到该账单。</p> : <>
			<section className={styles.card}>
				<h2>{bill.title}</h2><p className={styles.muted}>{moneyMonthLabel(bill.month)}账单 · 应付 {bill.dueDate}</p>
				<p>计划 {moneyLabel(bill.amountCents)} · 实付 {moneyLabel(summary.paidCents)}</p>
				<p>待付 {moneyLabel(summary.remainingCents)} · {summary.status === 'paid' ? '已付清' : summary.status === 'partial' ? '部分已付' : '待付'}</p>
				{bill.note && <p className={styles.muted}>{bill.note}</p>}
				<Link className={styles.textAction} to={`/money/bills/${encodeURIComponent(bill.id)}/edit`}>编辑账单</Link>
			</section>
			<Link className={styles.save} to={`/money/bills/${encodeURIComponent(bill.id)}/pay`}>{summary.remainingCents ? '继续记录付款' : '登记追加付款'}</Link>
			<h2>付款记录</h2><MoneyPaymentList payments={view.payments.filter((payment) => payment.billId === bill.id)} billId={bill.id} />
		</>}
	</MoneyFormPage>;
}
