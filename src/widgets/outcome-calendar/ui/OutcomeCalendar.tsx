import clsx from 'clsx';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { PiCaretLeft, PiCaretRight, PiCheckBold } from 'react-icons/pi';

import { buildMonthCells } from '../model/buildMonthCells';
import styles from './OutcomeCalendar.module.css';

interface OutcomeCalendarProps {
	year: number;
	monthIndex: number;
	outcomeDates: readonly string[];
	todayLocalDate: string;
	onPreviousMonth: () => void;
	onNextMonth: () => void;
	canGoNext: boolean;
	selectedDate?: string;
	onSelectDate?: (localDate: string) => void;
	children?: ReactNode;
}

function OutcomeCalendar({
	year,
	monthIndex,
	outcomeDates,
	todayLocalDate,
	onPreviousMonth,
	onNextMonth,
	canGoNext,
	selectedDate,
	onSelectDate,
	children,
}: OutcomeCalendarProps) {
	const { t } = useTranslation();
	const completed = new Set(outcomeDates);
	const weekdays = Array.from({ length: 7 }, (_, index) => new Intl.DateTimeFormat(undefined, { weekday: 'narrow' }).format(new Date(2024, 0, index + 1)));

	return (
		<section className={styles.calendar} aria-labelledby='outcome-calendar-title'>
			<header className={styles.header}>
				<button type='button' onClick={onPreviousMonth} aria-label={t('shell.home.previousMonth')}><PiCaretLeft aria-hidden='true' /></button>
				<h3 id='outcome-calendar-title'>{t('shell.home.monthLabel', { year, month: monthIndex + 1 })}</h3>
				<button type='button' onClick={onNextMonth} disabled={!canGoNext} aria-label={t('shell.home.nextMonth')}><PiCaretRight aria-hidden='true' /></button>
			</header>
			<div className={styles.weekdays} aria-hidden='true'>
				{weekdays.map((weekday, index) => <span key={`${weekday}-${index}`}>{weekday}</span>)}
			</div>
			<div className={styles.grid}>
				{buildMonthCells(year, monthIndex).map((cell) => {
					if (!cell.localDate) return <span className={styles.day} key={cell.key} aria-hidden='true' />;
					const isOutcome = completed.has(cell.localDate);
					const isToday = cell.localDate === todayLocalDate;
					const isSelected = cell.localDate === selectedDate;
					return <button
						type='button'
						key={cell.key}
						className={clsx(styles.day, isOutcome && styles.outcome, isToday && styles.today, isSelected && styles.selected)}
						aria-current={isToday ? 'date' : undefined}
						aria-label={isOutcome ? t('shell.home.outcomeDay', { date: cell.localDate }) : undefined}
						aria-pressed={isSelected}
						data-selected={isSelected || undefined}
						data-today={isToday || undefined}
						disabled={!onSelectDate || cell.localDate > todayLocalDate}
						onClick={() => onSelectDate?.(cell.localDate!)}
					>
						<span className={styles.date}>
							<span>{cell.day}</span>
							{isOutcome && (
								<span
									className={styles.outcomeMarker}
									data-outcome-marker='true'
									aria-hidden='true'
								>
									<PiCheckBold />
								</span>
							)}
						</span>
					</button>;
				})}
			</div>
			{children}
		</section>
	);
}

export { OutcomeCalendar };
export type { OutcomeCalendarProps };
