import styles from './DeckPage.module.css';
import { useTranslation } from 'react-i18next';
import { FiBookOpen, FiEdit3, FiHeart } from 'react-icons/fi';
import { ShellSection } from '@shared/ui';

function DeckPage() {
	const { t } = useTranslation();
	const categories = [
		{ label: t('shell.deck.categoryMovement'), icon: FiHeart },
		{ label: t('shell.deck.categoryReading'), icon: FiBookOpen },
		{ label: t('shell.deck.categoryOutput'), icon: FiEdit3 },
	];

	return (
		<div className={styles.page}>
			<ShellSection
				title={t('shell.deck.todayTitle')}
				description={t('shell.deck.todayDescription')}
			>
				<div className={styles.miniSlots} aria-hidden='true'>
					{Array.from({ length: 6 }, (_, index) => <span key={index} />)}
				</div>
			</ShellSection>

			<ShellSection
				title={t('shell.deck.categoriesTitle')}
				description={t('shell.deck.categoriesDescription')}
			>
				<div className={styles.categories}>
					{categories.map(({ label, icon: Icon }) => (
						<div className={styles.category} key={label}>
							<Icon aria-hidden='true' />
							<span>{label}</span>
							<small>{t('shell.common.comingSoon')}</small>
						</div>
					))}
				</div>
			</ShellSection>
		</div>
	);
}

export { DeckPage };
