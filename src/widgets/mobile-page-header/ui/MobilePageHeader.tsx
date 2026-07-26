import type { ReactNode } from 'react';

import styles from './MobilePageHeader.module.css';

export interface MobilePageHeaderProps {
	title: string;
	description?: string;
	settingsAction?: ReactNode;
	primaryAction?: ReactNode;
}

function MobilePageHeader({ title, description, settingsAction, primaryAction }: MobilePageHeaderProps) {
	return (
		<header className={styles.header}>
			<div className={styles.copy}>
				<h1>{title}</h1>
				{description && <p>{description}</p>}
			</div>
			{(settingsAction || primaryAction) && (
				<div className={styles.actions}>
					{settingsAction}
					{primaryAction}
				</div>
			)}
		</header>
	);
}

export { MobilePageHeader };
