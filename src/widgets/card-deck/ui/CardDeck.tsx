import styles from './CardDeck.module.css';
import { FiActivity, FiBookOpen, FiEdit3, FiMoreHorizontal, FiPlus } from 'react-icons/fi';
import type { IconType } from 'react-icons';
import type { DeckCardView, DeckCategoryView } from '@features/load-card-deck';

interface CardDeckCopy {
	create: string;
	comingSoon: string;
	empty: string;
	longTerm: string;
	stage: string;
}

interface CardDeckProps {
	categories: DeckCategoryView[];
	onCreateRunningCard: () => void;
	copy: CardDeckCopy;
}

const CATEGORY_ICONS: Record<string, IconType> = { sport: FiActivity, reading: FiBookOpen, output: FiEdit3 };

function formatKilometers(baseValue: number): string {
	return `${Number((baseValue / 1000).toFixed(3))} km`;
}

function GoalLine({ label, title, target, ratio = 0 }: { label: string; title: string; target?: number; ratio?: number }) {
	return (
		<div className={styles.goal}>
			<div><small className={styles.goalLabel}>{label}</small><span>{title}</span>{target !== undefined && <b>{formatKilometers(target)}</b>}</div>
			<div className={styles.track}><i style={{ width: `${Math.round(ratio * 100)}%` }} /></div>
		</div>
	);
}

function UserCardView({ card, copy }: { card: DeckCardView; copy: CardDeckCopy }) {
	return (
		<article className={styles.card}>
			<header><div><strong>{card.title}</strong><small>{card.template.title}</small></div><FiMoreHorizontal aria-hidden='true' /></header>
			{card.longTermGoal && <GoalLine label={copy.longTerm} title={card.longTermGoal.title} target={card.longTermGoal.targetQuantityBase} ratio={card.longTermProgress?.ratio} />}
			{card.stageGoal && <GoalLine label={copy.stage} title={card.stageGoal.title} target={card.stageGoal.targetQuantityBase} ratio={card.stageProgress?.ratio} />}
		</article>
	);
}

function CardDeck({ categories, onCreateRunningCard, copy }: CardDeckProps) {
	return (
		<div className={styles.categories}>
			{categories.map((category) => {
				const Icon = CATEGORY_ICONS[category.id] ?? FiActivity;
				return (
					<section className={`${styles.category} ${styles[category.id] ?? ''}`} key={category.id}>
						<header className={styles.categoryHeader}>
							<span className={styles.categoryIcon}><Icon aria-hidden='true' /></span>
							<strong>{category.title}</strong>
							{category.enabled ? (
								<button type='button' onClick={onCreateRunningCard}><FiPlus aria-hidden='true' />{copy.create}</button>
							) : <small>{copy.comingSoon}</small>}
						</header>
						{category.cards.map((card) => <UserCardView card={card} copy={copy} key={card.id} />)}
						{category.enabled && category.cards.length === 0 && <p className={styles.empty}>{copy.empty}</p>}
					</section>
				);
			})}
		</div>
	);
}

export { CardDeck };
export type { CardDeckCopy };
