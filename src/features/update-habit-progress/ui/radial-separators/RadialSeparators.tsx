import type { CSSProperties } from 'react';

interface SeparatorProps {
	count: number;
	style: CSSProperties;
}

function Separator({ turns, style }: { turns: number, style: CSSProperties }) {
	return (
		<div
			style={{
				position: 'absolute',
				height: '100%',
				transform: `rotate(${turns}turn)`
			}}
		>
			<div style={style} />
		</div>
	);
}

function RadialSeparators({ count, style }: SeparatorProps) {
	const turns = 1 / count;

	return Array.from({ length: count }, (_, i) => (
		<Separator
			key={`${count}-${i}`}
			turns={i * turns}
			style={style}
		/>
	));
}

export default RadialSeparators;