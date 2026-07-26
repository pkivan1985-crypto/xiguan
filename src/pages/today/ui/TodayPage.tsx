import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
	FiActivity,
	FiAlertCircle,
	FiBookOpen,
	FiCheck,
	FiDroplet,
	FiMinus,
	FiMoon,
	FiPlus,
	FiRefreshCw,
	FiShield,
} from 'react-icons/fi';
import type { IconType } from 'react-icons';
import { Link, useNavigate } from 'react-router';

import { loadDailyHabitsInApp, type DailyHabitView, type DailyHabitsModel } from '@features/load-daily-habits';
import { saveDailyHabitInApp } from '@features/save-daily-habit';
import { APP_ROUTES } from '@shared/config';
import { formatLocalDate } from '@shared/lib/date';
import { WeekStrip } from '@widgets/week-strip';

import styles from './TodayPage.module.css';

const HABIT_ICONS: Record<DailyHabitView['iconKey'], IconType> = {
	activity: FiActivity,
	droplet: FiDroplet,
	book: FiBookOpen,
	moon: FiMoon,
	shield: FiShield,
};

function DailyCard({
	habit,
	pending,
	onChange,
}: {
	habit: DailyHabitView;
	pending: boolean;
	onChange: (nextValue: number) => void;
}) {
	const { t } = useTranslation();
	const Icon = HABIT_ICONS[habit.iconKey];
	const completed = habit.quantityBaseValue >= habit.dailyTargetBase;
	const isToggle = habit.trackingType === 'check' || habit.trackingType === 'avoid';
	const ratio = Math.min(habit.quantityBaseValue / Math.max(habit.dailyTargetBase, 1), 1);

	return (
		<article className={`${styles.habitCard} ${styles[habit.accent]} ${completed ? styles.completed : ''}`}>
			<span className={styles.habitIcon}><Icon aria-hidden='true' /></span>
			<div className={styles.habitCopy}>
				<strong>{habit.title}</strong>
				<small>{habit.goalTitle ?? t('shell.today.dailyTarget', {
					value: habit.dailyTargetBase / (habit.trackingType === 'quantity' ? 1000 : 1),
					unit: habit.displayUnit,
				})}</small>
			</div>
			{isToggle ? (
				<button
					type='button'
					className={styles.toggle}
					disabled={pending}
					aria-pressed={completed}
					aria-label={completed ? t('shell.today.undoHabit', { title: habit.title }) : t('shell.today.completeHabit', { title: habit.title })}
					onClick={() => onChange(completed ? 0 : habit.dailyTargetBase)}
				>
					<FiCheck aria-hidden='true' />
				</button>
			) : (
				<div className={styles.stepper}>
					<button
						type='button'
						disabled={pending || habit.quantityBaseValue === 0}
						aria-label={t('shell.today.decreaseHabit', { title: habit.title })}
						onClick={() => onChange(Math.max(0, habit.quantityBaseValue - habit.stepBase))}
					><FiMinus aria-hidden='true' /></button>
					<span><b>{habit.displayValue}</b><small>{habit.displayUnit}</small></span>
					<button
						type='button'
						disabled={pending}
						aria-label={t('shell.today.increaseHabit', { title: habit.title })}
						onClick={() => onChange(habit.quantityBaseValue + habit.stepBase)}
					><FiPlus aria-hidden='true' /></button>
				</div>
			)}
			<span className={styles.cardProgress} aria-hidden='true'><i style={{ width: `${ratio * 100}%` }} /></span>
		</article>
	);
}

function TodayPage() {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const todayLocalDate = useMemo(() => formatLocalDate(new Date()), []);
	const [model, setModel] = useState<DailyHabitsModel | null>(null);
	const [loadError, setLoadError] = useState(false);
	const [pendingId, setPendingId] = useState<string>();
	const [saveErrorId, setSaveErrorId] = useState<string>();
	const [reloadNonce, setReloadNonce] = useState(0);

	const load = useCallback(() => loadDailyHabitsInApp(todayLocalDate), [todayLocalDate]);
	useEffect(() => {
		let active = true;
		void load()
			.then((next) => { if (active) setModel(next); })
			.catch(() => { if (active) setLoadError(true); });
		return () => { active = false; };
	}, [load, reloadNonce]);

	async function changeHabit(habit: DailyHabitView, quantityBaseValue: number): Promise<void> {
		if (pendingId) return;
		setPendingId(habit.id);
		setSaveErrorId(undefined);
		try {
			await saveDailyHabitInApp({
				userCardId: habit.id,
				localDate: todayLocalDate,
				currentLocalDate: formatLocalDate(new Date()),
				quantityBaseValue,
				nowIso: new Date().toISOString(),
				submissionId: crypto.randomUUID(),
			});
			setModel(await load());
		} catch {
			setSaveErrorId(habit.id);
		} finally {
			setPendingId(undefined);
		}
	}

	if (loadError) {
		return <section className={styles.state}><FiAlertCircle aria-hidden='true' /><p>{t('shell.today.loadError')}</p><button type='button' onClick={() => { setModel(null); setLoadError(false); setReloadNonce((value) => value + 1); }}><FiRefreshCw aria-hidden='true' />{t('shell.today.retry')}</button></section>;
	}
	if (!model) return <p className={styles.loading}>{t('shell.today.loading')}</p>;

	const [year, month, day] = todayLocalDate.split('-').map(Number);
	const todayLabel = new Intl.DateTimeFormat(undefined, { month: 'long', day: 'numeric', weekday: 'long' }).format(new Date(year!, month! - 1, day!));

	return (
		<div className={styles.page}>
			<header className={styles.overview}>
				<div><small>{todayLabel}</small><strong>{t('shell.today.overview', { completed: model.completedCount, total: model.habits.length })}</strong></div>
				<span>{model.completedCount}/{model.habits.length}</span>
			</header>
			<WeekStrip
				selectedLocalDate={todayLocalDate}
				todayLocalDate={todayLocalDate}
				onSelect={(localDate) => {
					if (localDate !== todayLocalDate) navigate(`${APP_ROUTES.PROGRESS}?date=${localDate}`);
				}}
			/>
			<section className={styles.listSection}>
				<header><h2>{t('shell.today.listTitle')}</h2><Link to={APP_ROUTES.DECK_NEW} aria-label={t('shell.today.createHabit')}><FiPlus aria-hidden='true' /></Link></header>
				{model.habits.length === 0 ? (
					<div className={styles.empty}>
						<span><FiPlus aria-hidden='true' /></span>
						<h2>{t('shell.today.emptyTitle')}</h2>
						<p>{t('shell.today.emptyDescription')}</p>
						<Link className={styles.emptyAction} to={APP_ROUTES.DECK_NEW}>{t('shell.today.createHabit')}</Link>
					</div>
				) : (
					<div className={styles.habitList}>
						{model.habits.map((habit) => (
							<div key={habit.id}>
								<DailyCard habit={habit} pending={pendingId === habit.id} onChange={(value) => { void changeHabit(habit, value); }} />
								{saveErrorId === habit.id && <p className={styles.inlineError} role='alert'><FiAlertCircle aria-hidden='true' />{t('shell.today.itemSaveError')}</p>}
							</div>
						))}
					</div>
				)}
			</section>
			{model.habits.length > 0 && (
				<Link className={styles.summaryLink} to={`${APP_ROUTES.PROGRESS}?date=${todayLocalDate}`}>
					<span><FiCheck aria-hidden='true' /></span>
					<div><strong>{t('shell.today.viewTodaySummary')}</strong><small>{t('shell.today.viewTodaySummaryHint')}</small></div>
				</Link>
			)}
		</div>
	);
}

export { TodayPage };
