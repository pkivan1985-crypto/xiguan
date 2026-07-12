import 'fake-indexeddb/auto';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { TodayDraft } from '@entities/today-draft';
import type { ActionRecord } from '@entities/action-record';
import { seedSystemDefinitions } from '@entities/card-template';
import { RepeatOutcomeDatabase } from '@shared/lib/db';
import { saveTodayOutcome } from './saveTodayOutcome';

const LOCAL_DATE = '2026-07-11';
let database: RepeatOutcomeDatabase;

function table(name: Parameters<RepeatOutcomeDatabase['table']>[0]) {
	return database.table(name);
}

function makeDraft(valueText = '5'): TodayDraft {
	return {
		localDate: LOCAL_DATE,
		status: 'editing',
		updatedAt: '2026-07-11T08:00:00.000Z',
		slots: [0, 1, 2, 3, 4, 5].map((slotIndex) => ({
			slotIndex,
			userCardId: slotIndex === 0 ? 'card-a' : null,
			valueText: slotIndex === 0 ? valueText : '',
		})),
	};
}

function validInput(submissionId: string, nowIso = '2026-07-11T09:00:00.000Z') {
	return { localDate: LOCAL_DATE, currentLocalDate: LOCAL_DATE, nowIso, submissionId };
}

function previousRecord(quantityBaseValue: number): ActionRecord {
	return {
		id: 'card-a:2026-07-10', userCardId: 'card-a', localDate: '2026-07-10', quantityBaseValue,
		longTermGoalId: 'long-a', stageGoalId: 'stage-a', firstSavedAt: '2026-07-10T08:00:00.000Z',
		lastSavedAt: '2026-07-10T08:00:00.000Z', lastSubmissionId: 'previous-submission',
	};
}

async function arrangeDraft(valueText = '5'): Promise<void> {
	await seedSystemDefinitions(database);
	await seedSystemDefinitions(database);
	await table('userCards').add({ id: 'card-a', officialCardId: 'running', title: '晨跑', status: 'active', sortOrder: 0, createdAt: '2026-07-11T08:00:00.000Z', updatedAt: '2026-07-11T08:00:00.000Z' });
	await table('todayDrafts').add(makeDraft(valueText));
}

beforeEach(() => {
	database = new RepeatOutcomeDatabase(`test-save-outcome-${crypto.randomUUID()}`);
});

afterEach(async () => {
	database.close();
	await database.delete();
});

describe('saveTodayOutcome', () => {
	it('seeds approved definitions idempotently and rejects an empty draft without writes', async () => {
		await seedSystemDefinitions(database);
		await seedSystemDefinitions(database);
		await table('todayDrafts').add({ ...makeDraft(), slots: [0, 1, 2, 3, 4, 5].map((slotIndex) => ({ slotIndex, userCardId: null, valueText: '' })) });

		await expect(saveTodayOutcome(database, validInput('submission-empty'))).rejects.toThrow('TODAY_DRAFT_EMPTY');
		expect(await table('categoryDefinitions').count()).toBe(3);
		expect(await table('cardTemplates').count()).toBe(1);
		expect(await table('actionRecords').count()).toBe(0);
		expect(await table('outcomeBatches').count()).toBe(0);
		expect(await table('todayDrafts').get(LOCAL_DATE)).toMatchObject({ status: 'editing' });
	});

	it('rejects date drift, invalid values, and unconfirmed values above 100 km', async () => {
		await arrangeDraft('100.001');

		await expect(saveTodayOutcome(database, { ...validInput('submission-date'), localDate: '2026-07-12', currentLocalDate: '2026-07-12' })).rejects.toThrow('TODAY_DRAFT_NOT_FOUND');
		await expect(saveTodayOutcome(database, validInput('submission-limit'))).rejects.toThrow('QUANTITY_CONFIRMATION_REQUIRED');
		await table('todayDrafts').update(LOCAL_DATE, { slots: makeDraft('1e2').slots });
		await expect(saveTodayOutcome(database, validInput('submission-invalid'))).rejects.toThrow('INVALID_QUANTITY');
		expect(await table('actionRecords').count()).toBe(0);
	});

	it('rejects a submission after the frozen local date changes', async () => {
		await arrangeDraft('5');
		await expect(saveTodayOutcome(database, {
			...validInput('cross-midnight'), currentLocalDate: '2026-07-12',
		})).rejects.toThrow('TODAY_DRAFT_DATE_CHANGED');
		expect(await table('actionRecords').count()).toBe(0);
	});

	it('returns the original batch when the same submission is retried', async () => {
		await arrangeDraft();
		const input = validInput('submission-a');

		const first = await saveTodayOutcome(database, input);
		const retry = await saveTodayOutcome(database, input);

		expect(retry).toEqual(first);
		expect(await table('actionRecords').count()).toBe(1);
		expect(await table('outcomeBatches').count()).toBe(1);
		expect(first.items).toEqual([expect.objectContaining({ slotIndex: 0, userCardId: 'card-a', quantityBaseValue: 5000 })]);
	});

	it('overwrites the same-day record instead of accumulating it', async () => {
		await arrangeDraft('5');
		await saveTodayOutcome(database, validInput('submission-a'));
		await table('todayDrafts').update(LOCAL_DATE, { slots: makeDraft('7.5').slots });

		await saveTodayOutcome(database, validInput('submission-b', '2026-07-11T10:00:00.000Z'));

		expect(await table('actionRecords').toArray()).toEqual([
			expect.objectContaining({ id: 'card-a:2026-07-11', quantityBaseValue: 7500, firstSavedAt: '2026-07-11T09:00:00.000Z', lastSavedAt: '2026-07-11T10:00:00.000Z', lastSubmissionId: 'submission-b' }),
		]);
		expect(await table('outcomeBatches').count()).toBe(2);
	});

	it('completes active goals, records revisions, and freezes progress in the batch', async () => {
		await arrangeDraft('5');
		await table('longTermGoals').add({ id: 'long-a', userCardId: 'card-a', title: '累计 5 公里', targetQuantityBase: 5000, status: 'active', startDate: '2026-07-01', createdAt: '2026-07-01T00:00:00.000Z', updatedAt: '2026-07-01T00:00:00.000Z' });
		await table('stageGoals').add({ id: 'stage-a', longTermGoalId: 'long-a', title: '一天 5 公里', mode: 'both', targetQuantityBase: 5000, targetActiveDays: 1, status: 'active', startDate: '2026-07-01', createdAt: '2026-07-01T00:00:00.000Z', updatedAt: '2026-07-01T00:00:00.000Z' });

		const batch = await saveTodayOutcome(database, validInput('submission-goal'));

		expect(await table('longTermGoals').get('long-a')).toMatchObject({ status: 'completed', completionSnapshot: { quantityBaseValue: 5000, activeDays: 1 } });
		expect(await table('stageGoals').get('stage-a')).toMatchObject({ status: 'completed', completionSnapshot: { mode: 'both', quantityBaseValue: 5000, activeDays: 1 } });
		expect(await table('goalRevisions').count()).toBe(2);
		expect(batch.items[0]).toMatchObject({ longTermChange: { goalId: 'long-a', after: { completed: true } }, stageChange: { goalId: 'stage-a', after: { completed: true } } });
	});

	it('freezes before and after progress plus display units', async () => {
		await arrangeDraft('5');
		await table('longTermGoals').add({ id: 'long-a', userCardId: 'card-a', title: '累计 100 公里', targetQuantityBase: 100000, status: 'active', startDate: '2026-07-01', createdAt: '2026-07-01T00:00:00.000Z', updatedAt: '2026-07-01T00:00:00.000Z' });
		await table('stageGoals').add({ id: 'stage-a', longTermGoalId: 'long-a', title: '阶段 20 公里', mode: 'quantity', targetQuantityBase: 20000, status: 'active', startDate: '2026-07-01', createdAt: '2026-07-01T00:00:00.000Z', updatedAt: '2026-07-01T00:00:00.000Z' });
		await table('actionRecords').add(previousRecord(2000));

		const batch = await saveTodayOutcome(database, validInput('snapshot'));

		expect(batch.items[0]).toMatchObject({
			baseUnit: 'meter', displayUnit: 'km',
			longTermChange: { before: { quantityBaseValue: 2000 }, after: { quantityBaseValue: 7000 } },
			stageChange: { before: { quantityBaseValue: 2000 }, after: { quantityBaseValue: 7000 } },
		});
	});

	it('does not count records associated with an older goal', async () => {
		await arrangeDraft('1');
		await table('longTermGoals').add({ id: 'long-a', userCardId: 'card-a', title: '新目标 5 公里', targetQuantityBase: 5000, status: 'active', startDate: '2026-07-11', createdAt: '2026-07-11T00:00:00.000Z', updatedAt: '2026-07-11T00:00:00.000Z' });
		await table('actionRecords').add({ id: 'card-a:2026-07-10', userCardId: 'card-a', localDate: '2026-07-10', quantityBaseValue: 9000, longTermGoalId: 'old-long-term-goal', firstSavedAt: '2026-07-10T08:00:00.000Z', lastSavedAt: '2026-07-10T08:00:00.000Z', lastSubmissionId: 'old-submission' });

		const batch = await saveTodayOutcome(database, validInput('submission-new-goal'));

		expect(await table('longTermGoals').get('long-a')).toMatchObject({ status: 'active' });
		expect(batch.items[0]).toMatchObject({ longTermChange: { goalId: 'long-a', after: { quantityRatio: 0.2 } } });
	});

	it('rolls back records, goals, revisions, batch, and draft when the late batch write fails', async () => {
		await arrangeDraft('5');
		await table('longTermGoals').add({ id: 'long-a', userCardId: 'card-a', title: '累计 5 公里', targetQuantityBase: 5000, status: 'active', startDate: '2026-07-01', createdAt: '2026-07-01T00:00:00.000Z', updatedAt: '2026-07-01T00:00:00.000Z' });
		const creatingHook = () => { throw new Error('INJECTED_BATCH_FAILURE'); };
		table('outcomeBatches').hook('creating').subscribe(creatingHook);

		try {
			await expect(saveTodayOutcome(database, validInput('submission-fail'))).rejects.toThrow('INJECTED_BATCH_FAILURE');
		} finally {
			table('outcomeBatches').hook('creating').unsubscribe(creatingHook);
		}

		expect(await table('actionRecords').count()).toBe(0);
		expect(await table('goalRevisions').count()).toBe(0);
		expect(await table('outcomeBatches').count()).toBe(0);
		const rolledBackGoal = await table('longTermGoals').get('long-a');
		expect(rolledBackGoal).toMatchObject({ status: 'active' });
		expect(rolledBackGoal?.completionSnapshot).toBeUndefined();
		expect(await table('todayDrafts').get(LOCAL_DATE)).toEqual(makeDraft('5'));
	});
});
