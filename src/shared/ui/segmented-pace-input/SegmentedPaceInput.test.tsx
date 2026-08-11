import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import {
	paceValueFromSegments,
	parsePaceSegments,
	SegmentedPaceInput,
} from './SegmentedPaceInput';

describe('SegmentedPaceInput', () => {
	it('splits canonical pace values into minute and second groups', () => {
		expect(parsePaceSegments('06:30')).toEqual({ minutes: '06', seconds: '30' });
		expect(parsePaceSegments('6:')).toEqual({ minutes: '6', seconds: '' });
		expect(parsePaceSegments('')).toEqual({ minutes: '', seconds: '' });
	});

	it('removes punctuation and letters while keeping at most two digits per group', () => {
		expect(paceValueFromSegments('a067', '3b05')).toBe('06:30');
		expect(paceValueFromSegments('', '9')).toBe(':9');
	});

	it('renders two numeric groups with fixed punctuation and unit', () => {
		const html = renderToStaticMarkup(
			<SegmentedPaceInput
				label='平均配速'
				value='06:30'
				onChange={vi.fn()}
			/>,
		);

		expect(html).toContain('role="group"');
		expect(html).toContain('aria-label="平均配速"');
		expect(html.match(/inputMode="numeric"/g)).toHaveLength(2);
		expect(html).toContain('value="06"');
		expect(html).toContain('value="30"');
		expect(html).toContain('>:</span>');
		expect(html).toContain('>/km</small>');
	});
});
