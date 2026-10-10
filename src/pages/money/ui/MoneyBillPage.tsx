/* eslint-disable i18next/no-literal-string -- Money ships in the existing primary Chinese locale. */
import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import type { MoneyBill, MoneyCategory, MoneyView } from '@entities/money';
import { saveMoneyBillInApp } from '@features/money';
import { moneyInputFromCents, parseMoneyInputToCents } from '@shared/lib/money-input';
import { amountError, dateError, useMoneyMutation } from '../model/moneyForm';
import { moneyHomePath, validMoneyMonth } from '../model/moneyNavigation';
import { categoryFromQuery, MONEY_CATEGORIES } from '../model/moneyUi';
import { useMoneyView } from '../model/useMoneyView';
import { MoneyAmountField, MoneyField, MoneyInputField } from './MoneyFields';
import { MoneyFormPage, MoneyLoadState, MoneySaveButton } from './MoneyLayout';
import styles from './MoneyPage.module.css';

export function MoneyBillPage() {
	const { billId } = useParams();
	const [params] = useSearchParams();
	const month = validMoneyMonth(params.get('month'));
	const { view, error, reload } = useMoneyView(month);
	if (!view) return <MoneyFormPage title={billId ? '编辑账单' : '新增账单'} backTo={moneyHomePath(month)}><MoneyLoadState error={error} onRetry={reload} /></MoneyFormPage>;
	const bill = view.bills.find(({ id }) => id === billId);
	if (billId && !bill) return <MoneyFormPage title='账单不存在' backTo={moneyHomePath(month)}><p className={styles.muted}>未找到该账单，请返回月份列表。</p></MoneyFormPage>;
	return <MoneyBillForm key={bill?.id ?? 'new'} view={view} bill={bill} month={month} initialCategory={categoryFromQuery(params.get('category'))} />;
}

function MoneyBillForm({ view, bill, month, initialCategory }: { view: MoneyView; bill?: MoneyBill; month: string; initialCategory: MoneyCategory }) {
	const navigate = useNavigate();
	const template = view.templates.find(({ id }) => id === bill?.templateId);
	const [category, setCategory] = useState(bill?.category ?? initialCategory);
	const [title, setTitle] = useState(bill?.title ?? '');
	const [dueDate, setDueDate] = useState(bill?.dueDate ?? `${month}-01`);
	const [amount, setAmount] = useState(bill ? moneyInputFromCents(bill.amountCents) : '');
	const [accountId, setAccountId] = useState(bill?.accountId ?? '');
	const [repeatMonthly, setRepeatMonthly] = useState(template?.active ?? !bill);
	const [updateFuture, setUpdateFuture] = useState(false);
	const [note, setNote] = useState(bill?.note ?? '');
	const [dirty, setDirty] = useState(false);
	const [errors, setErrors] = useState<Record<string, string | undefined>>({});
	const { saving, saveError, run } = useMoneyMutation();
	const home = moneyHomePath(bill?.month ?? month);
	function submit(event: FormEvent) {
		event.preventDefault();
		const next = { title: title.trim() ? undefined : '请填写项目名称', amount: amountError(amount), date: dateError(dueDate) };
		setErrors(next); if (Object.values(next).some(Boolean)) return;
		const changedMonth = bill && dueDate.slice(0, 7) !== bill.month && view.payments.some((payment) => payment.billId === bill.id);
		if (changedMonth && !window.confirm('账单将移到另一月份，原月份和新月份汇总都会重新计算，实际付款日期不变。确认修改？')) return;
		void run(async () => {
			const saved = await saveMoneyBillInApp({ id: bill?.id, category, title: title.trim(), dueDate, amountCents: parseMoneyInputToCents(amount)!, accountId: category === 'fixedExpense' ? undefined : accountId || undefined, repeatMonthly, updateFutureTemplate: updateFuture, confirmMonthChange: Boolean(changedMonth), note });
			setDirty(false); navigate(moneyHomePath(saved.month), { replace: true });
		});
	}
	return <MoneyFormPage title={bill ? '编辑账单' : '新增账单'} backTo={home} dirty={dirty && !saving}>
		<form className={styles.form} onSubmit={submit} noValidate onChange={() => setDirty(true)}>
			<MoneyField id='bill-category' label='类别'><select id='bill-category' value={category} onChange={(event) => { setCategory(event.currentTarget.value as MoneyCategory); setAccountId(''); }}>{MONEY_CATEGORIES.map((item) => <option key={item.category} value={item.category}>{item.title}</option>)}</select></MoneyField>
			<MoneyInputField id='bill-title' label='项目名称' value={title} onChange={setTitle} error={errors.title} required />
			<MoneyInputField id='bill-date' label='本期应付日期' type='date' value={dueDate} onChange={setDueDate} error={errors.date} required />
			<MoneyAmountField id='bill-amount' label='本期计划金额' value={amount} onChange={setAmount} error={errors.amount} required />
			{category !== 'fixedExpense' && <>
				<MoneyField id='bill-account' label='债务账户'><select id='bill-account' value={accountId} onChange={(event) => setAccountId(event.currentTarget.value)}><option value=''>暂不关联</option>{view.accounts.filter((account) => account.category === category).map((account) => <option key={account.id} value={account.id}>{account.title}</option>)}</select></MoneyField>
				<Link className={styles.textAction} to={`/money/accounts?month=${bill?.month ?? month}&returnTo=${encodeURIComponent(window.location.pathname + window.location.search)}`}>登记新债务账户</Link>
			</>}
			<label className={styles.checkField}><input type='checkbox' checked={repeatMonthly} onChange={(event) => setRepeatMonthly(event.currentTarget.checked)} />每月重复</label>
			<p className={styles.muted}>29、30、31日遇到短月按月底处理，之后恢复原定日号。停止重复不删除已有账单。</p>
			{bill && repeatMonthly && <label className={styles.checkField}><input type='checkbox' checked={updateFuture} onChange={(event) => setUpdateFuture(event.currentTarget.checked)} />以后月份也使用此名称、日期与默认金额</label>}
			{category === 'creditCard' && <p className={styles.muted}>默认金额是你的计划，不是银行自动账单。</p>}
			<MoneyField id='bill-note' label='备注（选填）'><textarea id='bill-note' value={note} onChange={(event) => setNote(event.currentTarget.value)} /></MoneyField>
			{saveError && <p className={styles.error} role='alert'>{saveError}</p>}
			<MoneySaveButton saving={saving} label='保存账单' />
		</form>
	</MoneyFormPage>;
}
