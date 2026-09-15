/* eslint-disable i18next/no-literal-string -- This page currently ships in the product's primary Chinese locale. */
import { useMemo, useState, type FormEvent } from 'react';
import { PiArrowLeft, PiCalendarBlank, PiCheck, PiClock, PiListBullets, PiNotePencil, PiPencilSimple, PiPlus, PiReceipt, PiTrash, PiWallet, PiX } from 'react-icons/pi';
import { useNavigate, useSearchParams } from 'react-router';
import type { DailyHabitView } from '@features/load-daily-habits';
import { APP_ROUTES } from '@shared/config';
import { formatLocalDate } from '@shared/lib/date';
import { formatMoneyInput, moneyInputFromCents, normalizeMoneyInput, prepareMoneyInputForEditing } from '@shared/lib/money-input';
import { buildBookkeepingEntry, bookkeepingTotals, normalizeBookkeepingEntries, removeBookkeepingEntryInApp, saveBookkeepingEntryInApp, type BookkeepingFormValues } from '../model/bookkeepingRecord';
import styles from './BookkeepingRecordPage.module.css';

interface Props { habit: DailyHabitView; localDate: string }

function money(cents: number): string {
	return new Intl.NumberFormat('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(cents / 100);
}

function BookkeepingRecordPage({ habit, localDate }: Props) {
	const navigate = useNavigate();
	const [searchParams] = useSearchParams();
	const entryId = searchParams.get('entry');
	const [entries, setEntries] = useState(() => normalizeBookkeepingEntries(habit.details));
	const existing = entries.find(({ id }) => id === entryId);
	const config = habit.habitConfig?.kind === 'bookkeeping' ? habit.habitConfig : undefined;
	const accounts = config?.accounts ?? [{ id: 'cash', label: '现金' }];
	const categories = config?.categories ?? [{ id: 'other', label: '其他' }];
	const [values, setValues] = useState<BookkeepingFormValues>(() => existing ? {
		type: existing.type, amount: moneyInputFromCents(existing.amountCents), categoryId: existing.categoryId,
		categoryLabel: existing.categoryLabel, accountId: existing.accountId, accountLabel: existing.accountLabel,
		item: existing.item ?? '', note: existing.note ?? '', localDate: existing.localDate, occurredTime: existing.occurredTime,
	} : {
		type: 'expense', amount: '', categoryId: categories[0]!.id, categoryLabel: categories[0]!.label,
		accountId: accounts[0]!.id, accountLabel: accounts[0]!.label, item: '', note: '', localDate,
		occurredTime: new Date().toTimeString().slice(0, 5),
	});
	const [saving, setSaving] = useState(false);
	const [invalid, setInvalid] = useState(false);
	const totals = useMemo(() => bookkeepingTotals(entries), [entries]);

	function route(date = localDate, entry?: string): string {
		const base = APP_ROUTES.habitRecord(habit.id, date);
		return entry ? `${base}&entry=${encodeURIComponent(entry)}` : base;
	}

	async function save(event: FormEvent): Promise<void> {
		event.preventDefault();
		const nowIso = new Date().toISOString();
		const entry = buildBookkeepingEntry(values, { id: existing?.id ?? crypto.randomUUID(), nowIso, createdAt: existing?.createdAt });
		if (!entry) { setInvalid(true); return; }
		setSaving(true);
		try {
			await saveBookkeepingEntryInApp({ userCardId: habit.id, sourceLocalDate: existing?.localDate ?? localDate, entry, nowIso, submissionId: crypto.randomUUID() });
			if (entry.localDate !== localDate) { navigate(route(entry.localDate), { replace: true }); return; }
			setEntries((current) => current.some(({ id }) => id === entry.id) ? current.map((item) => item.id === entry.id ? entry : item) : [...current, entry]);
			navigate(route(), { replace: true });
		} catch { setInvalid(true); } finally { setSaving(false); }
	}

	async function remove(): Promise<void> {
		if (!existing || !window.confirm('确定删除这笔账吗？')) return;
		setSaving(true);
		try {
			await removeBookkeepingEntryInApp({ userCardId: habit.id, localDate: existing.localDate, entryId: existing.id, nowIso: new Date().toISOString(), submissionId: crypto.randomUUID() });
			setEntries((current) => current.filter(({ id }) => id !== existing.id));
			navigate(route(), { replace: true });
		} catch { setInvalid(true); } finally { setSaving(false); }
	}

	if (!entryId) return <main className={styles.page}>
		<header className={styles.header}><button type='button' onClick={() => navigate(-1)} aria-label='返回'><PiArrowLeft /></button><div><small>{localDate}</small><h1>今日账本</h1></div><button type='button' onClick={() => navigate(APP_ROUTES.HOME)} aria-label='关闭'><PiX /></button></header>
		<section className={styles.summary}><div><small>今日支出</small><strong>¥{money(totals.expenseCents)}</strong></div><div><small>今日收入</small><strong data-income='true'>+¥{money(totals.incomeCents)}</strong></div><span>{entries.length} 笔记录</span></section>
		<section className={styles.list}>{entries.length === 0 ? <p>今天还没有收支，记下第一笔。</p> : [...entries].sort((a, b) => b.occurredTime.localeCompare(a.occurredTime)).map((entry) => <button type='button' key={entry.id} onClick={() => navigate(route(localDate, entry.id))}><span className={styles.category}><PiReceipt /></span><span><strong>{entry.item || entry.categoryLabel}</strong><small>{entry.occurredTime} · {entry.accountLabel} · {entry.categoryLabel}</small></span><b data-income={entry.type === 'income'}>{entry.type === 'income' ? '+' : '-'}¥{money(entry.amountCents)}</b><PiPencilSimple /></button>)}</section>
		<nav className={styles.ledgerActions}><button type='button' onClick={() => navigate(route(localDate, 'new'))}><PiPlus />记一笔</button><button type='button' onClick={() => navigate(APP_ROUTES.goalDetails(habit.id))}><PiListBullets />查看统计</button></nav>
	</main>;

	return <main className={`${styles.page} ${styles.entryPage}`}>
		<header className={styles.header}><button type='button' onClick={() => navigate(route())} aria-label='返回账本'><PiArrowLeft /></button><div><small>{existing ? '修改记录' : '新增记录'}</small><h1>记一笔</h1></div><button type='button' onClick={() => navigate(APP_ROUTES.HOME)} aria-label='关闭'><PiX /></button></header>
		<form className={styles.form} onSubmit={(event) => void save(event)}>
			<div className={styles.typeSwitch}><button type='button' aria-pressed={values.type === 'expense'} onClick={() => setValues((current) => ({ ...current, type: 'expense' }))}>支出</button><button type='button' aria-pressed={values.type === 'income'} onClick={() => setValues((current) => ({ ...current, type: 'income' }))}>收入</button></div>
			<label className={styles.amount}><span>¥</span><input autoFocus type='text' inputMode='decimal' pattern='[0-9]*([.,][0-9]{0,2})?' value={values.amount} placeholder='0.00' onChange={(event) => {
				const amount = normalizeMoneyInput(event.target.value);
				if (amount !== undefined) setValues((current) => ({ ...current, amount }));
				setInvalid(false);
			}} onFocus={() => setValues((current) => ({ ...current, amount: prepareMoneyInputForEditing(current.amount) }))} onBlur={() => setValues((current) => ({ ...current, amount: formatMoneyInput(current.amount) }))} /></label>
			<section className={styles.dateTime}><label><PiCalendarBlank /><span>日期</span><input type='date' value={values.localDate} max={formatLocalDate(new Date())} onChange={(event) => setValues((current) => ({ ...current, localDate: event.target.value }))} /></label><label><PiClock /><span>时间</span><input type='time' value={values.occurredTime} onChange={(event) => setValues((current) => ({ ...current, occurredTime: event.target.value }))} /></label></section>
			<fieldset><legend>分类</legend><div className={styles.chips}>{categories.map((option) => <button type='button' key={option.id} aria-pressed={values.categoryId === option.id} onClick={() => setValues((current) => ({ ...current, categoryId: option.id, categoryLabel: option.label }))}>{option.label}</button>)}</div></fieldset>
			<fieldset><legend>账户</legend><div className={styles.chips}>{accounts.map((option) => <button type='button' key={option.id} aria-pressed={values.accountId === option.id} onClick={() => setValues((current) => ({ ...current, accountId: option.id, accountLabel: option.label }))}><PiWallet />{option.label}</button>)}</div></fieldset>
			<label className={styles.textField}><PiReceipt /><input maxLength={80} value={values.item} placeholder='买了什么或收入来源（选填）' onChange={(event) => setValues((current) => ({ ...current, item: event.target.value }))} /></label>
			<label className={styles.textField}><PiNotePencil /><textarea maxLength={280} value={values.note} placeholder='备注（选填）' onChange={(event) => setValues((current) => ({ ...current, note: event.target.value }))} /></label>
			{invalid && <p className={styles.error} role='alert'>请检查金额、日期、时间、分类和账户。</p>}
			<button className={styles.save} type='submit' disabled={saving}><PiCheck />保存这笔账</button>
			{existing && <button className={styles.delete} type='button' disabled={saving} onClick={() => void remove()}><PiTrash />删除这笔账</button>}
		</form>
	</main>;
}

export { BookkeepingRecordPage };
