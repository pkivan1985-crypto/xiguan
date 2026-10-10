import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { MoneyUnsavedNotice } from './MoneyLayout';
import { moneyNavigationNeedsConfirmation } from '../model/moneyNavigation';
it('offers explicit keep/discard choices without a blocking native confirmation dialog', () => {
	const keep = vi.fn(); const discard = vi.fn();
	const prompt = MoneyUnsavedNotice({ onKeep: keep, onDiscard: discard });
	const html = renderToStaticMarkup(prompt);
	expect(html).toContain('role="alertdialog"');
	expect(html).toContain('继续填写'); expect(html).toContain('放弃并离开');
	const buttons = prompt.props.children[2].props.children;
	buttons[0].props.onClick(); expect(keep).toHaveBeenCalledOnce(); expect(discard).not.toHaveBeenCalled();
	buttons[1].props.onClick(); expect(discard).toHaveBeenCalledOnce();
});
it('only warns for different destinations with unsaved changes', () => {
	expect(moneyNavigationNeedsConfirmation(true, '/money/records?new=1', '/money/records?new=1')).toBe(false);
	expect(moneyNavigationNeedsConfirmation(true, '/money/records?new=1', '/money')).toBe(true);
	expect(moneyNavigationNeedsConfirmation(false, '/money/records?new=1', '/money')).toBe(false);
});
