/* eslint-disable i18next/no-literal-string -- Media output kinds and option values are stable domain identifiers. */
import type {
	HabitRecordDetails,
	MediaOutputEntry,
	MediaOutputRecordDetails,
} from '@entities/action-record';

export interface MediaOutputFormValues {
	type: MediaOutputEntry['type'];
	title: string;
	platform: string;
	status: MediaOutputEntry['status'];
	link: string;
	views: string;
	likes: string;
	comments: string;
	reflection: string;
}

function optionalCount(value: string): number | undefined {
	if (!value.trim()) return undefined;
	const parsed = Number(value);
	return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : undefined;
}

export function normalizeMediaOutputEntries(details: HabitRecordDetails | undefined): MediaOutputEntry[] {
	return details?.kind === 'media-output' ? details.entries : [];
}

export function buildMediaOutputEntry(
	values: MediaOutputFormValues,
	options: { id: string; nowIso: string; createdAt?: string },
): MediaOutputEntry | null {
	const title = values.title.trim();
	const views = optionalCount(values.views);
	const likes = optionalCount(values.likes);
	const comments = optionalCount(values.comments);
	if (!title
		|| (values.views.trim() && views === undefined)
		|| (values.likes.trim() && likes === undefined)
		|| (values.comments.trim() && comments === undefined)) return null;
	return {
		id: options.id,
		type: values.type,
		title,
		platform: values.platform.trim() || undefined,
		status: values.status,
		link: values.link.trim() || undefined,
		views,
		likes,
		comments,
		reflection: values.reflection.trim() || undefined,
		createdAt: options.createdAt ?? options.nowIso,
		updatedAt: options.nowIso,
	};
}

export function mergeMediaOutputEntry(
	details: HabitRecordDetails | undefined,
	entry: MediaOutputEntry,
): { quantityBaseValue: number; details: MediaOutputRecordDetails } {
	const entries = normalizeMediaOutputEntries(details);
	const next = entries.some(({ id }) => id === entry.id)
		? entries.map((item) => item.id === entry.id ? entry : item)
		: [...entries, entry];
	return { quantityBaseValue: next.length, details: { kind: 'media-output', entries: next } };
}

export function removeMediaOutputEntry(
	details: HabitRecordDetails | undefined,
	id: string,
): { quantityBaseValue: number; details?: MediaOutputRecordDetails } {
	const entries = normalizeMediaOutputEntries(details).filter((entry) => entry.id !== id);
	return {
		quantityBaseValue: entries.length,
		details: entries.length ? { kind: 'media-output', entries } : undefined,
	};
}

export function publishedMediaOutputCount(details: HabitRecordDetails | undefined): number {
	return normalizeMediaOutputEntries(details).filter(({ status }) => status === 'published').length;
}
