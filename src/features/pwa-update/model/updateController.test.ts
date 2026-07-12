import { describe, expect, it, vi } from 'vitest';
import { CriticalOperationCoordinator } from '@shared/lib/app-lifecycle';
import { createUpdateController, type UpdateAdapter } from './updateController';

function setup(input?: { online?: boolean; adapter?: Partial<UpdateAdapter> }) {
	const coordinator = new CriticalOperationCoordinator();
	const adapter: UpdateAdapter = {
		check: vi.fn(async () => undefined),
		apply: vi.fn(async () => undefined),
		...input?.adapter,
	};
	const controller = createUpdateController({
		adapter,
		coordinator,
		now: () => 50_000,
		isOnline: () => input?.online ?? true,
	});
	return { adapter, controller, coordinator };
}

describe('update controller', () => {
	it('does not check while offline', async () => {
		const { adapter, controller } = setup({ online: false });
		await controller.checkForUpdate(true);
		expect(adapter.check).not.toHaveBeenCalled();
		expect(controller.getState()).toEqual({ kind: 'idle' });
	});

	it('checks once and returns to idle when no update appears', async () => {
		const { adapter, controller } = setup();
		await controller.checkForUpdate(true);
		expect(adapter.check).toHaveBeenCalledOnce();
		expect(controller.getState()).toEqual({ kind: 'idle' });
	});

	it('blocks an available update while a critical operation is active', async () => {
		const { adapter, controller, coordinator } = setup();
		let release!: () => void;
		const pending = coordinator.runCriticalOperation('restore-backup', () => new Promise<void>((done) => { release = done; }));
		controller.markAvailable();
		expect(controller.getState()).toEqual({ kind: 'blocked', operation: 'restore-backup' });
		await controller.applyUpdate();
		expect(adapter.apply).not.toHaveBeenCalled();
		release();
		await pending;
		expect(controller.getState()).toEqual({ kind: 'available' });
	});

	it('acquires a reload lease and applies once when safe', async () => {
		const { adapter, controller, coordinator } = setup();
		controller.markAvailable();
		await controller.applyUpdate();
		expect(adapter.apply).toHaveBeenCalledOnce();
		expect(controller.getState()).toEqual({ kind: 'applying' });
		expect(coordinator.getSnapshot().reloadLeaseActive).toBe(true);
	});

	it('releases the lease and records apply failure', async () => {
		const { controller, coordinator } = setup({
			adapter: { apply: vi.fn(async () => { throw new Error('APPLY_FAILED'); }) },
		});
		controller.markAvailable();
		await controller.applyUpdate();
		expect(controller.getState()).toEqual({ kind: 'failed', reason: 'apply' });
		expect(coordinator.getSnapshot().canReload).toBe(true);
	});

	it('records registration and check failures', async () => {
		const { controller } = setup({
			adapter: { check: vi.fn(async () => { throw new Error('CHECK_FAILED'); }) },
		});
		await controller.checkForUpdate(true);
		expect(controller.getState()).toEqual({ kind: 'failed', reason: 'check' });
		controller.markRegistrationFailed();
		expect(controller.getState()).toEqual({ kind: 'failed', reason: 'register' });
	});
});
