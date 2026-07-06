import styles from './ModalHeader.module.css';
import clsx from 'clsx';
import { FaArrowLeft } from 'react-icons/fa6';
import { Button } from '@shared/ui';

interface ModalHeaderProps {
	title: string;
	onClose: () => void;
}

function ModalHeader({ title, onClose }: ModalHeaderProps) {
	return (
		<div className={clsx('header-wrapper', styles.wrapper)}>
			<header className={styles.header}>
				<div className={clsx('bg-surface-bordered', styles.buttonWrapper)}>
					<Button
						className={styles.closeButton}
						onClick={onClose}
					>
						<FaArrowLeft />
					</Button>
				</div>

				<h1 className={clsx('bg-surface-bordered', styles.title)}>
					<span className={styles.titleText}>
						{title}
					</span>
				</h1>
			</header>
		</div>
	);
}

export default ModalHeader;