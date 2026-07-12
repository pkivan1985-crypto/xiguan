import 'fake-indexeddb/auto';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { loadGoalDetails } from './loadGoalDetails';
import type { ActionRecord } from '@entities/action-record';
import { createRunningCard } from '@features/create-running-card';
import { RepeatOutcomeDatabase } from '@shared/lib/db';

let database: RepeatOutcomeDatabase;

beforeEach(() => { database = new RepeatOutcomeDatabase(`test-load-goal-details-${crypto.randomUUID()}`); });
afterEach(async () => { database.close(); await database.delete(); });

async function seedCard(): Promise<void> {
	await createRunningCard(database, {
		cardTitle: '晨跑', longTermTitle: '累计 100 km', longTermTargetDisplay: '100',
		stageTitle: '阶段 20 km', stageTargetDisplay: '20', startDate: '2026-07-01',
		nowIso: '2026-07-01T00:00:00.000Z', ids: { userCardId: 'card-a', longTermGoalId: 'long-a', stageGoalId: 'stage-a' },
	});
	const records: ActionRecord[] = [
		{ id: 'record-new', userCardId: 'card-a', localDate: '2026-07-12', quantityBaseValue: 7_500, longTermGoalId: 'long-a', stageGoalId: 'stage-a', firstSavedAt: '2026-07-12T08:42:00.000Z', lastSavedAt: '2026-07-12T08:42:00.000Z', lastSubmissionId: 'submission-new' },
		{ id: 'record-old', userCardId: 'card-a', localDate: '2026-07-10', quantityBaseValue: 5_000, longTermGoalId: 'long-a', stageGoalId: 'stage-a', firstSavedAt: '2026-07-10T08:00:00.000Z', lastSavedAt: '2026-07-10T08:00:00.000Z', lastSubmissionId: 'submission-old' },
	];
	await database.tableFor<ActionRecord>('actionRecords').bulkAdd(records);
}

describe('loadGoalDetails', () => {
	it('returns card metadata, both goal progresses, active days, and recent outcomes', async () => {
		await seedCard();
		const model = await loadGoalDetails(database, 'card-a');
		expect(model.card).toMatchObject({ id: 'card-a', title: '晨跑', displayUnit: 'km' });
		expect(model.longTermGoal).toMatchObject({ id: 'long-a', progress: { quantityBaseValue: 12_500, activeDays: 2, ratio: 0.125 } });
		expect(model.stageGoal).toMatchObject({ id: 'stage-a', mode: 'quantity', progress: { quantityBaseValue: 12_500, activeDays: 2, ratio: 0.625 } });
		expect(model.activeDays).toBe(2);
		expect(model.recentRecords.map(({ id }) => id)).toEqual(['record-new', 'record-old']);
	});

	it('preserves both-mode facts without averaging ratios', async () => {
		await seedCard();
		await database.table('stageGoals').update('stage-a', { mode: 'both', targetQuantityBase: 20_000, targetActiveDays: 4 });
		const stage = (await loadGoalDetails(database, 'card-a')).stageGoal;
		expect(stage).toMatchObject({ mode: 'both', progress: { quantityRatio: 0.625, activeDaysRatio: 0.5, ratio: 0.5 } });
	});

	it('returns completion snapshot evidence and keeps archived cards readable', async () => {
		await seedCard();
		await database.table('userCards').update('card-a', { status: 'archived' });
		await database.table('longTermGoals').update('long-a', { status: 'completed', completionSnapshot: { completedAt: '2026-07-12T09:00:00.000Z', mode: 'quantity', quantityBaseValue: 100_000, activeDays: 8, targetQuantityBase: 100_000 } });
		const model = await loadGoalDetails(database, 'card-a');
		expect(model.card.status).toBe('archived');
		expect(model.longTermGoal?.completionSnapshot).toMatchObject({ completedAt: '2026-07-12T09:00:00.000Z' });
	});

	it('throws for an unknown card', async () => {
		await expect(loadGoalDetails(database, 'missing')).rejects.toThrow('GOAL_DETAILS_NOT_FOUND');
	});
});
