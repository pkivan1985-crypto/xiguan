import type { CriticalOperationKind } from '@shared/lib/app-lifecycle';

export type UpdateFailureReason = 'register' | 'check' | 'apply';

export type UpdateState =
	| { kind: 'idle' }
	| { kind: 'checking' }
	| { kind: 'available' }
	| { kind: 'blocked'; operation: CriticalOperationKind }
	| { kind: 'applying' }
	| { kind: 'failed'; reason: UpdateFailureReason };

export type UpdateEvent =
	| { type: 'CHECK' }
	| { type: 'NO_UPDATE' }
	| { type: 'UPDATE_AVAILABLE' }
	| { type: 'OPERATIONS_CHANGED'; operations: readonly CriticalOperationKind[] }
	| { type: 'APPLY' }
	| { type: 'FAIL'; reason: UpdateFailureReason }
	| { type: 'RETRY' };
