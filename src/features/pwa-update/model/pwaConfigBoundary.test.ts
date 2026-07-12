/// <reference types="node" />

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('PWA configuration boundary', () => {
	it('keeps prompted Workbox updates without automatic activation or runtime APIs', () => {
		const source = readFileSync(resolve('vite.config.ts'), 'utf8');
		expect(source).toContain("registerType: 'prompt'");
		expect(source).toContain('injectRegister: false');
		expect(source).toContain('cleanupOutdatedCaches: true');
		expect(source).toContain('clientsClaim: true');
		expect(source).not.toContain("registerType: 'autoUpdate'");
		expect(source).not.toContain('runtimeCaching:');
		expect(source).not.toContain('skipWaiting: true');
	});

	it('removes the obsolete public service-worker unregister script', () => {
		expect(existsSync(resolve('public/service-worker.js'))).toBe(false);
	});
});
