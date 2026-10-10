/* eslint-disable i18next/no-literal-string -- Money ships in the existing primary Chinese locale. */
import { useEffect, useState } from 'react';
import { PiCaretRight, PiGearSix, PiPlus } from 'react-icons/pi';
import { Link, useSearchParams } from 'react-router';
import { summarizeDebt, summarizeMoneyEntries, summarizeMoneyMonth, type MoneyView } from '@entities/money';
import { MobilePageHeader } from '@widgets/mobile-page-header';
import { MoneyBillCategory } from '@widgets/money';
import { moneyMonthLabel, readMoneyHomeSession, rememberMoneyHomeSession, validMoneyMonth } from '../model/moneyNavigation';
import { billRowView, MONEY_CATEGORIES, moneyLabel } from '../model/moneyUi';
import { useMoneyView } from '../model/useMoneyView';
import { MoneyLoadState, MoneyMonthPicker } from './MoneyLayout';
import { MoneyTotals } from './MoneyTotals';
import styles from './MoneyPage.module.css';

export function MoneyPage() {
	const [params, setParams] = useSearchParams();
	const month = validMoneyMonth(params.get('month'));
	return <MoneyHome key={month} month={month} onChangeMonth={(next) => setParams({ month: next })} />;
}

function MoneyHome({ month, onChangeMonth }: { month: string; onChangeMonth: (month: string) => void }) {
	const { view, error, reload } = useMoneyView(month);
	const [expanded, setExpanded] = useState(() => readMoneyHomeSession(month).expanded);
	const ready = Boolean(view);
	useEffect(() => {
		if (!ready) return;
		const frame = requestAnimationFrame(() => window.scrollTo(0, readMoneyHomeSession(month).scrollY));
		return () => cancelAnimationFrame(frame);
	}, [month, ready]);
	useEffect(() => {
		if (!ready) return;
		const remember = () => rememberMoneyHomeSession(month, { expanded, scrollY: window.scrollY });
		window.addEventListener('scroll', remember, { passive: true });
		return () => { remember(); window.removeEventListener('scroll', remember); };
	}, [month, ready, expanded]);
	return <div className={styles.page}>
		<MobilePageHeader title='钱' settingsAction={<Link className={styles.iconButton} to='/settings' aria-label='打开设置'><PiGearSix aria-hidden='true' /></Link>} />
		{!view ? <MoneyLoadState error={error} onRetry={reload} /> : <>
			<MoneyDebtSummary view={view} month={month} />
			<MoneyMonthPicker month={month} onChange={onChangeMonth} />
			<MoneyCashSummary view={view} month={month} />
			<MoneyCategories view={view} month={month} expanded={expanded} onToggle={(category) => setExpanded((current) => ({ ...current, [category]: !current[category] }))} />
			<MoneyTotals view={view} month={month} />
			<Link className={styles.textAction} to={`/money/month/${month}`}>查看本月账单详情<PiCaretRight aria-hidden='true' /></Link>
			<section className={styles.history} aria-label='月份完成记录'>
				<h2>月份完成记录</h2>
				{view.completedMonths.length === 0 && <p className={styles.muted}>账单全部付清后，会在这里留下月份记录。</p>}
				{[...new Set(view.completedMonths)].sort().reverse().map((item) => {
					const summary = summarizeMoneyMonth(view, item);
					return <Link key={item} className={styles.historyLink} to={`/money/month/${item}?from=${month}`}>
						<strong>{moneyMonthLabel(item)} · 已付 {moneyLabel(summary.paidCents)}</strong><span>详情 <PiCaretRight aria-hidden='true' /></span>
						<small>{summary.completed ? '已全部付清' : summary.billCount === 0 ? '账单已移出本月，保留历史月份记录' : `待补齐 · 已付 ${summary.paidCount}/${summary.billCount} 项`}</small>
						<small>{MONEY_CATEGORIES.map(({ category, title }) => `${title} ${moneyLabel(summarizeMoneyMonth({ ...view, bills: view.bills.filter((bill) => bill.category === category) }, item).paidCents)}`).join(' · ')}</small>
					</Link>;
				})}
			</section>
		</>}
	</div>;
}

function MoneyDebtSummary({ view, month }: { view: MoneyView; month: string }) {
	const debt = summarizeDebt(view.accounts);
	return <Link className={styles.card} to={`/money/accounts?month=${month}`} aria-label='管理负债账户'>
		<div className={styles.debt}>
			<span>{debt.unknownCount ? '已登记负债' : '当前总负债'}</span>
			<strong className={styles.amount}>{debt.accountCount ? moneyLabel(debt.knownDebtCents) : '尚未登记负债'}</strong>
			<small className={styles.muted}>{debt.unknownCount > 0 ? `仍有 ${debt.unknownCount} 项金额待补充` : '用户最近确认的欠款，不随所选月份变化'}</small>
			<small className={styles.muted}>信用卡 {moneyLabel(summarizeDebt(view.accounts.filter((account) => account.category === 'creditCard')).knownDebtCents)} · 贷款 {moneyLabel(summarizeDebt(view.accounts.filter((account) => account.category === 'loan')).knownDebtCents)}</small>
			<small className={styles.muted}>最近确认：{debt.latestConfirmedAt ? debt.latestConfirmedAt.slice(0, 10) : '尚未确认'}</small>
		</div>
	</Link>;
}

function MoneyCashSummary({ view, month }: { view: MoneyView; month: string }) {
	const summary = summarizeMoneyEntries(view.entries, month);
	return <section className={styles.card} aria-label='月度收支'>
		<div className={styles.cashSummary}>
			<div><span className={styles.muted}>收入</span><strong>{moneyLabel(summary.incomeCents)}</strong></div>
			<div><span className={styles.muted}>支出</span><strong>{moneyLabel(summary.expenseCents)}</strong></div>
			<div><span className={styles.muted}>还款</span><strong>{moneyLabel(summary.repaymentCents)}</strong></div>
		</div>
		<div className={styles.actions}><Link className={styles.textAction} to={`/money/records?month=${month}`}>查看记录</Link><Link className={styles.textAction} to={`/money/records?new=1&month=${month}`}><PiPlus aria-hidden='true' />记一笔</Link></div>
	</section>;
}

export function MoneyCategories({ view, month, expanded, onToggle }: { view: MoneyView; month: string; expanded: Record<'credit' | 'loan' | 'fixed', boolean>; onToggle: (category: 'credit' | 'loan' | 'fixed') => void }) {
	return <>{MONEY_CATEGORIES.map(({ category, query, title }) => {
		const bills = view.bills.filter((bill) => bill.month === month && bill.category === category).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
		const summary = summarizeMoneyMonth({ ...view, bills }, month);
		return <MoneyBillCategory key={category} category={query} title={title} month={month} bills={bills.map((bill) => billRowView(bill, view))} completedCount={summary.paidCount} plannedCents={summary.plannedCents} remainingCents={summary.remainingCents} expanded={expanded[query]} onToggle={() => onToggle(query)} />;
	})}</>;
}
