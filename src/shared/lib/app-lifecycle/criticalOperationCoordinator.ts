/* eslint-disable i18next/no-literal-string -- Operation and error identifiers are internal constants. */
export type CriticalOperationKind =
	| 'create-card'
	| 'save-outcome'
	| 'correct-record'
	| 'restore-backup'
	| 'clear-data';

export interface AppLifecycleSnapshot {
	activeOperations: readonly CriticalOperationKind[];
	reloadLeaseActive: boolean;
	canReload: boolean;
}

export interface ReloadLease {
	release(): void;
}

const INITIAL_SNAPSHOT: AppLifecycleSnapshot = Object.freeze({
	activeOperations: Object.freeze([]),
	reloadLeaseActive: false,
	canReload: true,
});

export class CriticalOperationCoordinator {
	private readonly operations = new Map<symbol, CriticalOperationKind>();
	private readonly listeners = new Set<() => void>();
	private reloadLease: symbol | null = null;
	private snapshot = INITIAL_SNAPSHOT;

	getSnapshot = (): AppLifecycleSnapshot => this.snapshot;

	subscribe = (listener: () => void): (() => void) => {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	};

	async runCriticalOperation<T>(kind: CriticalOperationKind, operation: () => Promise<T>): Promise<T> {
		if (this.reloadLease) throw new Error('APP_UPDATE_IN_PROGRESS');
		const token = Symbol(kind);
		this.operations.set(token, kind);
		this.publish();
		try {
			return await operation();
		} finally {
			this.operations.delete(token);
			this.publish();
		}
	}

	tryAcquireReloadLease(): ReloadLease | null {
		if (this.reloadLease || this.operations.size) return null;
		const token = Symbol('reload');
		this.reloadLease = token;
		this.publish();
		return {
			release: () => {
				if (this.reloadLease !== token) return;
				this.reloadLease = null;
				this.publish();
			},
		};
	}

	private publish(): void {
		const activeOperations = Object.freeze([...this.operations.values()]);
		this.snapshot = Object.freeze({
			activeOperations,
			reloadLeaseActive: Boolean(this.reloadLease),
			canReload: !this.reloadLease && activeOperations.length === 0,
		});
		this.listeners.forEach((listener) => listener());
	}
}

export const appLifecycleCoordinator = new CriticalOperationCoordinator();
