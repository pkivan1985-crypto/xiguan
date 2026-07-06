import styles from './CardHeader.module.css';
import type { CSSProperties, ReactNode } from 'react';

interface CardHeaderProps {
	title: string;
	description?: string;
	extra?: ReactNode;
	badgeIcon?: ReactNode;
	badgeColors?: { bg: string; color: string; size?: string };
}

function CardHeader(props: CardHeaderProps) {
	const {
		title,
		description,
		extra,
		badgeIcon,
		badgeColors
	} = props;

	return (
		<div className={styles.header}>
			<div className={styles.textGroup}>
				<h3 className={styles.title}>{title}</h3>

				{description && (
					<div className={styles.description}>
						<small>{description}</small>
					</div>
				)}
			</div>

			{(extra || badgeIcon) && (
				<div className={styles.actions}>
					{badgeIcon && (
						<div
							style={{
								'--badge-bg': badgeColors?.bg,
								'--badge-color': badgeColors?.color,
								'--badge-size': badgeColors?.size,
							} as CSSProperties}
							className={styles.badge}
						>
							{badgeIcon}
						</div>
					)}

					{extra}
				</div>
			)}
		</div>
	);
}

export default CardHeader;