export type ReleaseLink =
	| { status: 'available'; url: string }
	| { status: 'unavailable' };

export const UPSTREAM_SOURCE_URL = 'https://github.com/iNikAnn/DoHabit';

export const PROJECT_SOURCE = { status: 'unavailable' } as const satisfies ReleaseLink;
export const PROJECT_ISSUES = { status: 'unavailable' } as const satisfies ReleaseLink;
export const PROJECT_LICENSE = { status: 'unavailable' } as const satisfies ReleaseLink;
