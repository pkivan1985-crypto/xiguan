import { describe, expect, it } from 'vitest';
import {
	APP_DESCRIPTION,
	APP_NAME,
	APP_ROUTES,
	APP_SHORT_NAME,
	PRIMARY_NAV_ROUTES,
} from './app';
import pkg from '../../../package.json';

describe('M1 application contract', () => {
	it('uses the approved Chinese product identity', () => {
		expect(APP_NAME).toBe('重复成果显化');
		expect(APP_SHORT_NAME).toBe('成果显化');
		expect(APP_DESCRIPTION).toContain('真实完成');
		expect(pkg.name).toBe('repeat-outcome');
		expect(pkg.description).not.toContain('DoHabit');
	});

	it('exposes five routes with four primary navigation destinations', () => {
		expect(APP_ROUTES).toEqual({
			HOME: '/',
			TODAY: '/today',
			DECK: '/deck',
			DECK_NEW: '/deck/new',
			HISTORY: '/history',
			SETTINGS: '/settings',
		});
		expect(PRIMARY_NAV_ROUTES).toEqual(['/', '/today', '/deck', '/history']);
	});
});
