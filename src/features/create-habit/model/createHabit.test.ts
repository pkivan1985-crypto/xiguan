import 'fake-indexeddb/auto';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { RepeatOutcomeDatabase } from '@shared/lib/db';

import { createHabit } from './createHabit';

let database: RepeatOutcomeDatabase;

beforeEach(() => {
	database = new RepeatOutcomeDatabase(`test-create-habit-${crypto.randomUUID()}`);
});

afterEach(async () => {
	database.close();
	await database.delete();
});

describe('createHabit', () => {
	it('creates a habit with only a name and tracking preset', async () => {
		const result = await createHabit(database, {
			templateId: 'water',
			cardTitle: '工作日喝水',
			startDate: '2026-07-25',
			nowIso: '2026-07-25T01:00:00.000Z',
			ids: { userCardId: 'card-water', longTermGoalId: 'long-water', stageGoalId: 'stage-water' },
		});

		expect(result.userCard).toMatchObject({ officialCardId: 'water', title: '工作日喝水' });
		expect(result.longTermGoal).toBeUndefined();
		expect(result.stageGoal).toBeUndefined();
		expect(await database.table('longTermGoals').count()).toBe(0);
	});

	it('atomically creates optional long-term and stage plans using the preset unit', async () => {
		const result = await createHabit(database, {
			templateId: 'reading-time',
			cardTitle: '晚间阅读',
			startDate: '2026-07-25',
			longTerm: { title: '累计阅读 1000 分钟', targetDisplay: '1000' },
			stage: { title: '先读 100 分钟', targetDisplay: '100' },
			nowIso: '2026-07-25T01:00:00.000Z',
			ids: { userCardId: 'card-read', longTermGoalId: 'long-read', stageGoalId: 'stage-read' },
		});

		expect(result.longTermGoal).toMatchObject({ targetQuantityBase: 1000 });
		expect(result.stageGoal).toMatchObject({ targetQuantityBase: 100 });
	});

	it('rejects a stage plan without a long-term plan', async () => {
		await expect(createHabit(database, {
			templateId: 'sleep',
			cardTitle: '早睡',
			startDate: '2026-07-25',
			stage: { title: '连续七天', targetDisplay: '7' },
			nowIso: '2026-07-25T01:00:00.000Z',
			ids: { userCardId: 'card-sleep', longTermGoalId: 'long-sleep', stageGoalId: 'stage-sleep' },
		})).rejects.toThrow('STAGE_REQUIRES_LONG_TERM');
		expect(await database.table('userCards').count()).toBe(0);
	});
});
