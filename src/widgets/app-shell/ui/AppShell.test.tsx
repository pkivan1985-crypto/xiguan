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

function PageHeader({ label }: { label: string }) {
	return <main><header data-page-header={label}><h1>{label}</h1></header></main>;
}

function renderShell(pathname: string, pageHeader: string) {
	return renderToStaticMarkup(
		<MemoryRouter initialEntries={[pathname]}>
			<Routes>
				<Route path='/' element={<AppShell />}>
					<Route index element={<PageHeader label={pageHeader} />} />
					<Route path='progress' element={<PageHeader label={pageHeader} />} />
					<Route path='deck' element={<PageHeader label={pageHeader} />} />
					<Route path='settings' element={<PageHeader label={pageHeader} />} />
				</Route>
			</Routes>
		</MemoryRouter>,
	);
}

describe('AppShell primary navigation', () => {
	it.each([
		['/', '今天'],
		['/progress', '进展'],
		['/deck', '习惯'],
	])('leaves the %s page-owned header as the only header', (pathname, pageHeader) => {
		const html = renderShell(pathname, pageHeader);

		expect(html).toContain(`data-page-header="${pageHeader}"`);
		expect(html.match(/<header/g)).toHaveLength(1);
		expect(html).toContain('aria-label="主导航"');
		expect(html).toContain('>今天<');
		expect(html).toContain('>进展<');
		expect(html).toContain('>习惯<');
		expect(html.match(/aria-current="page"/g)).toHaveLength(1);
	});

	it('keeps the legacy shell header for settings', () => {
		const html = renderShell('/settings', '设置内容');

		expect(html.match(/<header/g)).toHaveLength(2);
		expect(html).toContain('>设置<');
	});
});
