import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('BookkeepingRecordPage compact presentation', () => {
	it('uses the app accent and keeps the daily ledger dense on mobile', () => {
		const css = readFileSync(new URL('./BookkeepingRecordPage.module.css', import.meta.url), 'utf8');

		expect(css).toMatch(/\.page\s*\{[^}]*gap:\s*10px;/s);
		expect(css).toMatch(/\.header\s*\{[^}]*min-height:\s*58px;/s);
		expect(css).toMatch(/\.entryPage\s*\{[^}]*grid-template-rows:\s*auto auto;[^}]*align-content:\s*start;/s);
		expect(css).toMatch(/\.header > button\s*\{[^}]*appearance:\s*none;[^}]*background:\s*transparent;/s);
		expect(css).toMatch(/\.summary\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\) minmax\(0, 1fr\) auto;/s);
		expect(css).toMatch(/\.list > button\s*\{[^}]*min-height:\s*60px;[^}]*background:\s*transparent;/s);
		expect(css).toMatch(/\.ledgerActions button:first-child, \.save\s*\{[^}]*background:\s*var\(--accent-color\);/s);
	});
});
