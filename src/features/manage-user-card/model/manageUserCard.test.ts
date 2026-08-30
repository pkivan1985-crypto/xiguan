import 'fake-indexeddb/auto';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { ActionRecord } from '@entities/action-record';
import type { GoalRevision, LongTermGoal, StageGoal } from '@entities/goal';
import type { OutcomeBatch } from '@entities/outcome-batch';
import type { TodayDraft } from '@entities/today-draft';
import type { UserCard } from '@entities/user-card';
import { RepeatOutcomeDatabase } from '@shared/lib/db';

import { deleteUserCard, setUserCardArchived } from './manageUserCard';

let database: RepeatOutcomeDatabase;

const CREATED_AT = '2026-07-01T00:00:00.000Z';

function card(id: string, title: string): UserCard {
	return {
		id,
		officialCardId: 'running',
		title,
		status: 'active',
		sortOrder: 0,
		createdAt: CREATED_AT,
		updatedAt: CREATED_AT,
	};
}

beforeEach(() => {
	database = new RepeatOutcomeDatabase(`test-manage-user-card-${crypto.randomUUID()}`);
});

afterEach(async () => {
	database.close();
	await database.delete();
});

describe('manageUserCard', () => {
	it('archives and restores a card without changing its goals or history', async () => {
		await database.table<UserCard>('userCards').add(card('card-a', '晨跑'));
		await database.table<LongTermGoal>('longTermGoals').add({
			id: 'long-a',
			userCardId: 'card-a',
			title: '累计跑步',
			targetQuantityBase: 100_000,
			status: 'active',
			startDate: '2026-07-01',
			createdAt: CREATED_AT,
			updatedAt: CREATED_AT,
		});
		await database.table<ActionRecord>('actionRecords').add({
			id: 'record-a',
			userCardId: 'card-a',
			localDate: '2026-07-26',
			quantityBaseValue: 5_000,
			longTermGoalId: 'long-a',
			firstSavedAt: CREATED_AT,
			lastSavedAt: CREATED_AT,
			lastSubmissionId: 'submission-a',
		});

		const archived = await setUserCardArchived(
			database,
			{ userCardId: 'card-a', archived: true, nowIso: '2026-07-26T09:00:00.000Z' },
		);
		const restored = await setUserCardArchived(
			database,
			{ userCardId: 'card-a', archived: false, nowIso: '2026-07-26T10:00:00.000Z' },
		);

		expect(archived).toMatchObject({ status: 'archived', updatedAt: '2026-07-26T09:00:00.000Z' });
		expect(restored).toMatchObject({ status: 'active', updatedAt: '2026-07-26T10:00:00.000Z' });
		expect(await database.table<LongTermGoal>('longTermGoals').count()).toBe(1);
		expect(await database.table<ActionRecord>('actionRecords').count()).toBe(1);
	});

	it('does not restore an archived extra-expense card when another one is active', async () => {
		await database.table<UserCard>('userCards').bulkAdd([
			{
				...card('expense-old', '旧额外开支'), officialCardId: 'extra-expense', status: 'archived',
			},
			{
				...card('expense-active', '额外开支'), officialCardId: 'extra-expense', status: 'active',
			},
		]);

		await expect(setUserCardArchived(
			database,
			{ userCardId: 'expense-old', archived: false, nowIso: '2026-07-26T10:00:00.000Z' },
		)).rejects.toThrow('ACTIVE_EXTRA_EXPENSE_CARD_EXISTS');
		expect(await database.table<UserCard>('userCards').get('expense-old'))
			.toMatchObject({ status: 'archived', updatedAt: CREATED_AT });
	});

	it('permanently deletes one card and every reference while preserving other data', async () => {
		await database.table<UserCard>('userCards').bulkAdd([
			card('card-a', '晨跑'),
			card('card-b', '夜跑'),
		]);
		await database.table<LongTermGoal>('longTermGoals').bulkAdd([
			{
				id: 'long-a',
				userCardId: 'card-a',
				title: '晨跑总目标',
				targetQuantityBase: 100_000,
				status: 'active',
				startDate: '2026-07-01',
				createdAt: CREATED_AT,
				updatedAt: CREATED_AT,
			},
			{
				id: 'long-b',
				userCardId: 'card-b',
				title: '夜跑总目标',
				targetQuantityBase: 50_000,
				status: 'active',
				startDate: '2026-07-01',
				createdAt: CREATED_AT,
				updatedAt: CREATED_AT,
			},
		]);
		await database.table<StageGoal>('stageGoals').bulkAdd([
			{
				id: 'stage-a',
				longTermGoalId: 'long-a',
				title: '晨跑阶段',
				mode: 'quantity',
				targetQuantityBase: 20_000,
				status: 'active',
				startDate: '2026-07-01',
				createdAt: CREATED_AT,
				updatedAt: CREATED_AT,
			},
			{
				id: 'stage-b',
				longTermGoalId: 'long-b',
				title: '夜跑阶段',
				mode: 'quantity',
				targetQuantityBase: 10_000,
				status: 'active',
				startDate: '2026-07-01',
				createdAt: CREATED_AT,
				updatedAt: CREATED_AT,
			},
		]);
		await database.table<GoalRevision>('goalRevisions').bulkAdd([
			{
				id: 'revision-a',
				goalType: 'stage',
				goalId: 'stage-a',
				createdAt: CREATED_AT,
				reason: 'correction',
				beforeStatus: 'active',
				afterStatus: 'active',
				submissionId: 'submission-a',
			},
			{
				id: 'revision-b',
				goalType: 'longTerm',
				goalId: 'long-b',
				createdAt: CREATED_AT,
				reason: 'correction',
				beforeStatus: 'active',
				afterStatus: 'active',
				submissionId: 'submission-b',
			},
		]);
		await database.table<ActionRecord>('actionRecords').bulkAdd([
			{
				id: 'record-a',
				userCardId: 'card-a',
				localDate: '2026-07-26',
				quantityBaseValue: 5_000,
				longTermGoalId: 'long-a',
				stageGoalId: 'stage-a',
				firstSavedAt: CREATED_AT,
				lastSavedAt: CREATED_AT,
				lastSubmissionId: 'submission-a',
			},
			{
				id: 'record-b',
				userCardId: 'card-b',
				localDate: '2026-07-26',
				quantityBaseValue: 3_000,
				longTermGoalId: 'long-b',
				stageGoalId: 'stage-b',
				firstSavedAt: CREATED_AT,
				lastSavedAt: CREATED_AT,
				lastSubmissionId: 'submission-b',
			},
		]);
		await database.table<TodayDraft>('todayDrafts').add({
			localDate: '2026-07-26',
			status: 'editing',
			updatedAt: CREATED_AT,
			slots: [
				{ slotIndex: 0, userCardId: 'card-a', valueText: '5' },
				{ slotIndex: 1, userCardId: 'card-b', valueText: '3' },
			],
		});
		await database.table<OutcomeBatch>('outcomeBatches').bulkAdd([
			{
				id: 'batch-mixed',
				submissionId: 'submission-mixed',
				localDate: '2026-07-26',
				status: 'ready',
				createdAt: CREATED_AT,
				items: [
					{
						slotIndex: 0,
						userCardId: 'card-a',
						cardTitle: '晨跑',
						quantityBaseValue: 5_000,
						baseUnit: 'm',
						displayUnit: 'km',
						basePerDisplayUnit: 1_000,
						maxDecimalPlaces: 2,
					},
					{
						slotIndex: 1,
						userCardId: 'card-b',
						cardTitle: '夜跑',
						quantityBaseValue: 3_000,
						baseUnit: 'm',
						displayUnit: 'km',
						basePerDisplayUnit: 1_000,
						maxDecimalPlaces: 2,
					},
				],
			},
			{
				id: 'batch-target-only',
				submissionId: 'submission-target-only',
				localDate: '2026-07-25',
				status: 'completed',
				createdAt: CREATED_AT,
				items: [{
					slotIndex: 0,
					userCardId: 'card-a',
					cardTitle: '晨跑',
					quantityBaseValue: 4_000,
					baseUnit: 'm',
					displayUnit: 'km',
					basePerDisplayUnit: 1_000,
					maxDecimalPlaces: 2,
				}],
			},
		]);

		const result = await deleteUserCard(database, 'card-a');

		expect(result).toEqual({
			actionRecordCount: 1,
			longTermGoalCount: 1,
			outcomeBatchCount: 2,
			stageGoalCount: 1,
			todayDraftCount: 1,
		});
		expect((await database.table<UserCard>('userCards').toArray()).map(({ id }) => id)).toEqual(['card-b']);
		expect((await database.table<LongTermGoal>('longTermGoals').toArray()).map(({ id }) => id)).toEqual(['long-b']);
		expect((await database.table<StageGoal>('stageGoals').toArray()).map(({ id }) => id)).toEqual(['stage-b']);
		expect((await database.table<GoalRevision>('goalRevisions').toArray()).map(({ id }) => id)).toEqual(['revision-b']);
		expect((await database.table<ActionRecord>('actionRecords').toArray()).map(({ id }) => id)).toEqual(['record-b']);
		expect((await database.table<TodayDraft>('todayDrafts').get('2026-07-26'))?.slots).toEqual([
			{ slotIndex: 0, userCardId: null, valueText: '' },
			{ slotIndex: 1, userCardId: 'card-b', valueText: '3' },
		]);
		expect(await database.table<OutcomeBatch>('outcomeBatches').get('batch-target-only')).toBeUndefined();
		expect((await database.table<OutcomeBatch>('outcomeBatches').get('batch-mixed'))?.items).toHaveLength(1);
		expect((await database.table<OutcomeBatch>('outcomeBatches').get('batch-mixed'))?.items[0]?.userCardId).toBe('card-b');
	});

	it('fails loudly when the card does not exist', async () => {
		await expect(setUserCardArchived(
			database,
			{ userCardId: 'missing', archived: true, nowIso: '2026-07-26T09:00:00.000Z' },
		)).rejects.toThrow('USER_CARD_NOT_FOUND');
		await expect(deleteUserCard(database, 'missing')).rejects.toThrow('USER_CARD_NOT_FOUND');
	});
});
