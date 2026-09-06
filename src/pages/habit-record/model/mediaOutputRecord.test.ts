import { describe, expect, it } from 'vitest';

import {
	buildMediaOutputEntry,
	mergeMediaOutputEntry,
	publishedMediaOutputCount,
} from './mediaOutputRecord';

describe('media output record', () => {
	it('keeps drafts but only counts published work as progress', () => {
		const draft = buildMediaOutputEntry({
			type: 'article', title: '一周复盘', platform: '公众号', status: 'draft',
			link: '', views: '', likes: '', comments: '', reflection: '',
		}, { id: 'draft-1', nowIso: '2026-09-06T08:00:00.000Z' });
		expect(draft).not.toBeNull();
		const aggregate = mergeMediaOutputEntry(undefined, draft!);
		expect(aggregate.quantityBaseValue).toBe(1);
		expect(publishedMediaOutputCount(aggregate.details)).toBe(0);

		const published = { ...draft!, status: 'published' as const };
		expect(publishedMediaOutputCount(mergeMediaOutputEntry(aggregate.details, published).details)).toBe(1);
	});
});
