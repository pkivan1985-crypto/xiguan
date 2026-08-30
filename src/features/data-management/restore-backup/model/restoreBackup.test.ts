import 'fake-indexeddb/auto';

import { afterEach, describe, expect, it, vi } from 'vitest';

import type { ActionRecord } from '@entities/action-record';
import type { CardTemplate } from '@entities/card-template';
import type { LongTermGoal, StageGoal } from '@entities/goal';
import type { UserCard } from '@entities/user-card';
import { RepeatOutcomeDatabase, type SettingRecord } from '@shared/lib/db';
import { buildBackup } from '@features/data-management/export-backup';
import { inspectBackupText } from '@features/data-management/inspect-backup';
import { restoreBackup } from './restoreBackup';

const running: CardTemplate = { id: 'running', categoryId: 'sport', title: '跑步', sortOrder: 0, enabled: true, version: 1, defaultStageMode: 'quantity', quantity: { baseUnit: 'm', displayUnit: 'km', basePerDisplayUnit: 1000, maxDecimalPlaces: 2, confirmationThresholdDisplay: 100 } };
const extraExpense: CardTemplate = { id: 'extra-expense', categoryId: 'life-management', title: '额外开支', sortOrder: 0, enabled: true, version: 1, defaultStageMode: 'quantity', trackingType: 'quantity', quantity: { baseUnit: 'cent', displayUnit: '元', basePerDisplayUnit: 100, maxDecimalPlaces: 2, confirmationThresholdDisplay: 100_000 } };

async function snapshot(database: RepeatOutcomeDatabase) {
	return {
		cards: await database.tableFor<UserCard>('userCards').toArray(),
		long: await database.tableFor<LongTermGoal>('longTermGoals').toArray(),
		stage: await database.tableFor<StageGoal>('stageGoals').toArray(),
		settings: await database.tableFor<SettingRecord>('settings').toArray(),
	};
}

describe('atomic backup restore', () => {
	const databases: RepeatOutcomeDatabase[] = [];
	afterEach(async () => {
		vi.restoreAllMocks();
		await Promise.all(databases.splice(0).map((database) => database.delete()));
	});

	async function database(name: string) {
		const db = new RepeatOutcomeDatabase(`${name}-${crypto.randomUUID()}`);
		databases.push(db);
		await db.tableFor<CardTemplate>('cardTemplates').put(running);
		return db;
	}

	async function validatedSource() {
		const source = await database('source');
		await source.tableFor<UserCard>('userCards').put({ id: 'source-card', officialCardId: 'running', title: '来源晨跑', status: 'active', sortOrder: 0, createdAt: '2026-07-12T01:00:00.000Z', updatedAt: '2026-07-12T01:00:00.000Z' });
		await source.tableFor<LongTermGoal>('longTermGoals').put({ id: 'source-long', userCardId: 'source-card', title: '100公里', targetQuantityBase: 100_000, status: 'active', startDate: '2026-07-01', createdAt: '2026-07-12T01:00:00.000Z', updatedAt: '2026-07-12T01:00:00.000Z' });
		await source.tableFor<StageGoal>('stageGoals').put({ id: 'source-stage', longTermGoalId: 'source-long', title: '20公里', mode: 'quantity', targetQuantityBase: 20_000, status: 'active', startDate: '2026-07-01', createdAt: '2026-07-12T01:00:00.000Z', updatedAt: '2026-07-12T01:00:00.000Z' });
		await source.tableFor<SettingRecord>('settings').put({ key: 'repeat-outcome-ui-settings', value: '{"source":true}', updatedAt: '2026-07-12T01:00:00.000Z' });
		const file = await buildBackup(source, { nowIso: '2026-07-12T02:00:00.000Z', appVersion: '0.50.0' });
		const result = await inspectBackupText(file.contents, [{ id: 'running', version: 1 }]);
		if (result.kind !== 'ready') throw new Error('EXPECTED_READY_BACKUP');
		return result.backup;
	}

	async function targetWithOldData() {
		const target = await database('target');
		await target.tableFor<UserCard>('userCards').put({ id: 'old-card', officialCardId: 'running', title: '旧数据', status: 'active', sortOrder: 0, createdAt: '2026-07-11T01:00:00.000Z', updatedAt: '2026-07-11T01:00:00.000Z' });
		await target.tableFor<SettingRecord>('settings').put({ key: 'repeat-outcome-ui-settings', value: '{"old":true}', updatedAt: '2026-07-11T01:00:00.000Z' });
		return target;
	}

	it('fully replaces user data and preserves official definitions', async () => {
		const backup = await validatedSource();
		const target = await targetWithOldData();
		await restoreBackup(target, backup);
		expect(await snapshot(target)).toMatchObject({ cards: [{ id: 'source-card' }], long: [{ id: 'source-long' }], stage: [{ id: 'source-stage' }], settings: [{ value: '{"source":true}' }] });
		expect(await target.tableFor<CardTemplate>('cardTemplates').toArray()).toEqual([running]);
	});

	it('keeps the transaction alive while Web Crypto verifies the readback', async () => {
		const backup = await validatedSource();
		const target = await targetWithOldData();
		const digest = crypto.subtle.digest.bind(crypto.subtle);
		vi.spyOn(crypto.subtle, 'digest').mockImplementation(async (...args) => {
			await new Promise((resolve) => setTimeout(resolve, 10));
			return digest(...args);
		});

		await expect(restoreBackup(target, backup)).resolves.toBeUndefined();
		expect(await snapshot(target)).toMatchObject({ cards: [{ id: 'source-card' }] });
	});

	it('restores aggregated extra-expense entries without losing reflection details', async () => {
		const source = await database('expense-source');
		await source.tableFor<CardTemplate>('cardTemplates').put(extraExpense);
		await source.tableFor<UserCard>('userCards').put({
			id: 'expense-card', officialCardId: 'extra-expense', title: '额外开支', status: 'active', sortOrder: 0,
			createdAt: '2026-08-30T00:00:00.000Z', updatedAt: '2026-08-30T00:00:00.000Z',
		});
		const expenseRecord: ActionRecord = {
			id: 'expense-card:2026-08-30', userCardId: 'expense-card', localDate: '2026-08-30',
			quantityBaseValue: 5_200, firstSavedAt: '2026-08-30T01:00:00.000Z',
			lastSavedAt: '2026-08-30T02:00:00.000Z', lastSubmissionId: 'expense-save',
			details: {
				kind: 'extra-expense',
				entries: [
					{ id: 'a', amountCents: 4_000, item: '临时雨伞', reason: '突然下雨', necessity: 'necessary', occurredTime: '09:00', createdAt: '2026-08-30T01:00:00.000Z', updatedAt: '2026-08-30T01:00:00.000Z' },
					{ id: 'b', amountCents: 1_200, item: '临时停车', reason: '办事需要', necessity: 'delayable', occurredTime: '10:00', createdAt: '2026-08-30T02:00:00.000Z', updatedAt: '2026-08-30T02:00:00.000Z' },
				],
			},
		};
		await source.tableFor<ActionRecord>('actionRecords').put(expenseRecord);
		const file = await buildBackup(source, { nowIso: '2026-08-30T03:00:00.000Z', appVersion: '3.0.0-rc.14' });
		const inspection = await inspectBackupText(file.contents, [{ id: 'extra-expense', version: 1 }]);
		if (inspection.kind !== 'ready') throw new Error('EXPECTED_READY_BACKUP');

		const target = await database('expense-target');
		await target.tableFor<CardTemplate>('cardTemplates').put(extraExpense);
		await restoreBackup(target, inspection.backup);

		expect(await target.tableFor<ActionRecord>('actionRecords').get(expenseRecord.id)).toEqual(expenseRecord);
	});

	it('rolls back when a write fails after old data was cleared', async () => {
		const backup = await validatedSource();
		const target = await targetWithOldData();
		const before = await snapshot(target);
		vi.spyOn(target.tableFor<StageGoal>('stageGoals'), 'bulkPut').mockRejectedValueOnce(new Error('WRITE_FAILED'));
		await expect(restoreBackup(target, backup)).rejects.toThrow('WRITE_FAILED');
		expect(await snapshot(target)).toEqual(before);
	});

	it('rolls back when readback verification disagrees', async () => {
		const backup = await validatedSource();
		const target = await targetWithOldData();
		const before = await snapshot(target);
		const table = target.tableFor<UserCard>('userCards');
		vi.spyOn(table, 'toArray').mockResolvedValueOnce([]);
		await expect(restoreBackup(target, backup)).rejects.toThrow('RESTORE_READBACK_MISMATCH');
		expect(await snapshot(target)).toEqual(before);
	});
});
