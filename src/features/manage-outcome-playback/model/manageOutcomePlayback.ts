/* eslint-disable i18next/no-literal-string -- Table modes and domain errors are identifiers. */
import type { OutcomeBatch } from '@entities/outcome-batch';
import { appDatabase, type RepeatOutcomeDatabase } from '@shared/lib/db';

async function withBatch(
	database: RepeatOutcomeDatabase,
	batchId: string,
	change: (batch: OutcomeBatch) => OutcomeBatch | null,
): Promise<OutcomeBatch> {
	const batches = database.tableFor<OutcomeBatch>('outcomeBatches');
	return database.transaction('rw', batches, async () => {
		const batch = await batches.get(batchId);
		if (!batch) throw new Error('OUTCOME_BATCH_NOT_FOUND');
		if (!batch.items.length) throw new Error('OUTCOME_BATCH_EMPTY');
		const updated = change(batch);
		if (!updated) return batch;
		await batches.put(updated);
		return updated;
	});
}

function safeIndex(batch: OutcomeBatch): number {
	return Math.min(Math.max(batch.playbackIndex ?? 0, 0), batch.items.length - 1);
}

export function beginOutcomePlayback(
	database: RepeatOutcomeDatabase,
	batchId: string,
	nowIso: string,
): Promise<OutcomeBatch> {
	return withBatch(database, batchId, (batch) => {
		if (batch.status !== 'ready') return null;
		return { ...batch, status: 'playing', playbackIndex: safeIndex(batch), playbackUpdatedAt: nowIso };
	});
}

export function advanceOutcomePlayback(
	database: RepeatOutcomeDatabase,
	batchId: string,
	nowIso: string,
): Promise<OutcomeBatch> {
	return withBatch(database, batchId, (batch) => {
		if (batch.status === 'completed') return null;
		const currentIndex = safeIndex(batch);
		if (currentIndex >= batch.items.length - 1) {
			return { ...batch, status: 'completed', playbackIndex: currentIndex, playbackUpdatedAt: nowIso, completedAt: nowIso };
		}
		return { ...batch, status: 'playing', playbackIndex: currentIndex + 1, playbackUpdatedAt: nowIso };
	});
}

export function completeOutcomePlayback(
	database: RepeatOutcomeDatabase,
	batchId: string,
	nowIso: string,
): Promise<OutcomeBatch> {
	return withBatch(database, batchId, (batch) => {
		if (batch.status === 'completed') return null;
		return { ...batch, status: 'completed', playbackIndex: safeIndex(batch), playbackUpdatedAt: nowIso, completedAt: nowIso };
	});
}

export function beginOutcomePlaybackInApp(batchId: string, nowIso: string): Promise<OutcomeBatch> {
	return beginOutcomePlayback(appDatabase, batchId, nowIso);
}

export function advanceOutcomePlaybackInApp(batchId: string, nowIso: string): Promise<OutcomeBatch> {
	return advanceOutcomePlayback(appDatabase, batchId, nowIso);
}

export function completeOutcomePlaybackInApp(batchId: string, nowIso: string): Promise<OutcomeBatch> {
	return completeOutcomePlayback(appDatabase, batchId, nowIso);
}
