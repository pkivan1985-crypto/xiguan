/* eslint-disable i18next/no-literal-string -- IndexedDB table names are schema identifiers, not user-facing copy. */
import type { Table } from 'dexie';
import type { RepeatOutcomeDatabase } from '@shared/lib/db';

import type { TodayDraft } from '../model/types';

export class TodayDraftRepository {
	private readonly table: Table<TodayDraft, string>;

	constructor(database: RepeatOutcomeDatabase) {
		this.table = database.tableFor<TodayDraft>('todayDrafts');
	}

	put(draft: TodayDraft): Promise<string> {
		return this.table.put(draft);
	}

	get(localDate: string): Promise<TodayDraft | undefined> {
		return this.table.get(localDate);
	}
}
