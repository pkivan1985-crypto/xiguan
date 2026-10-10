import type { ReactNode } from 'react';

import styles from './MoneyPage.module.css';

interface MoneyFieldProps {
	id: string;
	label: string;
	hint?: string;
	error?: string;
	children: ReactNode;
}

export function MoneyField({ id, label, hint, error, children }: MoneyFieldProps) {
	return (
		<div className={styles.field}>
			<label htmlFor={id}>{label}</label>
			{children}
			{hint && <small id={`${id}-hint`}>{hint}</small>}
			{error && <small id={`${id}-error`} className={styles.error} role='alert'>{error}</small>}
		</div>
	);
}

interface MoneyAmountFieldProps extends Omit<MoneyFieldProps, 'children'> {
	value: string;
	onChange: (value: string) => void;
	required?: boolean;
	disabled?: boolean;
}

// Stable module-level component: keep the editing string, including trailing zeros
// and decimal points. Validation belongs to blur/submit, never each keystroke.
export function MoneyAmountField({ id, label, hint, error, value, onChange, required, disabled }: MoneyAmountFieldProps) {
	const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined;
	return (
		<MoneyField id={id} label={label} hint={hint} error={error}>
			<input
				id={id}
				name={id}
				type='text'
				inputMode='decimal'
				autoComplete='off'
				value={value}
				required={required}
				disabled={disabled}
				aria-invalid={Boolean(error)}
				aria-describedby={describedBy}
				onChange={(event) => onChange(event.currentTarget.value)}
			/>
		</MoneyField>
	);
}

export function MoneyInputField({ id, label, hint, error, value, onChange, type = 'text', required, disabled }: MoneyAmountFieldProps & { type?: 'text' | 'date' | 'time' | 'search' }) {
	return <MoneyField id={id} label={label} hint={hint} error={error}>
		<input id={id} name={id} type={type} value={value} required={required} disabled={disabled} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined} onChange={(event) => onChange(event.currentTarget.value)} />
	</MoneyField>;
}
