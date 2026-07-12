/* eslint-disable i18next/no-literal-string -- Domain error codes map to translation keys. */
export function homeErrorKey(error: unknown): 'shell.home.relationshipError' | 'shell.home.loadError' {
	return error instanceof Error && error.message === 'HOME_RELATIONSHIP_INVALID'
		? 'shell.home.relationshipError'
		: 'shell.home.loadError';
}
