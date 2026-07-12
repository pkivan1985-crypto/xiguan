/* eslint-disable i18next/no-literal-string -- The checkmark is a semantic outcome glyph with translated accessible text. */
import styles from './OutcomeCalendar.module.css';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { buildMonthCells } from '../model/buildMonthCells';

interface OutcomeCalendarProps {
	year: number;
	monthIndex: number;
	outcomeDates: readonly string[];
	todayLocalDate: string;
	onPreviousMonth: () => void;
	onNextMonth: () => void;
	canGoNext: boolean;
}

function OutcomeCalendar({ year, monthIndex, outcomeDates, todayLocalDate, onPreviousMonth, onNextMonth, canGoNext }: OutcomeCalendarProps) {
	const { t } = useTranslation();
	const completed = new Set(outcomeDates);
	const weekdays = Array.from({ length: 7 }, (_, index) => new Intl.DateTimeFormat(undefined, { weekday: 'narrow' }).format(new Date(2024, 0, index + 1)));

	return (
		<section className={styles.calendar} aria-labelledby='outcome-calendar-title'>
			<header className={styles.header}>
				<button type='button' onClick={onPreviousMonth} aria-label={t('shell.home.previousMonth')}><FiChevronLeft aria-hidden='true' /></button>
				<h3 id='outcome-calendar-title'>{t('shell.home.monthLabel', { year, month: monthIndex + 1 })}</h3>
				<button type='button' onClick={onNextMonth} disabled={!canGoNext} aria-label={t('shell.home.nextMonth')}><FiChevronRight aria-hidden='true' /></button>
			</header>
			<div className={styles.weekdays} aria-hidden='true'>
				{weekdays.map((weekday, index) => <span key={`${weekday}-${index}`}>{weekday}</span>)}
			</div>
			<div className={styles.grid}>
				{buildMonthCells(year, monthIndex).map((cell) => {
					if (!cell.localDate) return <span className={styles.day} key={cell.key} aria-hidden='true' />;
					const isOutcome = completed.has(cell.localDate);
					const isToday = cell.localDate === todayLocalDate;
					return <span
						key={cell.key}
						className={clsx(styles.day, isOutcome && styles.outcome, isToday && styles.today)}
						aria-current={isToday ? 'date' : undefined}
						aria-label={isOutcome ? t('shell.home.outcomeDay', { date: cell.localDate }) : undefined}
					>{isOutcome ? '✓' : cell.day}</span>;
				})}
			</div>
		</section>
	);
}

export { OutcomeCalendar };
export type { OutcomeCalendarProps };
