import 'fake-indexeddb/auto';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { loadHomeDashboard } from './loadHomeDashboard';
import { createRunningCard } from '@features/create-running-card';
import { RepeatOutcomeDatabase } from '@shared/lib/db';

let database: RepeatOutcomeDatabase;

async function createCard(id: string, title: string, sortOrder = 0): Promise<void> {
	await createRunningCard(database, {
		cardTitle: title,
		longTermTitle: `${title}长期`,
		longTermTargetDisplay: '100',
		stageTitle: `${title}阶段`,
		stageTargetDisplay: '20',
		startDate: '2026-07-01',
		nowIso: '2026-07-01T00:00:00.000Z',
		ids: { userCardId: id, longTermGoalId: `long-${id}`, stageGoalId: `stage-${id}` },
	});
	await database.table('userCards').update(id, { sortOrder });
}

beforeEach(() => {
	database = new RepeatOutcomeDatabase(`test-load-home-dashboard-${crypto.randomUUID()}`);
});

afterEach(async () => {
	database.close();
	await database.delete();
});

describe('loadHomeDashboard', () => {
	it('returns no fake goals and an empty month for a fresh database', async () => {
		await expect(loadHomeDashboard(database, { year: 2026, monthIndex: 6 })).resolves.toEqual({
			hasCards: false,
			goalSummaries: [],
			outcomeDates: [],
			outcomeDayCount: 0,
			year: 2026,
			monthIndex: 6,
		});
	});

	it('returns active cards in sort order with zero progress when records are absent', async () => {
		await createCard('card-b', '夜跑', 2);
		await createCard('card-a', '晨跑', 1);

		const model = await loadHomeDashboard(database, { year: 2026, monthIndex: 6 });

		expect(model.goalSummaries.map(({ cardTitle }) => cardTitle)).toEqual(['晨跑', '夜跑']);
		expect(model.goalSummaries[0]).toMatchObject({
			displayUnit: 'km',
			longTermGoal: { progress: { quantityBaseValue: 0, ratio: 0 } },
			stageGoal: { mode: 'quantity', progress: { quantityBaseValue: 0, ratio: 0 } },
		});
	});

	it('returns exact goal-scoped progress and deduplicated outcome dates', async () => {
		await createCard('card-a', '晨跑');
		await database.table('actionRecords').bulkAdd([
			{
				id: 'record-a', userCardId: 'card-a', localDate: '2026-07-02', quantityBaseValue: 5_000,
				longTermGoalId: 'long-card-a', stageGoalId: 'stage-card-a', firstSavedAt: '2026-07-02T08:00:00.000Z',
				lastSavedAt: '2026-07-02T08:00:00.000Z', lastSubmissionId: 'submission-a',
			},
			{
				id: 'record-other', userCardId: 'card-other', localDate: '2026-07-02', quantityBaseValue: 1_000,
				firstSavedAt: '2026-07-02T09:00:00.000Z', lastSavedAt: '2026-07-02T09:00:00.000Z', lastSubmissionId: 'submission-other',
			},
		]);

		const model = await loadHomeDashboard(database, { year: 2026, monthIndex: 6 });

		expect(model.outcomeDates).toEqual(['2026-07-02']);
		expect(model.outcomeDayCount).toBe(1);
		expect(model.goalSummaries[0]).toMatchObject({
			longTermGoal: { id: 'long-card-a', progress: { quantityBaseValue: 5_000, ratio: 0.05 } },
			stageGoal: { id: 'stage-card-a', progress: { quantityBaseValue: 5_000, ratio: 0.25 } },
		});
	});

	it('keeps a completed goal visible when it is the current goal', async () => {
		await createCard('card-a', '晨跑');
		await database.table('longTermGoals').update('long-card-a', { status: 'completed' });
		await database.table('stageGoals').update('stage-card-a', { status: 'completed' });

		const model = await loadHomeDashboard(database, { year: 2026, monthIndex: 6 });

		expect(model.goalSummaries[0]).toMatchObject({
			longTermGoal: { status: 'completed' },
			stageGoal: { status: 'completed' },
		});
	});

	it('excludes archived cards from current summaries but keeps their outcome day', async () => {
		await createCard('card-a', '晨跑');
		await database.table('userCards').update('card-a', { status: 'archived' });
		await database.table('actionRecords').add({
			id: 'record-a', userCardId: 'card-a', localDate: '2026-07-02', quantityBaseValue: 5_000,
			longTermGoalId: 'long-card-a', stageGoalId: 'stage-card-a', firstSavedAt: '2026-07-02T08:00:00.000Z',
			lastSavedAt: '2026-07-02T08:00:00.000Z', lastSubmissionId: 'submission-a',
		});

		const model = await loadHomeDashboard(database, { year: 2026, monthIndex: 6 });

		expect(model).toMatchObject({ hasCards: false, goalSummaries: [], outcomeDates: ['2026-07-02'] });
	});

	it('throws for an active card without its template instead of inventing metadata', async () => {
		await database.table('userCards').add({
			id: 'card-a', officialCardId: 'missing-template', title: '未知卡', status: 'active', sortOrder: 0,
			createdAt: '2026-07-01T00:00:00.000Z', updatedAt: '2026-07-01T00:00:00.000Z',
		});

		await expect(loadHomeDashboard(database, { year: 2026, monthIndex: 6 })).rejects.toThrow('HOME_RELATIONSHIP_INVALID');
	});
});
