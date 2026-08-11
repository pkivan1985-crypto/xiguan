/* eslint-disable i18next/no-literal-string -- Pace punctuation, unit, and mm/ss abbreviations are stable measurement notation. */
import {
	useRef,
	type ChangeEvent,
	type KeyboardEvent,
	type ReactNode,
} from 'react';

import styles from './SegmentedPaceInput.module.css';

export interface PaceSegments {
	minutes: string;
	seconds: string;
}

interface SegmentedPaceInputProps {
	label: string;
	value: string;
	onChange: (value: string) => void;
	disabled?: boolean;
	invalid?: boolean;
	icon?: ReactNode;
	className?: string;
}

function paceDigits(value: string): string {
	return value.replace(/\D/g, '').slice(0, 2);
}

export function parsePaceSegments(value: string): PaceSegments {
	const [minutes = '', seconds = ''] = value.split(':', 2);
	return {
		minutes: paceDigits(minutes),
		seconds: paceDigits(seconds),
	};
}

export function paceValueFromSegments(minutes: string, seconds: string): string {
	return `${paceDigits(minutes)}:${paceDigits(seconds)}`;
}

export function SegmentedPaceInput({
	label,
	value,
	onChange,
	disabled = false,
	invalid = false,
	icon,
	className,
}: SegmentedPaceInputProps) {
	const minutesRef = useRef<HTMLInputElement>(null);
	const secondsRef = useRef<HTMLInputElement>(null);
	const { minutes, seconds } = parsePaceSegments(value);

	function changeMinutes(event: ChangeEvent<HTMLInputElement>) {
		const nextMinutes = paceDigits(event.target.value);
		onChange(paceValueFromSegments(nextMinutes, seconds));
		if (nextMinutes.length === 2) secondsRef.current?.focus();
	}

	function changeSeconds(event: ChangeEvent<HTMLInputElement>) {
		onChange(paceValueFromSegments(minutes, event.target.value));
	}

	function moveBackToMinutes(event: KeyboardEvent<HTMLInputElement>) {
		if (event.key === 'Backspace' && seconds.length === 0) {
			minutesRef.current?.focus();
		}
	}

	return (
		<label className={`${styles.field}${className ? ` ${className}` : ''}`}>
			<span>{icon}{label}</span>
			<div
				className={styles.control}
				role='group'
				aria-label={label}
				data-invalid={invalid || undefined}
			>
				<input
					ref={minutesRef}
					type='text'
					inputMode='numeric'
					pattern='[0-9]*'
					maxLength={2}
					value={minutes}
					onChange={changeMinutes}
					disabled={disabled}
					aria-label={`${label} (mm)`}
					aria-invalid={invalid || undefined}
				/>
				<span aria-hidden='true'>:</span>
				<input
					ref={secondsRef}
					type='text'
					inputMode='numeric'
					pattern='[0-9]*'
					maxLength={2}
					value={seconds}
					onChange={changeSeconds}
					onKeyDown={moveBackToMinutes}
					disabled={disabled}
					aria-label={`${label} (ss)`}
					aria-invalid={invalid || undefined}
				/>
				<small aria-hidden='true'>/km</small>
			</div>
		</label>
	);
}

export type { SegmentedPaceInputProps };
