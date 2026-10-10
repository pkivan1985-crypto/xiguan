/* eslint-disable i18next/no-literal-string -- Money ships in the existing primary Chinese locale. */
import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { summarizeDebt, type DebtAccount, type MoneyView } from '@entities/money';
import { saveDebtAccountInApp, saveMoneyTemplateInApp } from '@features/money';
import { moneyInputFromCents, parseMoneyInputToCents } from '@shared/lib/money-input';
import { amountError, useMoneyMutation } from '../model/moneyForm';
import { moneyHomePath, validMoneyMonth } from '../model/moneyNavigation';
import { moneyLabel } from '../model/moneyUi';
import { useMoneyView } from '../model/useMoneyView';
import { MoneyAmountField, MoneyField, MoneyInputField } from './MoneyFields';
import { MoneyFormPage, MoneyLoadState, MoneySaveButton } from './MoneyLayout';
import styles from './MoneyPage.module.css';

export function MoneyAccountsPage() {
	const [params] = useSearchParams();
	const month = validMoneyMonth(params.get('month'));
	const { view, error, reload } = useMoneyView(month);
	const accountId = params.get('account');
	const account = view?.accounts.find(({ id }) => id === accountId);
	if (view && (params.get('new') === '1' || account)) return <MoneyAccountForm key={account?.id ?? 'new'} account={account} month={month} />;
	return <MoneyFormPage title='负债账户管理' backTo={moneyHomePath(month)}>
		{!view ? <MoneyLoadState error={error} onRetry={reload} /> : <MoneyAccountList view={view} month={month} reload={reload} />}
	</MoneyFormPage>;
}

function MoneyAccountList({ view, month, reload }: { view: MoneyView; month: string; reload: () => void }) {
	const debt = summarizeDebt(view.accounts);
	const { saving, saveError, run } = useMoneyMutation();
	return <>
		<section className={styles.card}><h2>已登记负债 {moneyLabel(debt.knownDebtCents)}</h2><p className={styles.muted}>{debt.unknownCount ? `仍有 ${debt.unknownCount} 项金额待补充` : view.accounts.length ? '按账户汇总，不重复累计月份账单' : '尚未登记负债'}</p></section>
		<Link className={styles.save} to={`/money/accounts?new=1&month=${month}`}>登记债务账户</Link>
		<section className={styles.records} aria-label='债务账户'>
			{view.accounts.map((account) => <Link key={account.id} className={styles.record} to={`/money/accounts?month=${month}&account=${encodeURIComponent(account.id)}`}>
				<strong>{account.title}</strong><span className={styles.amount}>{account.balanceCents === undefined ? '金额待补充' : moneyLabel(account.balanceCents)}</span>
				<small>{account.category === 'creditCard' ? '信用卡' : '贷款'} · {account.balanceCents === 0 ? '已明确结清' : account.stopped ? '已停止未来计划' : '查看 / 编辑'} · 最近确认 {account.confirmedAt?.slice(0, 10) ?? '尚未确认'}</small>
			</Link>)}
		</section>
		<h2>每月重复计划</h2><p className={styles.muted}>停止只影响尚未生成的月份，已有账单和付款保留。</p>
		{view.templates.map((template) => <section className={styles.card} key={template.id}>
			<strong>{template.title}</strong><p className={styles.muted}>每月 {template.dayOfMonth} 日 · 默认 {moneyLabel(template.amountCents)} · {template.active ? '重复中' : '已停止'}</p>
			<button className={styles.secondary} type='button' disabled={saving} onClick={() => {
				if (!window.confirm(template.active ? '停止这个项目的未来重复计划？已有账单和付款记录不变。' : '恢复这个项目的未来重复计划？')) return;
				void run(async () => { await saveMoneyTemplateInApp({ id: template.id, active: !template.active }); reload(); });
			}}>{template.active ? '停止未来计划' : '恢复未来计划'}</button>
		</section>)}
		{saveError && <p className={styles.error} role='alert'>{saveError}</p>}
	</>;
}

function MoneyAccountForm({ account, month }: { account?: DebtAccount; month: string }) {
	const navigate = useNavigate();
	const [category, setCategory] = useState<DebtAccount['category']>(account?.category ?? 'creditCard');
	const [title, setTitle] = useState(account?.title ?? '');
	const [balance, setBalance] = useState(account?.balanceCents === undefined ? '' : moneyInputFromCents(account.balanceCents));
	const [stopped, setStopped] = useState(account?.stopped ?? false);
	const [dirty, setDirty] = useState(false);
	const [errors, setErrors] = useState<Record<string, string | undefined>>({});
	const { saving, saveError, run } = useMoneyMutation();
	function submit(event: FormEvent) {
		event.preventDefault();
		const next = { title: title.trim() ? undefined : '请填写账户名称', balance: balance ? amountError(balance, true) : undefined };
		setErrors(next); if (Object.values(next).some(Boolean)) return;
		void run(async () => {
			await saveDebtAccountInApp({ id: account?.id, category, title: title.trim(), balanceCents: balance ? parseMoneyInputToCents(balance) : undefined, confirmedAt: balance ? new Date().toISOString() : undefined, stopped });
			setDirty(false); navigate(`/money/accounts?month=${month}`, { replace: true });
		});
	}
	return <MoneyFormPage title={account ? '编辑债务账户' : '登记债务账户'} backTo={`/money/accounts?month=${month}`} dirty={dirty && !saving}>
		<form className={styles.form} noValidate onSubmit={submit} onChange={() => setDirty(true)}>
			<MoneyField id='debt-category' label='类型'><select id='debt-category' value={category} onChange={(event) => setCategory(event.currentTarget.value as DebtAccount['category'])}><option value='creditCard'>信用卡</option><option value='loan'>贷款</option></select></MoneyField>
			<MoneyInputField id='debt-title' label='账户名称' value={title} onChange={setTitle} error={errors.title} required />
			<MoneyAmountField id='debt-balance' label='最新剩余欠款（选填）' value={balance} onChange={setBalance} error={errors.balance} hint={account?.balanceCents !== undefined ? '明确填 0 表示结清；留空不修改已登记余额。' : '暂缺会标记金额待补充，明确填 0 才表示已结清。'} />
			<label className={styles.checkField}><input type='checkbox' checked={stopped} onChange={(event) => setStopped(event.currentTarget.checked)} />停止该账户的未来重复计划</label>
			<p className={styles.muted}>保存余额即确认当前欠款；不会自动修改或删除历史账单和付款。</p>
			{saveError && <p className={styles.error} role='alert'>{saveError}</p>}<MoneySaveButton saving={saving} label='保存账户' />
		</form>
	</MoneyFormPage>;
}
