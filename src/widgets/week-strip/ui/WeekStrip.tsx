import clsx from 'clsx';
import { useTranslation } from 'react-i18next';

import { buildWeekDays } from '../model/buildWeekDays';
import styles from './WeekStrip.module.css';

interface WeekStripProps {
	selectedLocalDate: string;
	todayLocalDate: string;
	onSelect: (localDate: string) => void;
}

function WeekStrip({ selectedLocalDate, todayLocalDate, onSelect }: WeekStripProps) {
	const { t } = useTranslation();
	const weekdayKeys = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
	return (
		<div className={styles.strip} aria-label={t('shell.today.weekLabel')}>
			{buildWeekDays(selectedLocalDate).map((day) => {
				const future = day.localDate > todayLocalDate;
				return (
					<button
						type='button'
						key={day.localDate}
						className={clsx(styles.day, day.localDate === selectedLocalDate && styles.selected)}
						disabled={future}
						aria-current={day.localDate === todayLocalDate ? 'date' : undefined}
						onClick={() => onSelect(day.localDate)}
					>
						<small>{t(`shell.today.weekdays.${weekdayKeys[day.weekdayIndex]}`)}</small>
						<strong>{day.dayOfMonth}</strong>
					</button>
				);
			})}
		</div>
	);
}

export { WeekStrip };
export type { WeekStripProps };
