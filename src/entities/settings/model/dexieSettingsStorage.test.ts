import 'fake-indexeddb/auto';

import { afterEach, describe, expect, it } from 'vitest';

import { RepeatOutcomeDatabase, type SettingRecord } from '@shared/lib/db';
import { createDexieSettingsStorage } from './dexieSettingsStorage';

function legacyStorage(initial?: string) {
	let value = initial ?? null;
	return {
		getItem: () => value,
		removeItem: () => { value = null; },
		value: () => value,
	};
}

describe('Dexie settings storage', () => {
	const databases: RepeatOutcomeDatabase[] = [];
	afterEach(async () => Promise.all(databases.splice(0).map((database) => database.delete())));

	function setup(legacy?: string) {
		const database = new RepeatOutcomeDatabase(`settings-${crypto.randomUUID()}`);
		databases.push(database);
		const local = legacyStorage(legacy);
		return { database, local, storage: createDexieSettingsStorage(database, local) };
	}

	it('returns null when neither Dexie nor legacy storage has settings', async () => {
		const { storage } = setup();
		expect(await storage.getItem('repeat-outcome-ui-settings')).toBeNull();
	});

	it('migrates valid legacy JSON once and removes the old key', async () => {
		const legacy = '{"state":{"settings":{"theme":"dark"}},"version":0}';
		const { database, local, storage } = setup(legacy);
		expect(await storage.getItem('repeat-outcome-ui-settings')).toBe(legacy);
		expect(local.value()).toBeNull();
		expect((await database.tableFor<SettingRecord>('settings').get('repeat-outcome-ui-settings'))?.value).toBe(legacy);
	});

	it('prefers canonical Dexie settings over stale localStorage', async () => {
		const { database, local, storage } = setup('{"stale":true}');
		await database.tableFor<SettingRecord>('settings').put({ key: 'repeat-outcome-ui-settings', value: '{"fresh":true}', updatedAt: '2026-07-12T01:00:00.000Z' });
		expect(await storage.getItem('repeat-outcome-ui-settings')).toBe('{"fresh":true}');
		expect(local.value()).toBe('{"stale":true}');
	});

	it('does not copy or delete malformed legacy settings', async () => {
		const { database, local, storage } = setup('{broken');
		expect(await storage.getItem('repeat-outcome-ui-settings')).toBeNull();
		expect(local.value()).toBe('{broken');
		expect(await database.tableFor<SettingRecord>('settings').count()).toBe(0);
	});

	it('persists and removes values through the StateStorage contract', async () => {
		const { database, storage } = setup();
		await storage.setItem('repeat-outcome-ui-settings', '{"state":{}}');
		expect(await storage.getItem('repeat-outcome-ui-settings')).toBe('{"state":{}}');
		await storage.removeItem('repeat-outcome-ui-settings');
		expect(await database.tableFor<SettingRecord>('settings').count()).toBe(0);
	});
});
