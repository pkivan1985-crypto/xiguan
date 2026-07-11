import { describe, expect, it } from 'vitest';

import { createInitialFormState, formReducer, validateCurrentStep } from './createRunningCardForm';

describe('create running card form', () => {
	it('moves through four steps and preserves values when going back', () => {
		let state = createInitialFormState('2026-07-11');
		state = formReducer(state, { type: 'update', field: 'cardTitle', value: '晨跑' });
		state = formReducer(state, { type: 'next' });
		state = formReducer(state, { type: 'back' });

		expect(state.step).toBe(0);
		expect(state.values.cardTitle).toBe('晨跑');
	});

	it('reports the first invalid field for each step', () => {
		const state = createInitialFormState('2026-07-11');
		expect(validateCurrentStep(state)).toBe('cardTitle');
		expect(validateCurrentStep({ ...state, step: 1, values: { ...state.values, cardTitle: '晨跑' } })).toBe('longTermTitle');
	});

	it('locks submission and preserves fields after a recoverable error', () => {
		let state = createInitialFormState('2026-07-11');
		state = formReducer(state, { type: 'update', field: 'cardTitle', value: '晨跑' });
		state = formReducer(state, { type: 'submit' });
		state = formReducer(state, { type: 'error', errorCode: 'SAVE_FAILED' });

		expect(state.status).toBe('error');
		expect(state.values.cardTitle).toBe('晨跑');
		expect(state.errorCode).toBe('SAVE_FAILED');
	});
});
