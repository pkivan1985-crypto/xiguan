import { describe, expect, it, vi } from 'vitest';

vi.mock('@shared/ui', () => ({
	ShellSection: () => null,
	useDialogStore: () => null,
}));

const { routeConfig } = await import('./routeConfig');

describe('M1 route configuration', () => {
	it('publishes only the application shell routes', () => {
		const shellRoute = routeConfig.find((route) => route.path === '/');
		const childPaths = shellRoute?.children?.map((route) => route.path ?? 'index');

		expect(childPaths).toEqual(['index', 'today', 'deck', 'history', 'settings']);
	});

	it('keeps legacy DoHabit routes out of the production route table', () => {
		const childPaths = routeConfig
			.flatMap((route) => route.children ?? [])
			.map((route) => route.path);

		expect(childPaths).not.toContain('diary');
		expect(childPaths).not.toContain('habit-editor');
		expect(childPaths).not.toContain('menu/achievements');
	});

	it('publishes the full-screen running-card creation route outside the shell', () => {
		const createRoute = routeConfig.find((route) => route.path === '/deck/new');
		expect(createRoute?.element).toBeTruthy();
		expect(createRoute?.children).toBeUndefined();
	});

	it('has an unknown-route fallback', () => {
		expect(routeConfig.some((route) => route.path === '*')).toBe(true);
	});
});
