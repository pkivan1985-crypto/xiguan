import { describe, expect, it } from 'vitest';
import * as config from './index';

describe('release source links', () => {
	it('keeps upstream attribution fixed and exposes the verified project repository after Gate A', () => {
		expect(Reflect.get(config, 'UPSTREAM_SOURCE_URL')).toBe('https://github.com/iNikAnn/DoHabit');
		expect(Reflect.get(config, 'PROJECT_SOURCE')).toEqual({ status: 'available', url: 'https://github.com/pkivan1985-crypto/xiguan' });
		expect(Reflect.get(config, 'PROJECT_ISSUES')).toEqual({ status: 'available', url: 'https://github.com/pkivan1985-crypto/xiguan/issues' });
		expect(Reflect.get(config, 'PROJECT_LICENSE')).toEqual({ status: 'available', url: 'https://github.com/pkivan1985-crypto/xiguan/blob/main/LICENSE' });
	});
});
