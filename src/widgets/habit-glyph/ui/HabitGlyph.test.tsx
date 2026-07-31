import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { HabitGlyph } from './HabitGlyph';

vi.mock('react-icons/pi', () => ({
	PiBookOpenText: () => <svg data-phosphor-icon='PiBookOpenText' />,
	PiDrop: () => <svg data-phosphor-icon='PiDrop' />,
	PiLeaf: () => <svg data-phosphor-icon='PiLeaf' />,
	PiMoonStars: () => <svg data-phosphor-icon='PiMoonStars' />,
	PiPersonSimpleRun: () => <svg data-phosphor-icon='PiPersonSimpleRun' />,
	PiShieldCheck: () => <svg data-phosphor-icon='PiShieldCheck' />,
}));

describe('HabitGlyph', () => {
	it.each([
		['activity', 'green', '跑步', 'PiPersonSimpleRun'],
		['droplet', 'cyan', '喝水', 'PiDrop'],
		['book', 'amber', '阅读', 'PiBookOpenText'],
		['leaf', 'green', '轻食', 'PiLeaf'],
		['moon', 'violet', '早睡', 'PiMoonStars'],
		['shield', 'blue', '远离手机', 'PiShieldCheck'],
	] as const)('renders the %s glyph as an accessible %s icon container', (iconKey, accent, label, phosphorIcon) => {
		const html = renderToStaticMarkup(<HabitGlyph iconKey={iconKey} accent={accent} label={label} />);

		expect(html).toContain(`role="img"`);
		expect(html).toContain(`aria-label="${label}"`);
		expect(html).toContain(`data-accent="${accent}"`);
		expect(html).toContain(`data-phosphor-icon="${phosphorIcon}"`);
		expect(html).not.toMatch(/🏃|💧|📚|🌙|🛡️/u);
	});

	it('renders as decorative when adjacent text already names the habit', () => {
		const html = renderToStaticMarkup(
			<HabitGlyph
				iconKey='activity'
				accent='green'
				label='跑步'
				decorative
			/>,
		);

		expect(html).toContain('aria-hidden="true"');
		expect(html).not.toContain('role="img"');
		expect(html).not.toContain('aria-label="跑步"');
	});
});
