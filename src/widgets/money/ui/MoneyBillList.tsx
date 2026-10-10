/* eslint-disable i18next/no-literal-string -- Money ships in the existing primary Chinese locale. */
import { PiCaretDown, PiCheckBold, PiPlus } from 'react-icons/pi';
import { Link } from 'react-router';

import styles from './MoneyBillList.module.css';

// Presentation-only values. Domain status and totals are supplied by the money API.
export interface MoneyBillRowView {
	id: string;
	name: string;
	dueDate: string;
	plannedCents: number;
	paidCents: number;
	remainingCents: number;
	completed: boolean;
	overdue: boolean;
}

const currency = new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' });

export function MoneyBillRow({ bill }: { bill: MoneyBillRowView }) {
	const detail = `/money/bills/${encodeURIComponent(bill.id)}`;
	return (
		<div className={styles.row} data-bill-id={bill.id}>
			<Link className={styles.rowBody} to={detail} aria-label={`查看${bill.name}账单详情`}>
				<span className={styles.date} data-overdue={bill.overdue}>
					{Number(bill.dueDate.slice(-2))}日
					{bill.overdue && <small>逾期</small>}
				</span>
				<span className={styles.name}>
					<strong>{bill.name}</strong>
					{bill.paidCents > 0 && !bill.completed && <small>已付 {currency.format(bill.paidCents / 100)}<br />待付 {currency.format(bill.remainingCents / 100)}</small>}
				</span>
				<span className={styles.amount}>{currency.format(bill.plannedCents / 100)}</span>
			</Link>
			<Link
				className={styles.paymentAction}
				to={bill.completed ? detail : `${detail}/pay`}
				aria-label={bill.completed ? `${bill.name}已付清，查看付款详情` : `为${bill.name}记录付款`}
			>
				<span className={styles.circle} data-payment-circle data-completed={bill.completed}>
					<PiCheckBold aria-hidden='true' />
				</span>
			</Link>
		</div>
	);
}

interface MoneyBillCategoryProps {
	category: 'credit' | 'loan' | 'fixed';
	title: string;
	month: string;
	bills: readonly MoneyBillRowView[];
	completedCount: number;
	plannedCents: number;
	remainingCents: number;
	expanded: boolean;
	onToggle: () => void;
}

export function MoneyBillCategory({ category, title, month, bills, completedCount, plannedCents, remainingCents, expanded, onToggle }: MoneyBillCategoryProps) {
	return (
		<section className={styles.category} aria-label={title}>
			<div className={styles.categoryHeader}>
				<button className={styles.fold} type='button' aria-expanded={expanded} aria-controls={`money-category-${category}`} onClick={onToggle}>
					<strong>{title}</strong>
					<small>已付 {completedCount}/{bills.length}</small>
					<PiCaretDown aria-hidden='true' data-expanded={expanded} />
				</button>
				<Link className={styles.add} to={`/money/bills/new?category=${category}&month=${month}`} aria-label={`新增${title}账单`}><PiPlus aria-hidden='true' /></Link>
			</div>
			<div id={`money-category-${category}`} hidden={!expanded}>
				{expanded && bills.map((bill) => <MoneyBillRow key={bill.id} bill={bill} />)}
				{expanded && bills.length === 0 && <p className={styles.empty}>暂无账单</p>}
			</div>
			<footer className={styles.subtotal}>
				{!expanded && <small>待付 {currency.format(remainingCents / 100)}</small>}
				<span>应付小计 <b>{currency.format(plannedCents / 100)}</b></span>
			</footer>
		</section>
	);
}
