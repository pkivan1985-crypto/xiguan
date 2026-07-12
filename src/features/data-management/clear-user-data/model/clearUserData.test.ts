import 'fake-indexeddb/auto';

import { afterEach, describe, expect, it, vi } from 'vitest';

import type { CardTemplate } from '@entities/card-template';
import type { UserCard } from '@entities/user-card';
import { RepeatOutcomeDatabase } from '@shared/lib/db';
import { clearUserData } from './clearUserData';

describe('safe user-data clear', () => {
	const databases: RepeatOutcomeDatabase[] = [];
	afterEach(async () => Promise.all(databases.splice(0).map((database) => database.delete())));

	async function setup() {
		const database = new RepeatOutcomeDatabase(`clear-${crypto.randomUUID()}`);
		databases.push(database);
		await database.tableFor<CardTemplate>('cardTemplates').put({ id: 'running', categoryId: 'sport', title: '跑步', sortOrder: 0, enabled: true, version: 1, defaultStageMode: 'quantity', quantity: { baseUnit: 'm', displayUnit: 'km', basePerDisplayUnit: 1000, maxDecimalPlaces: 2, confirmationThresholdDisplay: 100 } });
		await database.tableFor<UserCard>('userCards').put({ id: 'card-1', officialCardId: 'running', title: '晨跑', status: 'active', sortOrder: 0, createdAt: '2026-07-12T01:00:00.000Z', updatedAt: '2026-07-12T01:00:00.000Z' });
		return database;
	}

	it('clears user tables but keeps official definitions', async () => {
		const database = await setup();
		await clearUserData(database);
		expect(await database.tableFor<UserCard>('userCards').count()).toBe(0);
		expect(await database.tableFor<CardTemplate>('cardTemplates').count()).toBe(1);
	});

	it('rolls back all clears when one table fails', async () => {
		const database = await setup();
		vi.spyOn(database.tableFor('stageGoals'), 'clear').mockRejectedValueOnce(new Error('CLEAR_FAILED'));
		await expect(clearUserData(database)).rejects.toThrow('CLEAR_FAILED');
		expect(await database.tableFor<UserCard>('userCards').count()).toBe(1);
	});
});
