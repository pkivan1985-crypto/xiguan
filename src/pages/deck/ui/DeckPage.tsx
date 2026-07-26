import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PiGearSix, PiPlus, PiSpinnerGap } from 'react-icons/pi';
import { Link, useNavigate } from 'react-router';

import { loadCardDeckForDate, type DeckView } from '@features/load-card-deck';
import { APP_ROUTES } from '@shared/config';
import { formatLocalDate } from '@shared/lib/date';
import { CardDeck } from '@widgets/card-deck';
import { MobilePageHeader } from '@widgets/mobile-page-header';

import styles from './DeckPage.module.css';

interface DeckPageContentProps {
	view: DeckView;
	onCreateHabit: () => void;
	onOpenGoalDetails: (cardId: string) => void;
}

function activeCardCount(view: DeckView): number {
	return view.categories.reduce((count, category) => count + category.cards.length, 0);
}

function DeckPageContent({
	view,
	onCreateHabit,
	onOpenGoalDetails,
}: DeckPageContentProps) {
	const { t } = useTranslation();
	const activeCount = activeCardCount(view);

	return (
		<div className={styles.page}>
			<MobilePageHeader
				title={t('shell.nav.habits')}
				description={t('shell.deck.activeAndArchived', {
					active: activeCount,
					archived: view.archivedCount,
				})}
				primaryAction={(
					<div className={styles.headerActions}>
						<Link
							className={styles.settingsAction}
							to={APP_ROUTES.SETTINGS}
							aria-label={t('shell.actions.openSettings')}
						>
							<PiGearSix aria-hidden='true' />
						</Link>
						<button
							className={styles.createAction}
							type='button'
							onClick={onCreateHabit}
						>
							<PiPlus aria-hidden='true' />
							{t('shell.deck.newHabit')}
						</button>
					</div>
				)}
			/>

			<CardDeck
				archivedCount={view.archivedCount}
				categories={view.categories}
				onOpenGoalDetails={onOpenGoalDetails}
				copy={{
					active: t('shell.deck.active'),
					archive: t('shell.deck.archive'),
					collapse: t('shell.deck.collapse'),
					customDaily: t('shell.deck.customDaily'),
					daily: t('shell.deck.daily'),
					days: t('shell.deck.days'),
					details: t('shell.deck.details'),
					empty: t('shell.deck.emptyCards'),
					filters: {
						all: t('shell.deck.filters.all'),
						sport: t('shell.deck.filters.sport'),
						reading: t('shell.deck.filters.reading'),
						life: t('shell.deck.filters.life'),
					},
					filtersLabel: t('shell.deck.filtersLabel'),
					longTerm: t('shell.deck.longTerm'),
					noGoal: t('shell.deck.noGoal'),
					plan: t('shell.deck.plan'),
					stage: t('shell.deck.stage'),
					weekdays: {
						1: t('shell.createCard.weekdays.1'),
						2: t('shell.createCard.weekdays.2'),
						3: t('shell.createCard.weekdays.3'),
						4: t('shell.createCard.weekdays.4'),
						5: t('shell.createCard.weekdays.5'),
						6: t('shell.createCard.weekdays.6'),
						7: t('shell.createCard.weekdays.7'),
					},
					trackingTypes: {
						check: t('shell.deck.trackingTypes.check'),
						count: t('shell.deck.trackingTypes.count'),
						quantity: t('shell.deck.trackingTypes.quantity'),
						duration: t('shell.deck.trackingTypes.duration'),
						avoid: t('shell.deck.trackingTypes.avoid'),
					},
				}}
			/>
		</div>
	);
}

function DeckPage() {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const [view, setView] = useState<DeckView | null>(null);
	const [error, setError] = useState(false);
	const [reloadKey, setReloadKey] = useState(0);

	useEffect(() => {
		let active = true;
		loadCardDeckForDate(formatLocalDate(new Date()))
			.then((nextView) => {
				if (!active) return;
				setView(nextView);
				setError(false);
			})
			.catch(() => {
				if (active) setError(true);
			});
		return () => {
			active = false;
		};
	}, [reloadKey]);

	if (error) {
		return (
			<div className={styles.status}>
				<p>{t('shell.deck.loadError')}</p>
				<button
					type='button'
					onClick={() => {
						setError(false);
						setView(null);
						setReloadKey((key) => key + 1);
					}}
				>
					<PiSpinnerGap aria-hidden='true' />
					{t('shell.deck.retry')}
				</button>
			</div>
		);
	}

	if (!view) return <p className={styles.loading}>{t('shell.deck.loading')}</p>;

	return (
		<DeckPageContent
			view={view}
			onCreateHabit={() => navigate(APP_ROUTES.DECK_NEW)}
			onOpenGoalDetails={(cardId) => navigate(APP_ROUTES.goalDetails(cardId))}
		/>
	);
}

export { DeckPage, DeckPageContent };
export type { DeckPageContentProps };
