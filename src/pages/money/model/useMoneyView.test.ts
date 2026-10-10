import { beforeEach, expect, it, vi } from 'vitest';
import type { MoneyView } from '@entities/money';
import { useMoneyView } from './useMoneyView';

// Deterministic hook harness: no DOM dependency, but preserves state slots,
// effect dependencies and cleanup so route-only transitions are exercised.
const harness = vi.hoisted(() => ({
	key: 'list-before', cursor: 0, states: [] as unknown[], deps: undefined as unknown[] | undefined,
	cleanup: undefined as (() => void) | undefined, load: vi.fn(),
}));
vi.mock('react-router', () => ({ useLocation: () => ({ key: harness.key }) }));
vi.mock('@features/money', () => ({ loadMoneyInApp: harness.load }));
vi.mock('react', () => ({
	useState: (initial: unknown) => {
		const slot = harness.cursor++;
		if (!(slot in harness.states)) harness.states[slot] = initial;
		return [harness.states[slot], (next: unknown) => { harness.states[slot] = typeof next === 'function' ? next(harness.states[slot]) : next; }];
	},
	useEffect: (effect: () => () => void, deps: unknown[]) => {
		if (harness.deps && deps.every((value, index) => Object.is(value, harness.deps![index]))) return;
		harness.cleanup?.(); harness.deps = deps; harness.cleanup = effect();
	},
}));
const empty = (): MoneyView => ({ accounts: [], templates: [], bills: [], payments: [], entries: [], completedMonths: [] });
// eslint-disable-next-line react-hooks/rules-of-hooks -- React hooks are replaced by the deterministic state/effect harness above.
function render() { harness.cursor = 0; return useMoneyView('2026-10'); }
beforeEach(() => {
	harness.cleanup?.(); harness.cleanup = undefined; harness.deps = undefined;
	harness.states = []; harness.key = 'list-before'; harness.load.mockReset();
});
it('reloads after saving within the same month and pathname query transition', async () => {
	const before = empty(); const after = empty(); after.completedMonths = ['2026-10'];
	harness.load.mockResolvedValueOnce(before).mockResolvedValueOnce(after);
	expect(render().view).toBeNull(); await Promise.resolve();
	expect(render().view).toBe(before);
	// Typing/rerendering without navigation must not reload/remount the form.
	expect(harness.load).toHaveBeenCalledTimes(1);
	harness.key = 'list-after-save';
	expect(render().view).toBeNull(); await Promise.resolve();
	expect(render().view).toBe(after);
	expect(harness.load).toHaveBeenCalledTimes(2);
});
it('discards a previous route request that resolves after the new route', async () => {
	let oldResolve!: (value: MoneyView) => void;
	const fresh = empty(); fresh.completedMonths = ['2026-10'];
	harness.load.mockReturnValueOnce(new Promise<MoneyView>((resolve) => { oldResolve = resolve; })).mockResolvedValueOnce(fresh);
	render(); harness.key = 'new-route'; render(); await Promise.resolve();
	expect(render().view).toBe(fresh);
	oldResolve(empty()); await Promise.resolve();
	expect(render().view).toBe(fresh);
});
