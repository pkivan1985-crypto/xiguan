import { describe, expect, it, vi } from 'vitest';
import { CriticalOperationCoordinator } from './criticalOperationCoordinator';

function deferred() {
	let resolve!: () => void;
	const promise = new Promise<void>((done) => { resolve = done; });
	return { promise, resolve };
}

describe('CriticalOperationCoordinator', () => {
	it('publishes active operations and releases them after success', async () => {
		const coordinator = new CriticalOperationCoordinator();
		const gate = deferred();
		const listener = vi.fn();
		coordinator.subscribe(listener);

		const pending = coordinator.runCriticalOperation('save-outcome', () => gate.promise);
		expect(coordinator.getSnapshot()).toEqual({
			activeOperations: ['save-outcome'],
			reloadLeaseActive: false,
			canReload: false,
		});
		gate.resolve();
		await pending;

		expect(coordinator.getSnapshot().canReload).toBe(true);
		expect(listener).toHaveBeenCalledTimes(2);
	});

	it('tracks overlapping operations even when their kinds match', async () => {
		const coordinator = new CriticalOperationCoordinator();
		const first = deferred();
		const second = deferred();
		const firstPending = coordinator.runCriticalOperation('restore-backup', () => first.promise);
		const secondPending = coordinator.runCriticalOperation('restore-backup', () => second.promise);

		expect(coordinator.getSnapshot().activeOperations).toEqual(['restore-backup', 'restore-backup']);
		first.resolve();
		await firstPending;
		expect(coordinator.getSnapshot().activeOperations).toEqual(['restore-backup']);
		second.resolve();
		await secondPending;
	});

	it('releases a failed operation in finally', async () => {
		const coordinator = new CriticalOperationCoordinator();
		await expect(coordinator.runCriticalOperation('clear-data', async () => {
			throw new Error('CLEAR_FAILED');
		})).rejects.toThrow('CLEAR_FAILED');
		expect(coordinator.getSnapshot().canReload).toBe(true);
	});

	it('rejects a reload lease while a critical write is active', async () => {
		const coordinator = new CriticalOperationCoordinator();
		const gate = deferred();
		const pending = coordinator.runCriticalOperation('correct-record', () => gate.promise);
		expect(coordinator.tryAcquireReloadLease()).toBeNull();
		gate.resolve();
		await pending;
		expect(coordinator.tryAcquireReloadLease()).not.toBeNull();
	});

	it('blocks new operations while a lease is active and releases idempotently', async () => {
		const coordinator = new CriticalOperationCoordinator();
		const lease = coordinator.tryAcquireReloadLease();
		expect(lease).not.toBeNull();
		expect(coordinator.getSnapshot().reloadLeaseActive).toBe(true);
		await expect(coordinator.runCriticalOperation('create-card', async () => undefined))
			.rejects.toThrow('APP_UPDATE_IN_PROGRESS');

		lease?.release();
		lease?.release();
		expect(coordinator.getSnapshot()).toEqual({
			activeOperations: [],
			reloadLeaseActive: false,
			canReload: true,
		});
	});
});
