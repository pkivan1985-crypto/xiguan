import type { IconType } from 'react-icons';
import {
	PiBookOpenText,
	PiDrop,
	PiMoonStars,
	PiPersonSimpleRun,
	PiShieldCheck,
} from 'react-icons/pi';

import type { CardTemplate } from '@entities/card-template';

import styles from './HabitGlyph.module.css';

type HabitIconKey = NonNullable<CardTemplate['iconKey']>;
type HabitAccent = NonNullable<CardTemplate['accent']>;

const glyphs: Record<HabitIconKey, IconType> = {
	activity: PiPersonSimpleRun,
	droplet: PiDrop,
	book: PiBookOpenText,
	moon: PiMoonStars,
	shield: PiShieldCheck,
};

export interface HabitGlyphProps {
	iconKey: HabitIconKey;
	accent: HabitAccent;
	label: string;
	decorative?: boolean;
	size?: 'sm' | 'md' | 'lg';
}

function HabitGlyph({
	iconKey,
	accent,
	label,
	decorative = false,
	size = 'md',
}: HabitGlyphProps) {
	const Icon = glyphs[iconKey];

	return (
		<span
			className={styles.glyph}
			data-accent={accent}
			data-size={size}
			role={decorative ? undefined : 'img'}
			aria-label={decorative ? undefined : label}
			aria-hidden={decorative || undefined}
		>
			<Icon aria-hidden='true' />
		</span>
	);
}

export { HabitGlyph };
