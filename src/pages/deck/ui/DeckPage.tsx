import styles from './DeckPage.module.css';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { loadCardDeckForDate, type DeckView } from '@features/load-card-deck';
import { APP_ROUTES } from '@shared/config';
import { formatLocalDate } from '@shared/lib/date';
import { CardDeck } from '@widgets/card-deck';
import { TodayCardSlots } from '@widgets/today-card-slots';

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

	if (error) return <div className={styles.status}><p>{t('shell.deck.loadError')}</p><button type='button' onClick={() => { setError(false); setView(null); setReloadKey((key) => key + 1); }}>{t('shell.deck.retry')}</button></div>;
	if (!view) return <p className={styles.loading}>{t('shell.deck.loading')}</p>;

	return (
		<div className={styles.page}>
			<TodayCardSlots slots={view.slots} emptyLabel={t('shell.deck.emptySlot')} sectionLabel={t('shell.deck.todayActive')} />
			<section><h2>{t('shell.deck.allCards')}</h2><CardDeck categories={view.categories} onCreateRunningCard={() => navigate(APP_ROUTES.DECK_NEW)} copy={{ create: t('shell.deck.create'), comingSoon: t('shell.common.comingSoon'), empty: t('shell.deck.emptyCards'), longTerm: t('shell.deck.longTerm'), stage: t('shell.deck.stage') }} /></section>
		</div>
	);
}

export { DeckPage };
