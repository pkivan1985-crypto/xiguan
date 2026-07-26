import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FiLayers, FiPlus, FiRefreshCw } from 'react-icons/fi';
import { useNavigate } from 'react-router';

import { loadCardDeckForDate, type DeckView } from '@features/load-card-deck';
import { APP_ROUTES } from '@shared/config';
import { formatLocalDate } from '@shared/lib/date';
import { CardDeck } from '@widgets/card-deck';

import styles from './DeckPage.module.css';

function DeckPage() {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const [view, setView] = useState<DeckView | null>(null);
	const [error, setError] = useState(false);
	const [reloadKey, setReloadKey] = useState(0);

	useEffect(() => {
		let active = true;
		loadCardDeckForDate(formatLocalDate(new Date()))
			.then((nextView) => { if (active) setView(nextView); })
			.catch(() => { if (active) setError(true); });
		return () => { active = false; };
	}, [reloadKey]);

	if (error) return <div className={styles.status}><p>{t('shell.deck.loadError')}</p><button type='button' onClick={() => { setError(false); setView(null); setReloadKey((key) => key + 1); }}><FiRefreshCw aria-hidden='true' />{t('shell.deck.retry')}</button></div>;
	if (!view) return <p className={styles.loading}>{t('shell.deck.loading')}</p>;

	const cardCount = view.categories.reduce((count, category) => count + category.cards.length, 0);
	return (
		<div className={styles.page}>
			<section className={styles.overview}>
				<span><FiLayers aria-hidden='true' /></span>
				<div><strong>{t('shell.deck.manageTitle')}</strong><small>{t('shell.deck.cardCount', { count: cardCount })}</small></div>
				<button type='button' onClick={() => navigate(APP_ROUTES.DECK_NEW)}><FiPlus aria-hidden='true' />{t('shell.deck.newHabit')}</button>
			</section>
			<CardDeck
				categories={view.categories}
				onCreateRunningCard={() => navigate(APP_ROUTES.DECK_NEW)}
				copy={{
					create: t('shell.deck.create'),
					comingSoon: t('shell.common.comingSoon'),
					empty: t('shell.deck.emptyCards'),
					longTerm: t('shell.deck.longTerm'),
					stage: t('shell.deck.stage'),
				}}
			/>
		</div>
	);
}

export { DeckPage };
