import 'fake-indexeddb/auto';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { seedSystemDefinitions } from '@entities/card-template';
import { RepeatOutcomeDatabase } from '@shared/lib/db';

import { createRunningCard, type CreateRunningCardInput } from './createRunningCard';

let database: RepeatOutcomeDatabase;

function validInput(overrides: Partial<CreateRunningCardInput> = {}): CreateRunningCardInput {
	return {
		cardTitle: '晨跑',
		longTermTitle: '累计跑步 100 公里',
		longTermTargetDisplay: '100',
		stageTitle: '阶段跑步 20 公里',
		stageTargetDisplay: '20',
		startDate: '2026-07-11',
		endDate: '2026-12-31',
		nowIso: '2026-07-11T12:00:00.000Z',
		ids: { userCardId: 'card-a', longTermGoalId: 'long-a', stageGoalId: 'stage-a' },
		...overrides,
	};
}

beforeEach(() => {
	database = new RepeatOutcomeDatabase(`test-create-running-card-${crypto.randomUUID()}`);
});

afterEach(async () => {
	database.close();
	await database.delete();
});

describe('createRunningCard', () => {
	it('creates one running card and both active quantity goals atomically', async () => {
		const result = await createRunningCard(database, validInput());

		expect(result.userCard).toMatchObject({ id: 'card-a', officialCardId: 'running', title: '晨跑', status: 'active' });
		expect(result.longTermGoal).toMatchObject({ id: 'long-a', userCardId: 'card-a', targetQuantityBase: 100_000, status: 'active' });
		expect(result.stageGoal).toMatchObject({ id: 'stage-a', longTermGoalId: 'long-a', mode: 'quantity', targetQuantityBase: 20_000, status: 'active' });
		expect(await database.table('userCards').count()).toBe(1);
		expect(await database.table('longTermGoals').count()).toBe(1);
		expect(await database.table('stageGoals').count()).toBe(1);
	});

	it('allows multiple running cards with independent active goals', async () => {
		await createRunningCard(database, validInput());
		await createRunningCard(database, validInput({
			cardTitle: '夜跑',
			ids: { userCardId: 'card-b', longTermGoalId: 'long-b', stageGoalId: 'stage-b' },
		}));

		expect(await database.table('userCards').count()).toBe(2);
		expect(await database.table('longTermGoals').count()).toBe(2);
		expect(await database.table('stageGoals').count()).toBe(2);
	});

	it('rejects invalid names, dates, and stage targets before writing', async () => {
		await expect(createRunningCard(database, validInput({ cardTitle: '  ' }))).rejects.toThrow('CARD_TITLE_REQUIRED');
		await expect(createRunningCard(database, validInput({ endDate: '2026-07-10' }))).rejects.toThrow('INVALID_DATE_RANGE');
		await expect(createRunningCard(database, validInput({ stageTargetDisplay: '101' }))).rejects.toThrow('STAGE_TARGET_EXCEEDS_LONG_TERM');
		expect(await database.table('userCards').count()).toBe(0);
	});

	it('rejects creation when the running template is disabled', async () => {
		await seedSystemDefinitions(database);
		await database.table('cardTemplates').update('running', { enabled: false });

		await expect(createRunningCard(database, validInput())).rejects.toThrow('RUNNING_TEMPLATE_UNAVAILABLE');
		expect(await database.table('userCards').count()).toBe(0);
	});

	it('rolls back the card and long-term goal when the final write fails', async () => {
		const hook = () => { throw new Error('INJECTED_STAGE_FAILURE'); };
		database.table('stageGoals').hook('creating').subscribe(hook);

		try {
			await expect(createRunningCard(database, validInput())).rejects.toThrow('INJECTED_STAGE_FAILURE');
		} finally {
			database.table('stageGoals').hook('creating').unsubscribe(hook);
		}

		expect(await database.table('userCards').count()).toBe(0);
		expect(await database.table('longTermGoals').count()).toBe(0);
		expect(await database.table('stageGoals').count()).toBe(0);
	});
});
