/* eslint-disable i18next/no-literal-string -- IndexedDB index names are schema identifiers, not user-facing copy. */
import type { Table } from 'dexie';
import type { RepeatOutcomeDatabase } from '@shared/lib/db';

import type { ActionRecord } from '../model/types';

export class ActionRecordRepository {
	private readonly table: Table<ActionRecord, string>;

	constructor(database: RepeatOutcomeDatabase) {
		this.table = database.tableFor<ActionRecord>('actionRecords');
	}

	put(record: ActionRecord): Promise<string> {
		return this.table.put(record);
	}

	getByCardAndDate(userCardId: string, localDate: string): Promise<ActionRecord | undefined> {
		return this.table.where('[userCardId+localDate]').equals([userCardId, localDate]).first();
	}

	listByUserCard(userCardId: string): Promise<ActionRecord[]> {
		return this.table.where('userCardId').equals(userCardId).toArray();
	}
}
