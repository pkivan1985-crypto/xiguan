import 'fake-indexeddb/auto';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { PRODUCTION_DATABASE_NAME, RepeatOutcomeDatabase } from './repeatOutcomeDatabase';

let database: RepeatOutcomeDatabase;

beforeEach(() => {
	database = new RepeatOutcomeDatabase(`test-repeat-outcome-${crypto.randomUUID()}`);
});

afterEach(async () => {
	database.close();
	await database.delete();
});

describe('RepeatOutcomeDatabase schema v1', () => {
	it('keeps the production database name fixed without opening it', () => {
		expect(PRODUCTION_DATABASE_NAME).toBe('repeat-outcome');
	});

	it('defines exactly the ten approved tables at version one', async () => {
		await database.open();

		expect(database.verno).toBe(1);
		expect(database.tables.map(({ name }) => name).sort()).toEqual([
			'actionRecords',
			'cardTemplates',
			'categoryDefinitions',
			'goalRevisions',
			'longTermGoals',
			'outcomeBatches',
			'settings',
			'stageGoals',
			'todayDrafts',
			'userCards',
		]);
	});

	it('defines the two required unique business indexes', async () => {
		await database.open();

		const actionIndex = database.table('actionRecords').schema.indexes.find(({ name }) => name === '[userCardId+localDate]');
		const batchIndex = database.table('outcomeBatches').schema.indexes.find(({ name }) => name === 'submissionId');
		expect(actionIndex).toMatchObject({ compound: true, unique: true });
		expect(batchIndex).toMatchObject({ unique: true });
	});
});
