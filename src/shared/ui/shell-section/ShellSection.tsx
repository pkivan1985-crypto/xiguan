import styles from './ShellSection.module.css';
import type { ReactNode } from 'react';

interface ShellSectionProps {
	title: string;
	description?: string;
	children?: ReactNode;
	className?: string;
}

function ShellSection({ title, description, children, className = '' }: ShellSectionProps) {
	return (
		<section className={`${styles.section} ${className}`}>
			<div>
				<h2>{title}</h2>
				{description && <p>{description}</p>}
			</div>
			{children}
		</section>
	);
}

export { ShellSection };
