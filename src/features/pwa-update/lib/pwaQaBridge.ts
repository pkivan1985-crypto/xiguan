import type { CriticalOperationCoordinator, CriticalOperationKind } from '@shared/lib/app-lifecycle';

export const PWA_QA_BRIDGE_KEY = '__repeatOutcomePwaQa';

interface PwaQaBridge {
	hold(kind: CriticalOperationKind): void;
	release(): void;
}

export function installPwaQaBridge(
	target: Record<string, unknown>,
	buildId: string,
	appVersion: string,
	coordinator: CriticalOperationCoordinator,
): () => void {
	if (buildId === appVersion) return () => undefined;
	let releaseHeld: (() => void) | undefined;
	const release = () => {
		releaseHeld?.();
		releaseHeld = undefined;
	};
	const bridge: PwaQaBridge = {
		hold: (kind) => {
			release();
			void coordinator.runCriticalOperation(kind, () => new Promise<void>((resolve) => {
				releaseHeld = resolve;
			})).catch(() => undefined);
		},
		release,
	};
	target[PWA_QA_BRIDGE_KEY] = bridge;
	return () => {
		release();
		if (target[PWA_QA_BRIDGE_KEY] === bridge) delete target[PWA_QA_BRIDGE_KEY];
	};
}
