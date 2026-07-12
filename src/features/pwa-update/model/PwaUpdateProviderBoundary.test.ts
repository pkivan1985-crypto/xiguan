/// <reference types="node" />

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('PWA update provider boundary', () => {
	it('owns the virtual service-worker hook and forwards every lifecycle callback', () => {
		const source = readFileSync(resolve('src/features/pwa-update/model/PwaUpdateProvider.tsx'), 'utf8');
		expect(source).toContain("from 'virtual:pwa-register/react'");
		expect(source).toContain('useRegisterSW({');
		expect(source).toContain('onRegisteredSW');
		expect(source).toContain('onRegisterError');
		expect(source).toContain('markAvailable');
		expect(source).toContain('markRegistrationFailed');
		expect(source).toContain('updateServiceWorker(true)');
	});
});
