import { describe, expect, it } from 'vitest';
import * as config from './index';

describe('release source links', () => {
	it('keeps upstream attribution fixed and project-owned links explicitly unavailable before Gate A', () => {
		expect(Reflect.get(config, 'UPSTREAM_SOURCE_URL')).toBe('https://github.com/iNikAnn/DoHabit');
		expect(Reflect.get(config, 'PROJECT_SOURCE')).toEqual({ status: 'unavailable' });
		expect(Reflect.get(config, 'PROJECT_ISSUES')).toEqual({ status: 'unavailable' });
		expect(Reflect.get(config, 'PROJECT_LICENSE')).toEqual({ status: 'unavailable' });
	});
});
