export type ReleaseLink =
	| { status: 'available'; url: string }
	| { status: 'unavailable' };

export const UPSTREAM_SOURCE_URL = 'https://github.com/iNikAnn/DoHabit';

export const PROJECT_SOURCE = { status: 'available', url: 'https://github.com/pkivan1985-crypto/xiguan' } as const satisfies ReleaseLink;
export const PROJECT_ISSUES = { status: 'available', url: 'https://github.com/pkivan1985-crypto/xiguan/issues' } as const satisfies ReleaseLink;
export const PROJECT_LICENSE = { status: 'available', url: 'https://github.com/pkivan1985-crypto/xiguan/blob/main/LICENSE' } as const satisfies ReleaseLink;
