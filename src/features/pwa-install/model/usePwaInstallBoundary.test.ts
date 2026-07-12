/// <reference types="node" />

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('PWA install hook boundary', () => {
	it('reacts to installed and display-mode changes and clears consumed prompts', () => {
		const source = readFileSync(resolve('src/features/pwa-install/model/usePwaInstall.ts'), 'utf8');
		expect(source).toContain("addEventListener('appinstalled'");
		expect(source).toContain("removeEventListener('appinstalled'");
		expect(source).toContain("addEventListener('change'");
		expect(source).toContain("removeEventListener('change'");
		expect(source).toContain('setDeferredPrompt(null)');
	});
});
