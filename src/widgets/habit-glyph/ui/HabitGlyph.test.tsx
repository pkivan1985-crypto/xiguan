import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { HabitGlyph } from './HabitGlyph';

describe('HabitGlyph', () => {
	it.each([
		['activity', 'green', '跑步'],
		['droplet', 'cyan', '喝水'],
		['book', 'amber', '阅读'],
		['moon', 'violet', '早睡'],
		['shield', 'blue', '远离手机'],
	] as const)('renders the %s glyph as an accessible %s icon container', (iconKey, accent, label) => {
		const html = renderToStaticMarkup(<HabitGlyph iconKey={iconKey} accent={accent} label={label} />);

		expect(html).toContain(`role="img"`);
		expect(html).toContain(`aria-label="${label}"`);
		expect(html).toContain(`data-accent="${accent}"`);
		expect(html).toContain('<svg');
		expect(html).not.toMatch(/[🏃💧📚🌙🛡️]/u);
	});
});
