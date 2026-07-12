import { describe, expect, it, vi } from 'vitest';

vi.mock('react-i18next', () => ({
	useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('@shared/lib/router', () => ({
	getNavigationTarget: () => ({ onClick: () => undefined }),
}));

const { default: useListItems } = await import('./useListItems');

describe('menu support links before Gate A', () => {
	it('offers upstream attribution without pretending upstream Issues is project feedback', () => {
		const open = vi.fn();
		vi.stubGlobal('window', { open });
		const { supportItems } = useListItems();

		expect(supportItems).toHaveLength(1);
		expect(supportItems[0]?.title).toBe('menu.shared.upstream.title');
		supportItems[0]?.onClick?.({} as never);
		expect(open).toHaveBeenCalledWith('https://github.com/iNikAnn/DoHabit', '_blank');
	});
});
