/* eslint-disable i18next/no-literal-string -- Update states are internal discriminants. */
import type { UpdateEvent, UpdateState } from './types';

export function updateReducer(state: UpdateState, event: UpdateEvent): UpdateState {
	if (event.type === 'FAIL') return { kind: 'failed', reason: event.reason };
	if (event.type === 'UPDATE_AVAILABLE') return { kind: 'available' };
	if (event.type === 'OPERATIONS_CHANGED') {
		if (state.kind !== 'available' && state.kind !== 'blocked') return state;
		const [operation] = event.operations;
		return operation ? { kind: 'blocked', operation } : { kind: 'available' };
	}
	if (event.type === 'CHECK') {
		return state.kind === 'applying' ? state : { kind: 'checking' };
	}
	if (event.type === 'NO_UPDATE') {
		return state.kind === 'checking' ? { kind: 'idle' } : state;
	}
	if (event.type === 'APPLY') {
		return state.kind === 'available' ? { kind: 'applying' } : state;
	}
	if (event.type === 'RETRY') {
		return state.kind === 'failed' ? { kind: 'checking' } : state;
	}
	return state;
}
