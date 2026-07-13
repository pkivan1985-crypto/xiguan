import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('react-i18next', () => ({
	useTranslation: () => ({ t: (key: string, values?: { version?: string; build?: string }) => values?.version ? `${key}:${values.version}${values.build ? `:${values.build}` : ''}` : key }),
}));
vi.mock('react-router', () => ({ Link: ({ children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a {...props}>{children}</a> }));
vi.mock('@entities/settings', () => ({
	useSettingsStore: (selector: (state: unknown) => unknown) => selector({
		settings: { isAnimationsEnabled: true },
		settingsDispatch: () => undefined,
	}),
}));
vi.mock('@features/pwa-install', () => ({ usePwaInstall: () => ({ state: 'CAN_PROMPT', install: async () => undefined }) }));
vi.mock('@features/pwa-update', () => ({
	usePwaUpdate: () => ({
		state: { kind: 'available' }, online: true, offlineReady: true, currentVersion: '3.0.0-rc.1', buildId: 'm8-local',
		checkForUpdate: async () => undefined, applyUpdate: async () => undefined,
	}),
}));
vi.mock('@shared/ui', () => ({
	ShellSection: ({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) => (
		<section><h2>{title}</h2><p>{description}</p>{children}</section>
	),
}));

const { SettingsPage } = await import('./SettingsPage');

describe('SettingsPage PWA controls', () => {
	it('combines version, installation, offline readiness, and available update actions', () => {
		const html = renderToStaticMarkup(<SettingsPage />);
		expect(html).toContain('shell.settings.appTitle');
		expect(html).toContain('shell.settings.buildVersion:3.0.0-rc.1:m8-local');
		expect(html).toContain('shell.settings.offlineReady');
		expect(html).toContain('shell.pwa.updateNow');
		expect(html).toContain('shell.settings.installAction');
	});

	it('links the verified project source separately from upstream attribution', () => {
		const html = renderToStaticMarkup(<SettingsPage />);
		expect(html).toContain('shell.settings.projectSourceCode');
		expect(html).toContain('href="https://github.com/pkivan1985-crypto/xiguan"');
		expect(html).not.toContain('shell.settings.projectSourcePending');
		expect(html).toContain('shell.settings.upstreamSourceCode');
		expect(html).toContain('shell.settings.license');
		expect(html).toContain('href="https://github.com/iNikAnn/DoHabit"');
	});
});
