import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter, Route, Routes } from 'react-router';
import { describe, expect, it, vi } from 'vitest';

import { AppShell } from './AppShell';

vi.mock('react-i18next', () => ({
	useTranslation: () => ({
		t: (key: string) => ({
			'shell.nav.today': '今天',
			'shell.nav.progress': '进展',
			'shell.nav.habits': '习惯',
			'shell.nav.primary': '主导航',
			'shell.nav.settings': '设置',
			'shell.actions.openSettings': '打开设置',
		}[key] ?? key),
	}),
}));

function renderShell(pathname: string) {
	return renderToStaticMarkup(
		<MemoryRouter initialEntries={[pathname]}>
			<Routes>
				<Route path='/' element={<AppShell />}>
					<Route index element={<main>今天内容</main>} />
					<Route path='progress' element={<main>进展内容</main>} />
					<Route path='deck' element={<main>习惯内容</main>} />
					<Route path='settings' element={<main>设置内容</main>} />
				</Route>
			</Routes>
		</MemoryRouter>,
	);
}

describe('AppShell primary navigation', () => {
	it.each([
		['/', '今天内容'],
		['/progress', '进展内容'],
		['/deck', '习惯内容'],
	])('omits the legacy sticky header on %s without asserting the page header', (pathname, outletContent) => {
		const html = renderShell(pathname);

		expect(html).toContain(`>${outletContent}<`);
		expect(html).not.toContain('<header');
		expect(html).toContain('aria-label="主导航"');
		expect(html).toContain('>今天<');
		expect(html).toContain('>进展<');
		expect(html).toContain('>习惯<');
		expect(html.match(/aria-current="page"/g)).toHaveLength(1);
	});

	it('keeps the legacy shell header for settings', () => {
		const html = renderShell('/settings');

		expect(html).toContain('<header');
		expect(html).toContain('>设置<');
	});
});
