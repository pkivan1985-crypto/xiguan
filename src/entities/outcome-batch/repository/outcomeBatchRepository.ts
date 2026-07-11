/* eslint-disable i18next/no-literal-string -- IndexedDB index names are schema identifiers, not user-facing copy. */
import type { Table } from 'dexie';
import type { RepeatOutcomeDatabase } from '@shared/lib/db';

import type { OutcomeBatch } from '../model/types';

export class OutcomeBatchRepository {
	private readonly table: Table<OutcomeBatch, string>;

	constructor(database: RepeatOutcomeDatabase) {
		this.table = database.tableFor<OutcomeBatch>('outcomeBatches');
	}

	add(batch: OutcomeBatch): Promise<string> {
		return this.table.add(batch);
	}

	getBySubmissionId(submissionId: string): Promise<OutcomeBatch | undefined> {
		return this.table.where('submissionId').equals(submissionId).first();
	}
}
