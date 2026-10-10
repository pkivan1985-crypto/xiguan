/* eslint-disable i18next/no-literal-string -- Money ships in the existing primary Chinese locale. */
import { useEffect, useState, type ReactNode } from 'react';
import { PiArrowLeft, PiCaretLeft, PiCaretRight, PiCheck } from 'react-icons/pi';
import { useNavigate } from 'react-router';

import { adjacentMoneyMonth, moneyNavigationNeedsConfirmation } from '../model/moneyNavigation';
import styles from './MoneyPage.module.css';

export function MoneyFormPage({ title, backTo, dirty = false, children }: { title: string; backTo: string; dirty?: boolean; children: ReactNode }) {
	const navigate = useNavigate();
	const [pendingTarget, setPendingTarget] = useState<string>();
	useEffect(() => {
		if (!dirty) return;
		const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
		window.addEventListener('beforeunload', warn);
		return () => window.removeEventListener('beforeunload', warn);
	}, [dirty]);
	return (
		<main className={styles.formPage} onClickCapture={(event) => {
			const anchor = (event.target as Element).closest('a[href]');
			const target = anchor?.getAttribute('href');
			if (target && moneyNavigationNeedsConfirmation(dirty, window.location.pathname + window.location.search, target)) {
				event.preventDefault(); event.stopPropagation(); setPendingTarget(target);
			}
		}}>
			{pendingTarget && <MoneyUnsavedNotice onKeep={() => setPendingTarget(undefined)} onDiscard={() => navigate(pendingTarget)} />}
			<header className={styles.header}>
				<button type='button' className={styles.iconButton} aria-label='返回' onClick={() => {
					if (dirty) setPendingTarget(backTo); else navigate(backTo);
				}}><PiArrowLeft aria-hidden='true' /></button>
				<h1>{title}</h1>
			</header>
			{children}
		</main>
	);
}

export function MoneyUnsavedNotice({ onKeep, onDiscard }: { onKeep: () => void; onDiscard: () => void }) {
	return <section className={styles.card} role='alertdialog' aria-modal='false' aria-labelledby='money-unsaved-title'>
		<h2 id='money-unsaved-title'>还有未保存内容</h2>
		<p className={styles.muted}>继续填写，或放弃本次修改后离开。</p>
		<div className={styles.actions}>
			<button type='button' className={styles.secondary} autoFocus onClick={onKeep}>继续填写</button>
			<button type='button' className={styles.danger} onClick={onDiscard}>放弃并离开</button>
		</div>
	</section>;
}

export function MoneyMonthPicker({ month, onChange }: { month: string; onChange: (month: string) => void }) {
	return (
		<div className={styles.monthPicker}>
			<button type='button' className={styles.iconButton} aria-label='上个月' onClick={() => onChange(adjacentMoneyMonth(month, -1))}><PiCaretLeft aria-hidden='true' /></button>
			<input aria-label='选择月份' type='month' value={month} onChange={(event) => { if (event.currentTarget.value) onChange(event.currentTarget.value); }} />
			<button type='button' className={styles.iconButton} aria-label='下个月' onClick={() => onChange(adjacentMoneyMonth(month, 1))}><PiCaretRight aria-hidden='true' /></button>
		</div>
	);
}

export function MoneySaveButton({ saving, label = '保存' }: { saving: boolean; label?: string }) {
	return <button type='submit' className={styles.save} disabled={saving} aria-busy={saving}><PiCheck aria-hidden='true' />{saving ? '正在保存…' : label}</button>;
}

export function MoneyLoadState({ error, onRetry }: { error: boolean; onRetry: () => void }) {
	return <section className={styles.state} aria-live='polite'>
		<p>{error ? '读取失败，数据未被修改。' : '正在读取…'}</p>
		{error && <button type='button' className={styles.secondary} onClick={onRetry}>重新读取</button>}
	</section>;
}
