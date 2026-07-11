/* eslint-disable i18next/no-literal-string -- Reducer actions, statuses, and field names are implementation identifiers. */
export interface CreateRunningCardFormValues {
	cardTitle: string;
	longTermTitle: string;
	longTermTargetDisplay: string;
	stageTitle: string;
	stageTargetDisplay: string;
	startDate: string;
	endDate: string;
}

export type FormField = keyof CreateRunningCardFormValues;
export type FormStatus = 'editing' | 'submitting' | 'error';

export interface CreateRunningCardFormState {
	step: number;
	values: CreateRunningCardFormValues;
	status: FormStatus;
	errorCode?: string;
}

export type FormAction =
	| { type: 'update'; field: FormField; value: string }
	| { type: 'next' }
	| { type: 'back' }
	| { type: 'submit' }
	| { type: 'error'; errorCode: string };

export function createInitialFormState(today: string): CreateRunningCardFormState {
	return {
		step: 0,
		status: 'editing',
		values: {
			cardTitle: '',
			longTermTitle: '',
			longTermTargetDisplay: '100',
			stageTitle: '',
			stageTargetDisplay: '20',
			startDate: today,
			endDate: '',
		},
	};
}

export function validateCurrentStep(state: CreateRunningCardFormState): FormField | null {
	const { values, step } = state;
	if (step === 0) return values.cardTitle.trim() ? null : 'cardTitle';
	if (step === 1) {
		if (!values.longTermTitle.trim()) return 'longTermTitle';
		if (!(Number(values.longTermTargetDisplay) > 0)) return 'longTermTargetDisplay';
		if (!values.startDate || (values.endDate && values.endDate < values.startDate)) return 'endDate';
	}
	if (step === 2) {
		if (!values.stageTitle.trim()) return 'stageTitle';
		const stage = Number(values.stageTargetDisplay);
		if (!(stage > 0) || stage > Number(values.longTermTargetDisplay)) return 'stageTargetDisplay';
	}
	return null;
}

export function formReducer(state: CreateRunningCardFormState, action: FormAction): CreateRunningCardFormState {
	if (action.type === 'update') return { ...state, status: 'editing', errorCode: undefined, values: { ...state.values, [action.field]: action.value } };
	if (action.type === 'next') return { ...state, step: Math.min(3, state.step + 1), errorCode: undefined };
	if (action.type === 'back') return { ...state, step: Math.max(0, state.step - 1), status: 'editing', errorCode: undefined };
	if (action.type === 'submit') return { ...state, status: 'submitting', errorCode: undefined };
	return { ...state, status: 'error', errorCode: action.errorCode };
}
