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

	it('creates only one active event-driven extra-expense card without a plan', async () => {
		const input = {
			templateId: 'extra-expense', cardTitle: '额外开支', startDate: '2026-08-26',
			nowIso: '2026-08-26T01:00:00.000Z',
			ids: { userCardId: 'expense-a', longTermGoalId: 'unused-long', stageGoalId: 'unused-stage' },
		};
		const result = await createHabit(database, input);

		expect(result.userCard).toMatchObject({ officialCardId: 'extra-expense', dailyPlan: undefined });
		expect(result.longTermGoal).toBeUndefined();
		await expect(createHabit(database, {
			...input,
			ids: { ...input.ids, userCardId: 'expense-b' },
		})).rejects.toThrow('ACTIVE_EXTRA_EXPENSE_CARD_EXISTS');
	});

	it('stores light-food rules as optional card configuration', async () => {
		const result = await createHabit(database, {
			templateId: 'light-food',
			cardTitle: '清淡饮食',
			startDate: '2026-07-25',
			habitConfig: {
				kind: 'light-food',
				rules: [
					{ id: 'no-spicy', label: '不吃辣', builtIn: true },
					{ id: 'custom-fried', label: '不吃油炸食物', builtIn: false },
				],
			},
			nowIso: '2026-07-25T01:00:00.000Z',
			ids: { userCardId: 'card-food', longTermGoalId: 'long-food', stageGoalId: 'stage-food' },
		});

		expect(result.userCard.habitConfig).toEqual({
			kind: 'light-food',
			rules: [
				{ id: 'no-spicy', label: '不吃辣', builtIn: true },
				{ id: 'custom-fried', label: '不吃油炸食物', builtIn: false },
			],
		});
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

		expect(result.longTermGoal).toMatchObject({ title: '晚间阅读', targetQuantityBase: 1000 });
		expect(result.stageGoal).toMatchObject({ targetQuantityBase: 100 });
	});

	it('stores a derived daily plan and defaults an empty stage name', async () => {
		const result = await createHabit(database, {
			templateId: 'running',
			cardTitle: '晨跑',
			startDate: '2026-07-27',
			longTerm: { targetDisplay: '100', endDate: '2026-10-24' },
			stage: {
				targetDisplay: '100',
				endDate: '2026-10-24',
				dailyTargetDisplay: '1.25',
			},
			dailyPlan: {
				mode: 'custom',
				weekdays: [1, 3, 5],
				customTargetsDisplayByWeekday: { 1: '2', 3: '3', 5: '4' },
			},
			nowIso: '2026-07-27T01:00:00.000Z',
			ids: { userCardId: 'card-run', longTermGoalId: 'long-run', stageGoalId: 'stage-run' },
		});

		expect(result.userCard).toMatchObject({
			title: '晨跑',
			dailyPlan: {
				mode: 'custom',
				weekdays: [1, 3, 5],
				customTargetsBaseByWeekday: { 1: 2_000, 3: 3_000, 5: 4_000 },
			},
		});
		expect(result.longTermGoal).toMatchObject({ title: '晨跑', endDate: '2026-10-24' });
		expect(result.stageGoal).toMatchObject({
			title: '阶段 1',
			dailyTargetBase: 1_250,
			endDate: '2026-10-24',
		});
	});

	it('stores an average daily target without creating a stage goal', async () => {
		const result = await createHabit(database, {
			templateId: 'running',
			cardTitle: 'Direct plan',
			startDate: '2026-07-27',
			longTerm: { targetDisplay: '100', endDate: '2026-10-24' },
			dailyPlan: {
				mode: 'average',
				weekdays: [1, 3, 5],
				averageTargetDisplay: '2.5',
			},
			nowIso: '2026-07-27T01:00:00.000Z',
			ids: { userCardId: 'card-direct', longTermGoalId: 'long-direct', stageGoalId: 'unused-stage' },
		});

		expect(result.userCard.dailyPlan).toEqual({
			mode: 'average',
			weekdays: [1, 3, 5],
			averageTargetBase: 2_500,
			customTargetsBaseByWeekday: undefined,
		});
		expect(result.stageGoals).toEqual([]);
		expect(await database.table('stageGoals').count()).toBe(0);
	});

	it('creates ordered stages with only the first stage active', async () => {
		const result = await createHabit(database, {
			templateId: 'reading-time',
			cardTitle: '读完整本书',
			startDate: '2026-07-25',
			longTerm: { title: '本能书', targetDisplay: '500' },
			stages: [
				{ title: '第一章', targetDisplay: '100' },
				{ title: '第二章', targetDisplay: '120' },
				{ title: '第三章', targetDisplay: '80' },
			],
			nowIso: '2026-07-25T01:00:00.000Z',
			ids: {
				userCardId: 'card-book',
				longTermGoalId: 'long-book',
				stageGoalId: 'unused-stage',
				stageGoalIds: ['stage-1', 'stage-2', 'stage-3'],
			},
		});

		expect(result.stageGoals).toHaveLength(3);
		expect(result.stageGoals.map(({ id, sequence, status }) => ({ id, sequence, status }))).toEqual([
			{ id: 'stage-1', sequence: 0, status: 'active' },
			{ id: 'stage-2', sequence: 1, status: 'planned' },
			{ id: 'stage-3', sequence: 2, status: 'planned' },
		]);
		expect(await database.table('stageGoals').count()).toBe(3);
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
