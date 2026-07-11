/* eslint-disable i18next/no-literal-string -- IndexedDB table names are schema identifiers, not user-facing copy. */
import type { Table } from 'dexie';
import type { RepeatOutcomeDatabase } from '@shared/lib/db';

import type { UserCard } from '../model/types';

export class UserCardRepository {
	private readonly table: Table<UserCard, string>;

	constructor(database: RepeatOutcomeDatabase) {
		this.table = database.tableFor<UserCard>('userCards');
	}

	put(card: UserCard): Promise<string> {
		return this.table.put(card);
	}

	get(id: string): Promise<UserCard | undefined> {
		return this.table.get(id);
	}

	getMany(ids: readonly string[]): Promise<(UserCard | undefined)[]> {
		return this.table.bulkGet([...ids]);
	}
}
