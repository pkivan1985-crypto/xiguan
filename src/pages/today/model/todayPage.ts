/* eslint-disable i18next/no-literal-string -- Returned values are translation keys and domain error identifiers. */
export type TodayErrorKey = 'shell.today.submitError' | 'shell.today.dateChanged' | 'shell.today.invalidValue' | 'shell.today.duplicateCard';

export function todayErrorKey(error: unknown): TodayErrorKey {
	if (!(error instanceof Error)) return 'shell.today.submitError';
	if (error.message === 'TODAY_DRAFT_DATE_CHANGED') return 'shell.today.dateChanged';
	if (error.message === 'INVALID_QUANTITY') return 'shell.today.invalidValue';
	if (error.message === 'TODAY_DRAFT_CARD_DUPLICATED') return 'shell.today.duplicateCard';
	return 'shell.today.submitError';
}
