import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { PiCheckCircleFill, PiCircleFill } from 'react-icons/pi';

import { buildWeekDayState, buildWeekDays } from '../model/buildWeekDays';
import styles from './WeekStrip.module.css';

interface WeekStripProps {
	selectedLocalDate: string;
	todayLocalDate: string;
	outcomeDates: readonly string[];
	expenseDates?: readonly string[];
	onSelect: (localDate: string) => void;
}

function WeekStrip({ selectedLocalDate, todayLocalDate, outcomeDates, expenseDates = [], onSelect }: WeekStripProps) {
	const { t } = useTranslation();
	const expenses = new Set(expenseDates);
	const weekdayKeys = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
	return (
		<div className={styles.strip} aria-label={t('shell.today.weekLabel')}>
			{buildWeekDays(selectedLocalDate, outcomeDates).map((day) => {
				const state = buildWeekDayState(day, selectedLocalDate, todayLocalDate);
				const hasExpense = expenses.has(day.localDate);
				return (
					<button
						type='button'
						key={day.localDate}
						className={clsx(styles.day, state.selected && styles.selected)}
						disabled={state.disabled}
						aria-pressed={state.selected}
						aria-current={day.localDate === todayLocalDate ? 'date' : undefined}
						onClick={() => onSelect(day.localDate)}
					>
						<small>{t(`shell.today.weekdays.${weekdayKeys[day.weekdayIndex]}`)}</small>
						<strong>{day.dayOfMonth}</strong>
						<span className={styles.marker} data-marker-pair={state.hasOutcome && hasExpense ? 'true' : undefined}>
							{state.hasOutcome && (
								<span aria-label={t('shell.today.outcomeDate')}>
									{state.selected
										? <PiCircleFill aria-hidden='true' />
										: <PiCheckCircleFill aria-hidden='true' />}
								</span>
							)}
							{hasExpense && <span className={styles.expenseMarker} data-expense-marker='true' aria-hidden='true'><PiCircleFill /></span>}
						</span>
					</button>
				);
			})}
		</div>
	);
}

export { WeekStrip };
export type { WeekStripProps };
