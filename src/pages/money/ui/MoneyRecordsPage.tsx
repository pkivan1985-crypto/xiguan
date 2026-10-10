/* eslint-disable i18next/no-literal-string -- Money ships in the existing primary Chinese locale. */
import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import type { MoneyEntry, MoneyView } from '@entities/money';
import { saveMoneyEntryInApp } from '@features/money';
import { formatLocalDate } from '@shared/lib/date';
import { moneyInputFromCents, parseMoneyInputToCents } from '@shared/lib/money-input';
import { amountError, factError, useMoneyMutation } from '../model/moneyForm';
import { moneyHomePath, validMoneyMonth } from '../model/moneyNavigation';
import { localMoneyTime, moneyLabel } from '../model/moneyUi';
import { useMoneyView } from '../model/useMoneyView';
import { MoneyAmountField, MoneyField, MoneyInputField } from './MoneyFields';
import { MoneyFormPage, MoneyLoadState, MoneyMonthPicker, MoneySaveButton } from './MoneyLayout';
import styles from './MoneyPage.module.css';

const typeLabels = { income: '收入', expense: '支出', repayment: '还款' };

export function MoneyRecordsPage() {
	const [params, setParams] = useSearchParams();
	const month = validMoneyMonth(params.get('month'));
	const { view, error, reload } = useMoneyView(month);
	const entryId = params.get('entry');
	const entry = view?.entries.find((item) => item.id === entryId || item.sourceId === entryId);
	const payment = entry && view?.payments.find((item) => item.sourceId === entry.sourceId && !item.revokedAt);
	if (params.get('new') === '1' && view) return <MoneyEntryForm key='new' month={month} view={view} />;
	if (entryId && view) {
		if (!entry) return <MoneyFormPage title='记录不存在' backTo={`/money/records?month=${month}`}><p className={styles.muted}>未找到该收支记录。</p></MoneyFormPage>;
		if (entry.editUrl || payment?.ownedEntryId) return <MoneyFormPage title='收支记录详情' backTo={`/money/records?month=${month}`}>
			<section className={styles.card}><h2>{entry.item}</h2><p>{moneyLabel(entry.amountCents)} · {typeLabels[entry.type]}</p><p className={styles.muted}>{entry.date} {entry.time} · {entry.categoryLabel} · {entry.accountLabel}</p><p className={styles.muted}>{entry.note}</p></section>
			<p className={styles.muted}>此记录来自{entry.editUrl ? '原有记账或额外开支' : '账单付款'}，请使用原入口编辑，保持关联一致。</p>
			<Link className={styles.save} to={entry.editUrl ?? `/money/bills/${encodeURIComponent(payment!.billId)}/pay?payment=${encodeURIComponent(payment!.id)}`}>编辑原记录</Link>
		</MoneyFormPage>;
		return <MoneyEntryForm key={entry.id} month={month} view={view} entry={entry} />;
	}
	return <MoneyFormPage title='收支记录' backTo={moneyHomePath(month)}>
		{!view ? <MoneyLoadState error={error} onRetry={reload} /> : <MoneyRecordList view={view} month={month} onMonthChange={(next) => setParams({ month: next })} />}
	</MoneyFormPage>;
}

function MoneyRecordList({ view, month, onMonthChange }: { view: MoneyView; month: string; onMonthChange: (month: string) => void }) {
	const [keyword, setKeyword] = useState('');
	const [type, setType] = useState('all');
	const query = keyword.trim().toLocaleLowerCase();
	const entries = view.entries.filter((entry) => entry.date.slice(0, 7) === month && (type === 'all' || entry.type === type) && [entry.item, entry.categoryLabel, entry.accountLabel, entry.note].join(' ').toLocaleLowerCase().includes(query));
	return <>
		<MoneyMonthPicker month={month} onChange={onMonthChange} />
		<MoneyInputField id='records-keyword' label='查询事项、类别、账户或备注' type='search' value={keyword} onChange={setKeyword} />
		<MoneyField id='records-type' label='记录类型'><select id='records-type' value={type} onChange={(event) => setType(event.currentTarget.value)}><option value='all'>全部</option>{Object.entries(typeLabels).map(([value, title]) => <option key={value} value={value}>{title}</option>)}</select></MoneyField>
		<Link className={styles.save} to={`/money/records?new=1&month=${month}`}>新增独立收支</Link>
		<section className={styles.records} aria-label='收支查询结果'>
			{entries.length === 0 && <p className={styles.muted}>本月没有符合查询条件的记录。</p>}
			{[...entries].sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time) || a.sourceId.localeCompare(b.sourceId)).map((entry) => <Link className={styles.record} key={entry.sourceId} to={`/money/records?month=${month}&entry=${encodeURIComponent(entry.sourceId)}`}>
				<strong>{entry.item || '未填写事项'}</strong><span className={styles.amount}>{moneyLabel(entry.amountCents)}</span>
				<small>{[`${entry.date} ${entry.time}`, typeLabels[entry.type], entry.categoryLabel, entry.accountLabel, entry.editUrl ? '原有记录' : '钱专项记录'].filter(Boolean).join(' · ')}</small>
				{entry.note && <small>{entry.note}</small>}
			</Link>)}
		</section>
	</>;
}

function MoneyEntryForm({ month, view, entry }: { month: string; view: MoneyView; entry?: MoneyEntry }) {
	const navigate = useNavigate();
	const [type, setType] = useState<'income' | 'expense'>(entry?.type === 'income' ? 'income' : 'expense');
	const [amount, setAmount] = useState(entry ? moneyInputFromCents(entry.amountCents) : '');
	const [date, setDate] = useState(entry?.date ?? formatLocalDate(new Date()));
	const [time, setTime] = useState(entry?.time ?? localMoneyTime());
	const [item, setItem] = useState(entry?.item ?? '');
	const [category, setCategory] = useState(entry?.categoryLabel ?? '');
	const [account, setAccount] = useState(entry?.accountLabel ?? '');
	const [note, setNote] = useState(entry?.note ?? '');
	const [dirty, setDirty] = useState(false);
	const [errors, setErrors] = useState<Record<string, string | undefined>>({});
	const { saving, saveError, run } = useMoneyMutation();
	function submit(event: FormEvent) {
		event.preventDefault();
		const next = { amount: amountError(amount), date: factError(date, time), item: item.trim() ? undefined : '请填写事项' };
		setErrors(next); if (Object.values(next).some(Boolean)) return;
		void run(async () => {
			await saveMoneyEntryInApp({ id: entry?.id, type, amountCents: parseMoneyInputToCents(amount)!, localDate: date, occurredTime: time, item: item.trim(), categoryLabel: category, accountLabel: account, note });
			setDirty(false); navigate(`/money/records?month=${date.slice(0, 7)}`, { replace: true });
		});
	}
	return <MoneyFormPage title={entry ? '编辑收支' : '新增收支'} backTo={`/money/records?month=${month}`} dirty={dirty && !saving}>
		<form className={styles.form} onSubmit={submit} noValidate onChange={() => setDirty(true)}>
			<MoneyField id='entry-type' label='类型'><select id='entry-type' value={type} onChange={(event) => setType(event.currentTarget.value as 'income' | 'expense')}><option value='expense'>支出</option><option value='income'>收入</option></select></MoneyField>
			<MoneyAmountField id='entry-amount' label='金额' value={amount} onChange={setAmount} error={errors.amount} required />
			<div className={styles.dateTime}><MoneyInputField id='entry-date' label='实际日期' type='date' value={date} onChange={setDate} error={errors.date} required /><MoneyInputField id='entry-time' label='实际时间' type='time' value={time} onChange={setTime} required /></div>
			<MoneyInputField id='entry-item' label='事项' value={item} onChange={setItem} error={errors.item} required />
			<MoneyInputField id='entry-category' label='类别（选填）' value={category} onChange={setCategory} />
			<MoneyField id='entry-account' label='账户（选填）'><input id='entry-account' list='money-account-labels' value={account} onChange={(event) => setAccount(event.currentTarget.value)} /><datalist id='money-account-labels'>{[...new Set(view.entries.map((value) => value.accountLabel).filter(Boolean))].map((value) => <option key={value} value={value} />)}</datalist></MoneyField>
			<MoneyField id='entry-note' label='备注（选填）'><textarea id='entry-note' value={note} onChange={(event) => setNote(event.currentTarget.value)} /></MoneyField>
			<p className={styles.muted}>独立保存收支，不会新建习惯；账单还款请从对应账单登记。</p>
			{saveError && <p className={styles.error} role='alert'>{saveError}</p>}<MoneySaveButton saving={saving} label='保存收支' />
		</form>
	</MoneyFormPage>;
}
