import { createEmptyTodayDraft, validateTodayDraft, type TodayDraft } from '@entities/today-draft';
import type { LocalDate } from '@shared/lib/date';
import { appDatabase, type RepeatOutcomeDatabase } from '@shared/lib/db';

export async function openTodayDraft(
	database: RepeatOutcomeDatabase,
	localDate: LocalDate,
	nowIso: string,
): Promise<TodayDraft> {
	const todayDrafts = database.tableFor<TodayDraft>('todayDrafts');
	return database.transaction('rw', todayDrafts, async () => {
		const existing = await todayDrafts.get(localDate);
		if (existing) {
			validateTodayDraft(existing, localDate);
			return existing;
		}
		const created = createEmptyTodayDraft(localDate, nowIso);
		await todayDrafts.add(created);
		return created;
	});
}

export async function updateTodayDraft(
	database: RepeatOutcomeDatabase,
	localDate: LocalDate,
	updater: (draft: TodayDraft) => TodayDraft,
): Promise<TodayDraft> {
	const todayDrafts = database.tableFor<TodayDraft>('todayDrafts');
	return database.transaction('rw', todayDrafts, async () => {
		const existing = await todayDrafts.get(localDate);
		if (!existing) throw new Error('TODAY_DRAFT_NOT_FOUND');
		const updated = updater(existing);
		validateTodayDraft(updated, localDate);
		await todayDrafts.put(updated);
		return updated;
	});
}

export function openTodayDraftInApp(localDate: LocalDate, nowIso: string): Promise<TodayDraft> {
	return openTodayDraft(appDatabase, localDate, nowIso);
}

export function updateTodayDraftInApp(
	localDate: LocalDate,
	updater: (draft: TodayDraft) => TodayDraft,
): Promise<TodayDraft> {
	return updateTodayDraft(appDatabase, localDate, updater);
}
