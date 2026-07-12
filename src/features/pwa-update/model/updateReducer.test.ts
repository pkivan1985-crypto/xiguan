import { describe, expect, it } from 'vitest';
import { updateReducer } from './updateReducer';

describe('updateReducer', () => {
	it('moves through check, no-update, available, and apply states', () => {
		expect(updateReducer({ kind: 'idle' }, { type: 'CHECK' })).toEqual({ kind: 'checking' });
		expect(updateReducer({ kind: 'checking' }, { type: 'NO_UPDATE' })).toEqual({ kind: 'idle' });
		expect(updateReducer({ kind: 'idle' }, { type: 'UPDATE_AVAILABLE' })).toEqual({ kind: 'available' });
		expect(updateReducer({ kind: 'available' }, { type: 'APPLY' })).toEqual({ kind: 'applying' });
	});

	it('blocks an available update on the first active operation and returns to available', () => {
		const blocked = updateReducer({ kind: 'available' }, {
			type: 'OPERATIONS_CHANGED',
			operations: ['restore-backup', 'save-outcome'],
		});
		expect(blocked).toEqual({ kind: 'blocked', operation: 'restore-backup' });
		expect(updateReducer(blocked, { type: 'OPERATIONS_CHANGED', operations: [] }))
			.toEqual({ kind: 'available' });
	});

	it('keeps duplicate and invalid events stable', () => {
		const applying = { kind: 'applying' } as const;
		expect(updateReducer(applying, { type: 'CHECK' })).toBe(applying);
		const idle = { kind: 'idle' } as const;
		expect(updateReducer(idle, { type: 'APPLY' })).toBe(idle);
	});

	it('records stable failure reasons and supports retry', () => {
		const failed = updateReducer({ kind: 'checking' }, { type: 'FAIL', reason: 'check' });
		expect(failed).toEqual({ kind: 'failed', reason: 'check' });
		expect(updateReducer(failed, { type: 'RETRY' })).toEqual({ kind: 'checking' });
	});
});
