import { describe, expect, it } from 'vitest';
import { CriticalOperationCoordinator } from '@shared/lib/app-lifecycle';
import { installPwaQaBridge, PWA_QA_BRIDGE_KEY } from './pwaQaBridge';

describe('PWA QA bridge', () => {
	it('does not expose a bridge in a normal production build', () => {
		const target: Record<string, unknown> = {};
		const uninstall = installPwaQaBridge(target, '0.50.0', '0.50.0', new CriticalOperationCoordinator());
		expect(target[PWA_QA_BRIDGE_KEY]).toBeUndefined();
		uninstall();
	});

	it('holds and releases a critical operation only for QA builds', async () => {
		const target: Record<string, unknown> = {};
		const coordinator = new CriticalOperationCoordinator();
		const uninstall = installPwaQaBridge(target, 'm7-a', '0.50.0', coordinator);
		const bridge = target[PWA_QA_BRIDGE_KEY] as { hold(kind: 'save-outcome'): void; release(): void };
		bridge.hold('save-outcome');
		expect(coordinator.getSnapshot().activeOperations).toEqual(['save-outcome']);
		bridge.release();
		await Promise.resolve();
		expect(coordinator.getSnapshot().canReload).toBe(true);

		bridge.hold('save-outcome');
		uninstall();
		await Promise.resolve();
		expect(target[PWA_QA_BRIDGE_KEY]).toBeUndefined();
		expect(coordinator.getSnapshot().canReload).toBe(true);
	});
});
