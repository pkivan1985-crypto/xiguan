import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const readSource = (relativePath: string) => readFileSync(new URL(relativePath, import.meta.url), 'utf8');

describe('release identity boundary', () => {
	it.each([
		['app header', '../../widgets/app-header/ui/AppHeader.tsx'],
		['welcome screen', '../../widgets/welcome-view/ui/WelcomeView.tsx'],
		['modal fallback', '../ui/modal-layout/ui/ModalLayout.tsx'],
	])('does not expose DoHabit as the product name in %s', (_name, relativePath) => {
		expect(readSource(relativePath)).not.toMatch(/[>'"]DoHabit[<'"]/);
	});

	it('does not route project feedback to upstream DoHabit Issues', () => {
		const menuSource = readSource('../../pages/menu/model/useListItems.tsx');
		expect(menuSource).not.toContain('github.com/iNikAnn/DoHabit/issues');
	});
});
