/* eslint-disable i18next/no-literal-string -- Media output option identifiers are stable domain values. */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
	PiArticle,
	PiArrowLeft,
	PiBroadcast,
	PiCheck,
	PiEye,
	PiLink,
	PiMicrophone,
	PiNotePencil,
	PiPencilSimple,
	PiPlus,
	PiThumbsUp,
	PiTrash,
	PiVideoCamera,
	PiX,
} from 'react-icons/pi';
import { useNavigate, useSearchParams } from 'react-router';

import type { MediaOutputEntry } from '@entities/action-record';
import type { DailyHabitView } from '@features/load-daily-habits';
import { saveDailyHabitInApp } from '@features/save-daily-habit';
import { APP_ROUTES } from '@shared/config';
import { formatLocalDate } from '@shared/lib/date';
import { HabitGlyph } from '@widgets/habit-glyph';

import {
	buildMediaOutputEntry,
	mergeMediaOutputEntry,
	normalizeMediaOutputEntries,
	removeMediaOutputEntry,
	type MediaOutputFormValues,
} from '../model/mediaOutputRecord';
import styles from './HabitRecordPage.module.css';

const TYPES = [
	['article', PiArticle],
	['short-video', PiVideoCamera],
	['audio', PiMicrophone],
	['livestream', PiBroadcast],
] as const;

const PLATFORMS = ['公众号', '抖音', '小红书', '视频号', 'B站', '其他'] as const;

interface Props {
	habit: DailyHabitView;
	localDate: string;
}

function MediaOutputRecordPage({ habit, localDate }: Props) {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const [searchParams] = useSearchParams();
	const entryId = searchParams.get('entry');
	const requestedType = searchParams.get('type');
	const entries = normalizeMediaOutputEntries(habit.details);
	const existing = entries.find(({ id }) => id === entryId);
	const allowedTypes = habit.habitConfig?.kind === 'media-output'
		? habit.habitConfig.outputTypes
		: TYPES.map(([type]) => type);
	const initialType = allowedTypes.includes(requestedType as MediaOutputEntry['type'])
		? requestedType as MediaOutputEntry['type']
		: allowedTypes[0] ?? 'article';
	const [values, setValues] = useState<MediaOutputFormValues>(() => existing ? {
		type: existing.type,
		title: existing.title,
		platform: existing.platform ?? '',
		status: existing.status,
		link: existing.link ?? '',
		views: existing.views === undefined ? '' : String(existing.views),
		likes: existing.likes === undefined ? '' : String(existing.likes),
		comments: existing.comments === undefined ? '' : String(existing.comments),
		reflection: existing.reflection ?? '',
	} : {
		type: initialType, title: '', platform: '', status: 'published', link: '',
		views: '', likes: '', comments: '', reflection: '',
	});
	const [saving, setSaving] = useState(false);
	const [invalid, setInvalid] = useState(false);

	function route(entry?: string, type?: MediaOutputEntry['type']): string {
		const base = APP_ROUTES.habitRecord(habit.id, localDate);
		return entry ? `${base}&entry=${encodeURIComponent(entry)}${type ? `&type=${type}` : ''}` : base;
	}

	async function save(status: MediaOutputEntry['status'], addAnother = false): Promise<void> {
		if (saving) return;
		const nowIso = new Date().toISOString();
		const entry = buildMediaOutputEntry({ ...values, status }, {
			id: existing?.id ?? crypto.randomUUID(),
			nowIso,
			createdAt: existing?.createdAt,
		});
		if (!entry) { setInvalid(true); return; }
		const aggregate = mergeMediaOutputEntry(habit.details, entry);
		setSaving(true);
		setInvalid(false);
		try {
			const currentLocalDate = formatLocalDate(new Date());
			await saveDailyHabitInApp({
				userCardId: habit.id,
				localDate,
				currentLocalDate,
				recordingContext: localDate < currentLocalDate ? (habit.recordedToday ? 'correction' : 'backfill') : 'today',
				quantityBaseValue: aggregate.quantityBaseValue,
				entryMethod: 'actual',
				details: aggregate.details,
				nowIso,
				submissionId: crypto.randomUUID(),
			});
			navigate(addAnother ? route('new', entry.type) : route(), { replace: true });
		} catch {
			setInvalid(true);
		} finally {
			setSaving(false);
		}
	}

	async function remove(): Promise<void> {
		if (!existing || !window.confirm(t('shell.record.media.deleteConfirm'))) return;
		const nowIso = new Date().toISOString();
		const aggregate = removeMediaOutputEntry(habit.details, existing.id);
		setSaving(true);
		try {
			await saveDailyHabitInApp({
				userCardId: habit.id,
				localDate,
				currentLocalDate: formatLocalDate(new Date()),
				recordingContext: localDate < formatLocalDate(new Date()) ? 'correction' : 'today',
				quantityBaseValue: aggregate.quantityBaseValue,
				details: aggregate.details,
				nowIso,
				submissionId: crypto.randomUUID(),
			});
			navigate(route(), { replace: true });
		} catch { setInvalid(true); } finally { setSaving(false); }
	}

	if (!entryId) {
		const publishedCount = entries.filter(({ status }) => status === 'published').length;
		return <main className={`${styles.page} ${styles.mediaPage}`}>
			<header className={styles.mediaHeader}>
				<button type='button' onClick={() => navigate(-1)} aria-label={t('shell.createCard.back')}><PiArrowLeft /></button>
				<div><small>{localDate}</small><h1>{t('shell.record.media.summaryTitle')}</h1></div>
				<button type='button' onClick={() => navigate(APP_ROUTES.HOME)} aria-label={t('shell.createCard.close')}><PiX /></button>
			</header>
			<section className={styles.mediaHero}>
				<HabitGlyph iconKey={habit.iconKey} accent={habit.accent} label={habit.title} decorative size='lg' />
				<div><strong>{habit.title}</strong><small>{t('shell.record.media.todayProgress', { current: publishedCount, target: habit.dailyTargetBase })}</small></div>
			</section>
			<section className={styles.mediaEntryList}>
				{entries.length === 0 ? <p>{t('shell.record.media.empty')}</p> : entries.map((entry) => {
					const Icon = TYPES.find(([type]) => type === entry.type)?.[1] ?? PiArticle;
					return <button type='button' key={entry.id} onClick={() => navigate(route(entry.id))}>
						<Icon aria-hidden='true' />
						<span><strong>{entry.title}</strong><small>{entry.platform || t(`shell.record.media.types.${entry.type}`)} · {t(`shell.record.media.statuses.${entry.status}`)}</small></span>
						<PiPencilSimple aria-hidden='true' />
					</button>;
				})}
			</section>
			<button className={`${styles.save} ${styles.mediaPrimary}`} type='button' onClick={() => navigate(route('new'))}><PiPlus />{t('shell.record.media.addEntry')}</button>
		</main>;
	}

	return <main className={`${styles.page} ${styles.mediaPage}`}>
		<header className={styles.mediaHeader}>
			<button type='button' onClick={() => navigate(route())} aria-label={t('shell.createCard.back')}><PiArrowLeft /></button>
			<div><small>{localDate}</small><h1>{existing ? t('shell.record.media.editTitle') : t('shell.record.media.title')}</h1></div>
			<button type='button' onClick={() => navigate(APP_ROUTES.HOME)} aria-label={t('shell.createCard.close')}><PiX /></button>
		</header>
		<form className={styles.mediaForm} onSubmit={(event) => { event.preventDefault(); void save('published'); }}>
			<fieldset className={styles.mediaTypes}><legend>{t('shell.record.media.outputType')}</legend>{TYPES.filter(([type]) => allowedTypes.includes(type)).map(([type, Icon]) => <button type='button' key={type} aria-pressed={values.type === type} onClick={() => setValues((current) => ({ ...current, type }))}><Icon /><span>{t(`shell.record.media.types.${type}`)}</span>{values.type === type && <PiCheck />}</button>)}</fieldset>
			<label className={styles.mediaTextField}><span>{t('shell.record.media.workTitle')}</span><input maxLength={100} value={values.title} onChange={(event) => setValues((current) => ({ ...current, title: event.target.value }))} placeholder={t('shell.record.media.workTitlePlaceholder')} /></label>
			<fieldset className={styles.mediaPlatforms}><legend>{t('shell.record.media.platform')}</legend>{PLATFORMS.map((platform) => <button type='button' key={platform} aria-pressed={values.platform === platform} onClick={() => setValues((current) => ({ ...current, platform }))}>{platform}</button>)}</fieldset>
			<div className={styles.mediaStatus}><button type='button' aria-pressed={values.status === 'published'} onClick={() => setValues((current) => ({ ...current, status: 'published' }))}>{t('shell.record.media.statuses.published')}</button><button type='button' aria-pressed={values.status === 'draft'} onClick={() => setValues((current) => ({ ...current, status: 'draft' }))}>{t('shell.record.media.statuses.draft')}</button></div>
			<label className={styles.mediaInlineField}><PiLink /><input type='url' value={values.link} onChange={(event) => setValues((current) => ({ ...current, link: event.target.value }))} placeholder={t('shell.record.media.link')} /></label>
			<section className={styles.mediaMetrics}><h2>{t('shell.record.media.metrics')}</h2><label><PiEye /><span>{t('shell.record.media.views')}</span><input type='number' min='0' inputMode='numeric' value={values.views} onChange={(event) => setValues((current) => ({ ...current, views: event.target.value }))} /></label><label><PiThumbsUp /><span>{t('shell.record.media.likes')}</span><input type='number' min='0' inputMode='numeric' value={values.likes} onChange={(event) => setValues((current) => ({ ...current, likes: event.target.value }))} /></label><label><PiNotePencil /><span>{t('shell.record.media.comments')}</span><input type='number' min='0' inputMode='numeric' value={values.comments} onChange={(event) => setValues((current) => ({ ...current, comments: event.target.value }))} /></label></section>
			<label className={styles.mediaTextField}><span>{t('shell.record.media.reflection')}</span><textarea maxLength={300} value={values.reflection} onChange={(event) => setValues((current) => ({ ...current, reflection: event.target.value }))} placeholder={t('shell.record.media.reflectionPlaceholder')} /></label>
			{invalid && <p className={styles.error} role='alert'>{t('shell.record.invalid')}</p>}
			<button className={`${styles.save} ${styles.mediaPrimary}`} type='submit' disabled={saving}><PiCheck />{t('shell.record.media.savePublished')}</button>
			<button className={styles.mediaSecondary} type='button' disabled={saving} onClick={() => void save('draft')}>{t('shell.record.media.saveDraft')}</button>
			<button className={styles.mediaAddAnother} type='button' disabled={saving} onClick={() => void save(values.status, true)}><PiPlus />{t('shell.record.media.addAnother')}</button>
			{existing && <button className={styles.mediaDelete} type='button' disabled={saving} onClick={() => void remove()}><PiTrash />{t('shell.record.media.delete')}</button>}
		</form>
	</main>;
}

export { MediaOutputRecordPage };
