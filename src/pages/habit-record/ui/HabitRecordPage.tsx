/* eslint-disable i18next/no-literal-string -- Record kinds and option values are stable domain identifiers. */
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
	PiArrowLeft,
	PiBookOpenText,
	PiCheck,
	PiClock,
	PiDrop,
	PiHeartbeat,
	PiLeaf,
	PiMoonStars,
	PiNotePencil,
	PiShieldCheck,
	PiTimer,
	PiX,
} from 'react-icons/pi';
import { useNavigate, useParams, useSearchParams } from 'react-router';

import type { HabitRecordDetails } from '@entities/action-record';
import { loadDailyHabitsInApp, type DailyHabitView } from '@features/load-daily-habits';
import { saveDailyHabitInApp } from '@features/save-daily-habit';
import { APP_ROUTES } from '@shared/config';
import { formatLocalDate, parseLocalDate } from '@shared/lib/date';
import { HabitGlyph } from '@widgets/habit-glyph';

import styles from './HabitRecordPage.module.css';

const SCREEN_MOMENTS = ['after-waking', 'during-meals', 'before-sleep'] as const;

function numberOrUndefined(value: string): number | undefined {
	if (!value.trim()) return undefined;
	const parsed = Number(value);
	return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed) : undefined;
}

function positiveOrUndefined(value: string): number | undefined {
	const parsed = numberOrUndefined(value);
	return parsed && parsed > 0 ? parsed : undefined;
}

function paceSeconds(value: string): number | undefined {
	const match = /^(\d{1,2}):([0-5]\d)$/.exec(value.trim());
	return match ? Number(match[1]) * 60 + Number(match[2]) : undefined;
}

function minutesBetween(start: string, end: string): number | undefined {
	if (!start || !end) return undefined;
	const [startHour, startMinute] = start.split(':').map(Number);
	const [endHour, endMinute] = end.split(':').map(Number);
	let minutes = endHour! * 60 + endMinute! - (startHour! * 60 + startMinute!);
	if (minutes <= 0) minutes += 24 * 60;
	return minutes;
}

function HabitRecordPage() {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const { userCardId = '' } = useParams();
	const [searchParams] = useSearchParams();
	const localDate = useMemo(
		() => parseLocalDate(searchParams.get('date') ?? formatLocalDate(new Date())),
		[searchParams],
	);
	const [habit, setHabit] = useState<DailyHabitView>();
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState(false);
	const [actual, setActual] = useState('');
	const [duration, setDuration] = useState('');
	const [pace, setPace] = useState('');
	const [heartRate, setHeartRate] = useState('');
	const [note, setNote] = useState('');
	const [cupSize, setCupSize] = useState('300');
	const [morningCups, setMorningCups] = useState('');
	const [afternoonCups, setAfternoonCups] = useState('');
	const [eveningCups, setEveningCups] = useState('');
	const [beverageType, setBeverageType] = useState<'water' | 'tea' | 'coffee' | 'other'>('water');
	const [bookTitle, setBookTitle] = useState('');
	const [startPage, setStartPage] = useState('');
	const [endPage, setEndPage] = useState('');
	const [chapter, setChapter] = useState('');
	const [reflection, setReflection] = useState('');
	const [checkedRules, setCheckedRules] = useState<string[]>([]);
	const [onTime, setOnTime] = useState(true);
	const [bedtime, setBedtime] = useState('');
	const [wakeTime, setWakeTime] = useState('');
	const [quality, setQuality] = useState<1 | 2 | 3 | 4 | 5>(3);
	const [wakeFeeling, setWakeFeeling] = useState<'tired' | 'normal' | 'refreshed'>('normal');
	const [screenMinutes, setScreenMinutes] = useState('');
	const [shortVideoMinutes, setShortVideoMinutes] = useState('');
	const [socialMinutes, setSocialMinutes] = useState('');
	const [newsMinutes, setNewsMinutes] = useState('');
	const [otherMinutes, setOtherMinutes] = useState('');
	const [screenFreeMoments, setScreenFreeMoments] = useState<Array<(typeof SCREEN_MOMENTS)[number]>>([]);

	useEffect(() => {
		let active = true;
		void loadDailyHabitsInApp(localDate)
			.then((model) => {
				if (!active) return;
				const selected = model.habits.find(({ id }) => id === userCardId);
				setHabit(selected);
				if (selected) {
					setActual(selected.quantityBaseValue > 0 ? selected.displayValue : '');
					setDuration(selected.durationSeconds ? String(selected.durationSeconds / 60) : '');
					setHeartRate(selected.averageHeartRateBpm ? String(selected.averageHeartRateBpm) : '');
					setNote(selected.note ?? '');
					const details = selected.details;
					if (details?.kind === 'water') {
						setCupSize(details.cupSizeMl ? String(details.cupSizeMl) : '300');
						setMorningCups(details.morningCups === undefined ? '' : String(details.morningCups));
						setAfternoonCups(details.afternoonCups === undefined ? '' : String(details.afternoonCups));
						setEveningCups(details.eveningCups === undefined ? '' : String(details.eveningCups));
						setBeverageType(details.beverageType ?? 'water');
					}
					if (details?.kind === 'reading') {
						setBookTitle(details.bookTitle ?? '');
						setDuration(details.durationMinutes ? String(details.durationMinutes) : '');
						setStartPage(details.startPage === undefined ? '' : String(details.startPage));
						setEndPage(details.endPage === undefined ? '' : String(details.endPage));
						setChapter(details.chapter ?? '');
						setReflection(details.reflection ?? '');
					}
					if (details?.kind === 'light-food') setCheckedRules(details.checkedRuleIds);
					if (details?.kind === 'sleep') {
						setOnTime(details.onTime ?? true);
						setBedtime(details.bedtime ?? '');
						setWakeTime(details.wakeTime ?? '');
						setQuality(details.quality ?? 3);
						setWakeFeeling(details.wakeFeeling ?? 'normal');
					}
					if (details?.kind === 'screen-free') {
						setScreenMinutes(details.screenMinutes === undefined ? '' : String(details.screenMinutes));
						setShortVideoMinutes(details.shortVideoMinutes === undefined ? '' : String(details.shortVideoMinutes));
						setSocialMinutes(details.socialMinutes === undefined ? '' : String(details.socialMinutes));
						setNewsMinutes(details.newsMinutes === undefined ? '' : String(details.newsMinutes));
						setOtherMinutes(details.otherMinutes === undefined ? '' : String(details.otherMinutes));
						setScreenFreeMoments(details.screenFreeMoments ?? []);
					}
				}
				setLoading(false);
			})
			.catch(() => { if (active) { setLoading(false); setError(true); } });
		return () => { active = false; };
	}, [localDate, userCardId]);

	function buildEntry(): { quantityBaseValue: number; details?: HabitRecordDetails } | null {
		if (!habit) return null;
		if (habit.officialCardId === 'running') {
			const display = Number(actual);
			if (!(display > 0)) return null;
			return { quantityBaseValue: Math.round(display * habit.basePerDisplayUnit) };
		}
		if (habit.officialCardId === 'water') {
			const cups = Number(actual);
			if (!(cups > 0)) return null;
			return {
				quantityBaseValue: Math.round(cups * habit.basePerDisplayUnit),
				details: {
					kind: 'water',
					cupSizeMl: positiveOrUndefined(cupSize),
					morningCups: numberOrUndefined(morningCups),
					afternoonCups: numberOrUndefined(afternoonCups),
					eveningCups: numberOrUndefined(eveningCups),
					beverageType,
				},
			};
		}
		if (habit.officialCardId === 'reading-time') {
			const minutes = positiveOrUndefined(duration);
			if (!minutes) return null;
			const start = numberOrUndefined(startPage);
			const end = numberOrUndefined(endPage);
			if (start !== undefined && end !== undefined && end < start) return null;
			return {
				quantityBaseValue: minutes * habit.basePerDisplayUnit,
				details: {
					kind: 'reading',
					bookTitle: bookTitle.trim() || undefined,
					durationMinutes: minutes,
					startPage: start,
					endPage: end,
					chapter: chapter.trim() || undefined,
					reflection: reflection.trim() || undefined,
				},
			};
		}
		if (habit.officialCardId === 'light-food') {
			if (checkedRules.length === 0) return null;
			return { quantityBaseValue: checkedRules.length, details: { kind: 'light-food', checkedRuleIds: checkedRules } };
		}
		if (habit.officialCardId === 'sleep') {
			return {
				quantityBaseValue: 1,
				details: {
					kind: 'sleep',
					onTime,
					bedtime: bedtime || undefined,
					wakeTime: wakeTime || undefined,
					durationMinutes: minutesBetween(bedtime, wakeTime),
					quality,
					wakeFeeling,
				},
			};
		}
		return {
			quantityBaseValue: 1,
			details: {
				kind: 'screen-free',
				screenMinutes: numberOrUndefined(screenMinutes),
				shortVideoMinutes: numberOrUndefined(shortVideoMinutes),
				socialMinutes: numberOrUndefined(socialMinutes),
				newsMinutes: numberOrUndefined(newsMinutes),
				otherMinutes: numberOrUndefined(otherMinutes),
				screenFreeMoments,
			},
		};
	}

	async function submit(event: FormEvent) {
		event.preventDefault();
		const entry = buildEntry();
		if (!habit || !entry) {
			setError(true);
			return;
		}
		const parsedPace = pace ? paceSeconds(pace) : undefined;
		if (pace && !parsedPace) {
			setError(true);
			return;
		}
		setSaving(true);
		setError(false);
		try {
			await saveDailyHabitInApp({
				userCardId: habit.id,
				localDate,
				currentLocalDate: formatLocalDate(new Date()),
				quantityBaseValue: entry.quantityBaseValue,
				entryMethod: 'actual',
				plannedQuantityBaseValue: habit.dailyTargetBase,
				carryInBaseValue: habit.carryInBaseValue,
				durationSeconds: positiveOrUndefined(duration) ? positiveOrUndefined(duration)! * 60 : undefined,
				averagePaceSecondsPerKm: parsedPace,
				averageHeartRateBpm: positiveOrUndefined(heartRate),
				note: note.trim() || undefined,
				details: entry.details,
				nowIso: new Date().toISOString(),
				submissionId: crypto.randomUUID(),
			});
			navigate(APP_ROUTES.HOME, { replace: true });
		} catch {
			setError(true);
		} finally {
			setSaving(false);
		}
	}

	if (loading) return <p className={styles.state}>{t('shell.record.loading')}</p>;
	if (!habit) return <p className={styles.state}>{t('shell.record.notFound')}</p>;

	const rules = habit.habitConfig?.kind === 'light-food' ? habit.habitConfig.rules : [];
	const sleepDuration = minutesBetween(bedtime, wakeTime);
	const kindLabel = t(habit.officialCardId === 'water'
		? 'shell.record.kinds.water'
		: habit.officialCardId === 'light-food'
			? 'shell.record.kinds.light-food'
			: habit.officialCardId === 'reading-time'
				? 'shell.record.kinds.reading-time'
				: habit.officialCardId === 'sleep'
					? 'shell.record.kinds.sleep'
					: habit.officialCardId === 'screen-free'
						? 'shell.record.kinds.screen-free'
						: 'shell.record.kinds.running');

	return (
		<main className={styles.page}>
			<header className={styles.header}>
				<button type='button' onClick={() => navigate(-1)} aria-label={t('shell.createCard.back')}><PiArrowLeft aria-hidden='true' /></button>
				<div><small>{localDate}</small><h1>{habit.title}</h1></div>
				<button type='button' onClick={() => navigate(APP_ROUTES.HOME)} aria-label={t('shell.createCard.close')}><PiX aria-hidden='true' /></button>
			</header>
			<form className={styles.form} onSubmit={submit}>
				<section className={styles.hero}>
					<HabitGlyph iconKey={habit.iconKey} accent={habit.accent} label={habit.title} decorative size='lg' />
					<div><small>{kindLabel}</small><strong>{habit.title}</strong><span>{t('shell.record.target', { value: habit.dailyTargetBase / habit.basePerDisplayUnit, unit: habit.displayUnit })}</span></div>
				</section>

				{habit.officialCardId === 'running' && <RunningFields />}
				{habit.officialCardId === 'water' && <WaterFields />}
				{habit.officialCardId === 'reading-time' && <ReadingFields />}
				{habit.officialCardId === 'light-food' && (
					<section className={styles.block}>
						<BlockTitle icon={PiLeaf} title={t('shell.record.food.title')} hint={t('shell.record.food.hint', { done: checkedRules.length, total: rules.length })} />
						<div className={styles.checkList}>
							{rules.map((rule) => <label key={rule.id}><PiLeaf aria-hidden='true' /><span>{rule.label}</span><input type='checkbox' checked={checkedRules.includes(rule.id)} onChange={() => setCheckedRules((current) => current.includes(rule.id) ? current.filter((id) => id !== rule.id) : [...current, rule.id])} /></label>)}
						</div>
					</section>
				)}
				{habit.officialCardId === 'sleep' && <SleepFields />}
				{habit.officialCardId === 'screen-free' && <ScreenFields />}

				<label className={styles.note}>
					<PiNotePencil aria-hidden='true' />
					<textarea maxLength={280} value={note} onChange={(event) => setNote(event.target.value)} placeholder={t('shell.record.note')} />
				</label>
				{error && <p className={styles.error} role='alert'>{t('shell.record.invalid')}</p>}
				<button className={styles.save} type='submit' disabled={saving}><PiCheck aria-hidden='true' />{t('shell.record.save')}</button>
			</form>
		</main>
	);

	function BlockTitle({ icon: Icon, title, hint }: { icon: typeof PiLeaf; title: string; hint: string }) {
		return <header className={styles.blockTitle}><Icon aria-hidden='true' /><div><strong>{title}</strong><small>{hint}</small></div></header>;
	}

	function RunningFields() {
		return <section className={styles.block}>
			<BlockTitle icon={PiTimer} title={t('shell.record.running.title')} hint={t('shell.record.optionalHint')} />
			<div className={styles.grid}>
				<Field label={t('shell.record.running.distance')} value={actual} onChange={setActual} unit={habit!.displayUnit} />
				<Field label={t('shell.record.running.duration')} value={duration} onChange={setDuration} unit={t('shell.record.units.minutes')} />
				<Field label={t('shell.record.running.pace')} value={pace} onChange={setPace} placeholder='06:30' icon={<PiClock />} inputType='text' />
				<Field label={t('shell.record.running.heartRate')} value={heartRate} onChange={setHeartRate} unit='bpm' icon={<PiHeartbeat />} />
			</div>
		</section>;
	}

	function WaterFields() {
		return <section className={styles.block}>
			<BlockTitle icon={PiDrop} title={t('shell.record.water.title')} hint={t('shell.record.optionalHint')} />
			<div className={styles.grid}>
				<Field label={t('shell.record.water.cups')} value={actual} onChange={setActual} unit={habit!.displayUnit} />
				<Field label={t('shell.record.water.cupSize')} value={cupSize} onChange={setCupSize} unit='ml' />
				<Field label={t('shell.record.water.morning')} value={morningCups} onChange={setMorningCups} />
				<Field label={t('shell.record.water.afternoon')} value={afternoonCups} onChange={setAfternoonCups} />
				<Field label={t('shell.record.water.evening')} value={eveningCups} onChange={setEveningCups} />
			</div>
			<div className={styles.chips}>{(['water', 'tea', 'coffee', 'other'] as const).map((type) => <button type='button' key={type} aria-pressed={beverageType === type} onClick={() => setBeverageType(type)}>{t(`shell.record.water.types.${type}`)}</button>)}</div>
		</section>;
	}

	function ReadingFields() {
		return <section className={styles.block}>
			<BlockTitle icon={PiBookOpenText} title={t('shell.record.reading.title')} hint={t('shell.record.optionalHint')} />
			<label className={styles.wideField}><span>{t('shell.record.reading.book')}</span><input value={bookTitle} onChange={(event) => setBookTitle(event.target.value)} /></label>
			<div className={styles.grid}>
				<Field label={t('shell.record.reading.duration')} value={duration} onChange={setDuration} unit={t('shell.record.units.minutes')} />
				<Field label={t('shell.record.reading.startPage')} value={startPage} onChange={setStartPage} />
				<Field label={t('shell.record.reading.endPage')} value={endPage} onChange={setEndPage} />
				<Field label={t('shell.record.reading.chapter')} value={chapter} onChange={setChapter} inputType='text' />
			</div>
			<label className={styles.wideField}><span>{t('shell.record.reading.reflection')}</span><textarea value={reflection} onChange={(event) => setReflection(event.target.value)} /></label>
		</section>;
	}

	function SleepFields() {
		return <section className={styles.block}>
			<BlockTitle icon={PiMoonStars} title={t('shell.record.sleep.title')} hint={sleepDuration ? t('shell.record.sleep.durationResult', { hours: (sleepDuration / 60).toFixed(1) }) : t('shell.record.optionalHint')} />
			<label className={styles.toggle}><span>{t('shell.record.sleep.onTime')}</span><input type='checkbox' checked={onTime} onChange={(event) => setOnTime(event.target.checked)} /></label>
			<div className={styles.grid}>
				<label className={styles.wideField}><span>{t('shell.record.sleep.bedtime')}</span><input type='time' value={bedtime} onChange={(event) => setBedtime(event.target.value)} /></label>
				<label className={styles.wideField}><span>{t('shell.record.sleep.wakeTime')}</span><input type='time' value={wakeTime} onChange={(event) => setWakeTime(event.target.value)} /></label>
			</div>
			<div className={styles.chips}>{([1, 2, 3, 4, 5] as const).map((value) => <button type='button' key={value} aria-pressed={quality === value} onClick={() => setQuality(value)}>{value}</button>)}</div>
			<div className={styles.chips}>{(['tired', 'normal', 'refreshed'] as const).map((value) => <button type='button' key={value} aria-pressed={wakeFeeling === value} onClick={() => setWakeFeeling(value)}>{t(`shell.record.sleep.feelings.${value}`)}</button>)}</div>
		</section>;
	}

	function ScreenFields() {
		return <section className={styles.block}>
			<BlockTitle icon={PiShieldCheck} title={t('shell.record.screen.title')} hint={t('shell.record.optionalHint')} />
			<Field label={t('shell.record.screen.total')} value={screenMinutes} onChange={setScreenMinutes} unit={t('shell.record.units.minutes')} />
			<div className={styles.grid}>
				<Field label={t('shell.record.screen.shortVideo')} value={shortVideoMinutes} onChange={setShortVideoMinutes} />
				<Field label={t('shell.record.screen.social')} value={socialMinutes} onChange={setSocialMinutes} />
				<Field label={t('shell.record.screen.news')} value={newsMinutes} onChange={setNewsMinutes} />
				<Field label={t('shell.record.screen.other')} value={otherMinutes} onChange={setOtherMinutes} />
			</div>
			<div className={styles.checkList}>{SCREEN_MOMENTS.map((moment) => <label key={moment}><PiShieldCheck aria-hidden='true' /><span>{t(`shell.record.screen.moments.${moment}`)}</span><input type='checkbox' checked={screenFreeMoments.includes(moment)} onChange={() => setScreenFreeMoments((current) => current.includes(moment) ? current.filter((item) => item !== moment) : [...current, moment])} /></label>)}</div>
		</section>;
	}

	function Field({ label, value, onChange, unit, placeholder, icon, inputType = 'number' }: { label: string; value: string; onChange: (value: string) => void; unit?: string; placeholder?: string; icon?: ReactNode; inputType?: 'number' | 'text' }) {
		return <label className={styles.field}><span>{icon}{label}</span><div><input type={inputType} inputMode={inputType === 'number' ? 'decimal' : undefined} min={inputType === 'number' ? '0' : undefined} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />{unit && <small>{unit}</small>}</div></label>;
	}
}

export { HabitRecordPage };
