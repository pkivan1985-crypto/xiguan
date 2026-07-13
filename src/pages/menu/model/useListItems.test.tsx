import { describe, expect, it, vi } from 'vitest';

vi.mock('react-i18next', () => ({
	useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('@shared/lib/router', () => ({
	getNavigationTarget: () => ({ onClick: () => undefined }),
}));

const { default: useListItems } = await import('./useListItems');

describe('menu support links after Gate A', () => {
	it('offers project feedback separately from upstream attribution', () => {
		const open = vi.fn();
		vi.stubGlobal('window', { open });
		const { supportItems } = useListItems();

		expect(supportItems).toHaveLength(2);
		expect(supportItems[0]?.title).toBe('menu.shared.feedback.title');
		supportItems[0]?.onClick?.({} as never);
		expect(open).toHaveBeenCalledWith('https://github.com/pkivan1985-crypto/xiguan/issues', '_blank');
		expect(supportItems[1]?.title).toBe('menu.shared.upstream.title');
		supportItems[1]?.onClick?.({} as never);
		expect(open).toHaveBeenCalledWith('https://github.com/iNikAnn/DoHabit', '_blank');
	});
});
