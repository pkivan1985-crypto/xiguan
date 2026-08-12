import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter, Route, Routes } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';

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
		expect(html).not.toContain('aria-label="打开设置"');
	});

	it('does not add a settings self-link for a trailing-slash settings URL', () => {
		const html = renderShell('/settings/');

		expect(html).toContain('<header');
		expect(html).toContain('>设置<');
		expect(html).not.toContain('aria-label="打开设置"');
	});

	it('keeps navigation labels accessible while presenting an icon-only mobile bar', () => {
		const html = renderShell('/');
		const css = readFileSync(new URL('./AppShell.module.css', import.meta.url), 'utf8');

		expect(html.match(/class="[^"]*navLabel[^"]*"/g)).toHaveLength(3);
		expect(css).toMatch(/\.navLabel\s*\{[^}]*position:\s*absolute;[^}]*width:\s*1px;/s);
		expect(css).toMatch(/\.navItem\s*\{[^}]*min-height:\s*48px;/s);
	});
});
