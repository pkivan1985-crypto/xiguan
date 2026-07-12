/* eslint-disable i18next/no-literal-string -- Domain error codes map to translation keys. */
export function historyErrorKey(error: unknown): 'shell.history.dateChanged' | 'shell.history.invalidValue' | 'shell.history.saveError' {
	if (!(error instanceof Error)) return 'shell.history.saveError';
	if (error.message === 'ACTION_RECORD_NOT_TODAY') return 'shell.history.dateChanged';
	if (error.message === 'INVALID_QUANTITY' || error.message === 'QUANTITY_CONFIRMATION_REQUIRED') return 'shell.history.invalidValue';
	return 'shell.history.saveError';
}
