import { describe, expect, it } from 'vitest';

import { effectiveActionRecords, groupActionRecordsByLocalDate, outcomeDatesForMonth } from './deriveActionRecordFacts';
import type { ActionRecord } from '../model/types';

function record(id: string, localDate: string, lastSavedAt: string, deletedAt?: string): ActionRecord {
	return {
		id,
		userCardId: 'card-1',
		localDate,
		quantityBaseValue: 1000,
		firstSavedAt: lastSavedAt,
		lastSavedAt,
		lastSubmissionId: `submission-${id}`,
		deletedAt,
	};
}

describe('ActionRecord facts', () => {
	it('filters deleted records and groups newest date and save time first', () => {
		const records = [
			record('older', '2026-07-10', '2026-07-10T08:00:00.000Z'),
			record('newer-a', '2026-07-12', '2026-07-12T07:00:00.000Z'),
			record('newer-b', '2026-07-12', '2026-07-12T09:00:00.000Z'),
			record('deleted', '2026-07-12', '2026-07-12T10:00:00.000Z', '2026-07-12T10:01:00.000Z'),
		];

		expect(effectiveActionRecords(records).map(({ id }) => id)).not.toContain('deleted');
		expect(groupActionRecordsByLocalDate(records).map(({ localDate, records: group }) => [
			localDate,
			group.map(({ id }) => id),
		])).toEqual([
			['2026-07-12', ['newer-b', 'newer-a']],
			['2026-07-10', ['older']],
		]);
	});

	it('deduplicates same-day records and respects month boundaries', () => {
		const dates = outcomeDatesForMonth([
			record('a', '2026-07-02', '2026-07-02T08:00:00.000Z'),
			record('b', '2026-07-02', '2026-07-02T09:00:00.000Z'),
			record('c', '2026-06-30', '2026-06-30T09:00:00.000Z'),
		], 2026, 6);

		expect([...dates]).toEqual(['2026-07-02']);
	});
});
