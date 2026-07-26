import 'fake-indexeddb/auto';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createHabit } from '@features/create-habit';
import { RepeatOutcomeDatabase } from '@shared/lib/db';

import { addStageGoal } from './addStageGoal';

let database: RepeatOutcomeDatabase;

beforeEach(() => {
	database = new RepeatOutcomeDatabase(`test-add-stage-goal-${crypto.randomUUID()}`);
});

afterEach(async () => {
	database.close();
	await database.delete();
});

describe('addStageGoal', () => {
	it('adds the next stage as planned without replacing the active stage', async () => {
		await createHabit(database, {
			templateId: 'reading-time',
			cardTitle: '晚读',
			startDate: '2026-07-25',
			longTerm: { title: '读完本能书', targetDisplay: '500' },
			stage: { title: '第一章', targetDisplay: '100' },
			nowIso: '2026-07-25T01:00:00.000Z',
			ids: { userCardId: 'card-read', longTermGoalId: 'long-read', stageGoalId: 'stage-1' },
		});

		const result = await addStageGoal(database, {
			id: 'stage-2',
			userCardId: 'card-read',
			longTermGoalId: 'long-read',
			title: '第二章',
			targetDisplay: '120',
			startDate: '2026-07-25',
			nowIso: '2026-07-25T02:00:00.000Z',
		});

		expect(result).toMatchObject({ id: 'stage-2', sequence: 1, status: 'planned' });
		expect(await database.table('stageGoals').toArray()).toEqual(expect.arrayContaining([
			expect.objectContaining({ id: 'stage-1', status: 'active' }),
			expect.objectContaining({ id: 'stage-2', status: 'planned' }),
		]));
	});
});
