/* eslint-disable i18next/no-literal-string -- Dexie table names are schema identifiers. */
import type { StateStorage } from 'zustand/middleware';

import { appDatabase, type RepeatOutcomeDatabase, type SettingRecord } from '@shared/lib/db';

type LegacyStorage = Pick<Storage, 'getItem' | 'removeItem'>;

export function createDexieSettingsStorage(
	database: RepeatOutcomeDatabase = appDatabase,
	legacyStorage: LegacyStorage = localStorage,
): StateStorage {
	const table = database.tableFor<SettingRecord>('settings');
	return {
		getItem: async (name) => {
			const current = await table.get(name);
			if (typeof current?.value === 'string') return current.value;
			const legacy = legacyStorage.getItem(name);
			if (legacy === null) return null;
			try {
				JSON.parse(legacy);
			} catch {
				return null;
			}
			await table.put({ key: name, value: legacy, updatedAt: new Date().toISOString() });
			legacyStorage.removeItem(name);
			return legacy;
		},
		setItem: async (name, value) => {
			await table.put({ key: name, value, updatedAt: new Date().toISOString() });
		},
		removeItem: async (name) => {
			await table.delete(name);
		},
	};
}
