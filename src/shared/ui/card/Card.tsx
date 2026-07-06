import styles from './Card.module.css';
import { type CSSProperties, type ReactNode } from 'react';
import CardHeader from './CardHeader';
import clsx from 'clsx';

interface CardProps {
	title?: string;
	description?: string;
	extra?: ReactNode;
	badgeIcon?: ReactNode;
	badgeColors?: { bg: string; color: string; size?: string };
	children: React.ReactNode;
	style?: CSSProperties;
	className?: string;
	childrenClassName?: string;
	onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
}

function Card(props: CardProps) {
	const {
		title,
		description,
		extra,
		badgeIcon,
		badgeColors,
		children,
		style,
		className,
		childrenClassName,
		onClick
	} = props;

	return (
		<div
			style={style}
			className={clsx(styles.card, className)}
			onClick={onClick}
		>
			{title && (
				<CardHeader
					title={title}
					description={description}
					extra={extra}
					badgeIcon={badgeIcon}
					badgeColors={badgeColors}
				/>
			)}

			{children && (
				<div className={clsx(styles.body, childrenClassName)}>
					{children}
				</div>
			)}
		</div>
	);
}

export { Card };