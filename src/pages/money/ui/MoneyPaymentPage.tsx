/* eslint-disable i18next/no-literal-string -- Money ships in the existing primary Chinese locale. */
import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { summarizeMoneyBill, type MoneyBill, type MoneyPayment, type MoneyView } from '@entities/money';
import { linkMoneyPaymentInApp, revokeMoneyPaymentInApp, saveMoneyPaymentInApp } from '@features/money';
import { formatLocalDate } from '@shared/lib/date';
import { moneyInputFromCents, parseMoneyInputToCents } from '@shared/lib/money-input';
import { amountError, factError, useMoneyMutation, usePaymentSubmission } from '../model/moneyForm';
import { moneyHomePath, moneyMonthLabel, validMoneyMonth } from '../model/moneyNavigation';
import { localMoneyTime, moneyLabel } from '../model/moneyUi';
import { useMoneyView } from '../model/useMoneyView';
import { MoneyAmountField, MoneyField, MoneyInputField } from './MoneyFields';
import { MoneyFormPage, MoneyLoadState, MoneySaveButton } from './MoneyLayout';
import styles from './MoneyPage.module.css';

export function MoneyPaymentPage() {
	const { billId } = useParams();
	const [params] = useSearchParams();
	const month = validMoneyMonth(params.get('month'));
	const { view, error, reload } = useMoneyView(month);
	if (!view) return <MoneyFormPage title='记录付款' backTo={moneyHomePath(month)}><MoneyLoadState error={error} onRetry={reload} /></MoneyFormPage>;
	const bill = view.bills.find(({ id }) => id === billId);
	const paymentId = params.get('payment');
	const payment = view.payments.find(({ id, billId: paymentBillId }) => id === paymentId && paymentBillId === billId);
	if (!bill || (paymentId && !payment)) return <MoneyFormPage title='记录不存在' backTo={moneyHomePath(bill?.month ?? month)}><p className={styles.muted}>未找到该账单或付款，请返回列表。</p></MoneyFormPage>;
	return <MoneyPaymentForm key={payment?.id ?? `new-${bill.id}`} view={view} bill={bill} payment={payment} />;
}

function MoneyPaymentForm({ view, bill, payment }: { view: MoneyView; bill: MoneyBill; payment?: MoneyPayment }) {
	const navigate = useNavigate();
	const summary = summarizeMoneyBill(bill, view.payments);
	const [amount, setAmount] = useState(moneyInputFromCents(payment?.amountCents ?? summary.remainingCents));
	const [date, setDate] = useState(payment?.localDate ?? formatLocalDate(new Date()));
	const [time, setTime] = useState(payment?.occurredTime ?? localMoneyTime());
	const [account, setAccount] = useState(payment?.accountLabel ?? '');
	const [note, setNote] = useState(payment?.note ?? '');
	const [balance, setBalance] = useState('');
	const [sourceId, setSourceId] = useState('');
	const [dirty, setDirty] = useState(false);
	const [errors, setErrors] = useState<Record<string, string | undefined>>({});
	const { saving, saveError, run } = useMoneyMutation();
	const submissionId = usePaymentSubmission();
	const linked = payment && !payment.ownedEntryId;
	const source = linked ? view.entries.find((entry) => entry.sourceId === payment.sourceId) : undefined;
	const availableSources = view.entries.filter((entry) => entry.type !== 'income' && !view.payments.some((item) => item.sourceId === entry.sourceId && !item.revokedAt));
	function submit(event: FormEvent) {
		event.preventDefault();
		if (sourceId) {
			void run(async () => { const input = { billId: bill.id, sourceId }; await linkMoneyPaymentInApp({ ...input, submissionId: submissionId(input) }); setDirty(false); navigate(moneyHomePath(bill.month), { replace: true, state: { moneyFeedback: '付款已关联' } }); });
			return;
		}
		const next = { amount: amountError(amount), date: factError(date, time), balance: balance ? amountError(balance, true) : undefined };
		setErrors(next); if (Object.values(next).some(Boolean)) return;
		void run(async () => {
			const input = { id: payment?.id, billId: bill.id, amountCents: parseMoneyInputToCents(amount)!, localDate: date, occurredTime: time, accountLabel: account, note, remainingDebtCents: balance ? parseMoneyInputToCents(balance) : undefined };
			await saveMoneyPaymentInApp({ ...input, submissionId: submissionId(input) });
			setDirty(false); navigate(moneyHomePath(bill.month), { replace: true, state: { moneyFeedback: '付款已保存' } });
		});
	}
	return <MoneyFormPage title={payment ? '修改付款' : '记录付款'} backTo={moneyHomePath(bill.month)} dirty={dirty && !saving}>
		<section className={styles.card}>
			<h2>{bill.title}</h2>
			<p className={styles.muted}>{moneyMonthLabel(bill.month)}账单 · 应付日期 {bill.dueDate}</p>
			<p className={styles.muted}>计划 {moneyLabel(bill.amountCents)} · 待付 {moneyLabel(summary.remainingCents)}</p>
		</section>
		<p className={styles.muted}>这里只登记已经付款，应用不执行转账。</p>
		{linked ? <section className={styles.card}>
			<p className={styles.muted}>此付款关联原有账目。金额、日期、账户和备注请到原记录修改，不另外复制一笔。</p>
			{source ? <Link className={styles.textAction} to={source.editUrl ?? `/money/records?month=${source.date.slice(0, 7)}&entry=${encodeURIComponent(source.sourceId)}`}>编辑原记录</Link> : <p className={styles.error}>原记录不可编辑或已不可用，请检查原记录。</p>}
		</section> : !payment?.revokedAt && <form className={styles.form} onSubmit={submit} noValidate onChange={() => setDirty(true)}>
			{!payment && availableSources.length > 0 && <MoneyField id='payment-source' label='记录方式'><select id='payment-source' value={sourceId} onChange={(event) => setSourceId(event.currentTarget.value)}><option value=''>登记一笔新付款</option>{availableSources.map((entry) => <option key={entry.sourceId} value={entry.sourceId}>{entry.date} {entry.item} {moneyLabel(entry.amountCents)}（关联现有账目）</option>)}</select></MoneyField>}
			{!sourceId && <>
				<MoneyAmountField id='payment-amount' label='实付金额' value={amount} onChange={setAmount} error={errors.amount} required />
				<div className={styles.dateTime}><MoneyInputField id='payment-date' label='实际付款日期' type='date' value={date} onChange={setDate} error={errors.date} required /><MoneyInputField id='payment-time' label='实际付款时间' type='time' value={time} onChange={setTime} required /></div>
				<MoneyInputField id='payment-account' label='付款账户（选填）' value={account} onChange={setAccount} />
				<MoneyField id='payment-note' label='备注（选填）'><textarea id='payment-note' value={note} onChange={(event) => setNote(event.currentTarget.value)} /></MoneyField>
				{bill.category !== 'fixedExpense' && bill.accountId && <MoneyAmountField id='payment-balance' label='付款后剩余欠款（选填）' value={balance} onChange={setBalance} error={errors.balance} hint='留空保持原余额；不按整笔月供自动扣本金。历史补记不会覆盖较新的余额确认。' />}
			</>}
			{saveError && <p className={styles.error} role='alert'>{saveError}</p>}
			<MoneySaveButton saving={saving} label={sourceId ? '确认关联付款' : '保存付款'} />
		</form>}
		{payment?.revokedAt && <p className={styles.muted}>这笔付款已撤销，不能重复修改。</p>}
		{payment && !payment.revokedAt && <>
			<p className={styles.muted}>修改或撤销旧付款不会自动改写剩余负债，请到负债管理重新确认余额。</p>
			{linked && saveError && <p className={styles.error} role='alert'>{saveError}</p>}
			<button type='button' className={styles.danger} disabled={saving} onClick={() => {
				const message = payment.ownedEntryId ? '撤销这笔付款及应用为其创建的账目？账单将重新计算，原负债余额不会自动变更。' : '仅解除这笔付款与原有账目的关联？原账目会保留，不会删除。';
				if (!window.confirm(message)) return;
				void run(async () => { await revokeMoneyPaymentInApp(payment.id); setDirty(false); navigate(moneyHomePath(bill.month), { replace: true, state: { moneyFeedback: payment.ownedEntryId ? '付款已撤销' : '付款关联已解除' } }); });
			}}>{linked ? '解除付款关联' : '撤销付款登记'}</button>
		</>}
	</MoneyFormPage>;
}
