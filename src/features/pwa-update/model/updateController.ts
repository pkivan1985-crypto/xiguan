/* eslint-disable i18next/no-literal-string -- Update states are internal discriminants. */
import type { CriticalOperationCoordinator, CriticalOperationKind, ReloadLease } from '@shared/lib/app-lifecycle';
import { shouldCheckForUpdate } from './updateCheckPolicy';
import type { UpdateState } from './types';
import { updateReducer } from './updateReducer';

export interface UpdateAdapter {
	check(): Promise<void>;
	apply(): Promise<void>;
}

export interface UpdateController {
	getState(): UpdateState;
	subscribe(listener: () => void): () => void;
	markAvailable(): void;
	markRegistrationFailed(): void;
	operationsChanged(operations: readonly CriticalOperationKind[]): void;
	checkForUpdate(manual?: boolean): Promise<void>;
	applyUpdate(): Promise<void>;
	dispose(): void;
}

export function createUpdateController(options: {
	adapter: UpdateAdapter;
	coordinator: CriticalOperationCoordinator;
	now: () => number;
	isOnline: () => boolean;
}): UpdateController {
	let state: UpdateState = { kind: 'idle' };
	let lastCheckedAt: number | undefined;
	const listeners = new Set<() => void>();

	const dispatch = (event: Parameters<typeof updateReducer>[1]) => {
		const next = updateReducer(state, event);
		if (next === state) return;
		state = next;
		listeners.forEach((listener) => listener());
	};

	const operationsChanged = (operations: readonly CriticalOperationKind[]) => {
		dispatch({ type: 'OPERATIONS_CHANGED', operations });
	};

	const unsubscribeCoordinator = options.coordinator.subscribe(() => {
		operationsChanged(options.coordinator.getSnapshot().activeOperations);
	});

	return {
		getState: () => state,
		subscribe: (listener) => {
			listeners.add(listener);
			return () => listeners.delete(listener);
		},
		markAvailable: () => {
			dispatch({ type: 'UPDATE_AVAILABLE' });
			operationsChanged(options.coordinator.getSnapshot().activeOperations);
		},
		markRegistrationFailed: () => dispatch({ type: 'FAIL', reason: 'register' }),
		operationsChanged,
		checkForUpdate: async (manual = false) => {
			const now = options.now();
			if (!shouldCheckForUpdate({ online: options.isOnline(), now, lastCheckedAt, manual })) return;
			lastCheckedAt = now;
			dispatch(state.kind === 'failed' ? { type: 'RETRY' } : { type: 'CHECK' });
			try {
				await options.adapter.check();
				dispatch({ type: 'NO_UPDATE' });
			} catch {
				dispatch({ type: 'FAIL', reason: 'check' });
			}
		},
		applyUpdate: async () => {
			if (state.kind !== 'available') return;
			const lease: ReloadLease | null = options.coordinator.tryAcquireReloadLease();
			if (!lease) {
				operationsChanged(options.coordinator.getSnapshot().activeOperations);
				return;
			}
			dispatch({ type: 'APPLY' });
			try {
				await options.adapter.apply();
			} catch {
				lease.release();
				dispatch({ type: 'FAIL', reason: 'apply' });
			}
		},
		dispose: () => {
			unsubscribeCoordinator();
			listeners.clear();
		},
	};
}
