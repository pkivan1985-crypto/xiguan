import styles from './CardDeck.module.css';
import { useState } from 'react';
import { FiActivity, FiBookOpen, FiChevronDown, FiEdit3, FiPlus } from 'react-icons/fi';
import type { IconType } from 'react-icons';
import type { DeckCardView, DeckCategoryView } from '@features/load-card-deck';
import { toggleExpandedItemId } from '../model/toggleExpandedItemId';

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

function UserCardView({ card, copy, expanded, onToggle }: { card: DeckCardView; copy: CardDeckCopy; expanded: boolean; onToggle: () => void }) {
	const ratio = card.longTermProgress?.ratio ?? card.stageProgress?.ratio ?? 0;
	return (
		<article className={`${styles.card} ${expanded ? styles.expanded : ''}`}>
			<button className={styles.cardToggle} type='button' aria-expanded={expanded} onClick={onToggle}>
				<span className={styles.cardIdentity}><strong>{card.title}</strong><small>{card.template.title}</small></span>
				<span className={styles.progressSummary}>{Math.round(ratio * 100)}%</span>
				<FiChevronDown className={styles.chevron} aria-hidden='true' />
			</button>
			<div className={styles.cardProgress} aria-hidden='true'><i style={{ width: `${Math.round(ratio * 100)}%` }} /></div>
			{expanded && <div className={styles.cardDetails}>
				{card.longTermGoal && <GoalLine label={copy.longTerm} title={card.longTermGoal.title} target={card.longTermGoal.targetQuantityBase} ratio={card.longTermProgress?.ratio} />}
				{card.stageGoal && <GoalLine label={copy.stage} title={card.stageGoal.title} target={card.stageGoal.targetQuantityBase} ratio={card.stageProgress?.ratio} />}
			</div>}
		</article>
	);
}

function CardDeck({ categories, onCreateRunningCard, copy }: CardDeckProps) {
	const [expandedCardIds, setExpandedCardIds] = useState<Set<string>>(() => new Set());
	const [expandedCategoryIds, setExpandedCategoryIds] = useState<Set<string>>(() => new Set(categories.filter((category) => category.cards.length > 0).map((category) => category.id)));
	return (
		<div className={styles.categories}>
			{categories.map((category) => {
				const Icon = CATEGORY_ICONS[category.id] ?? FiActivity;
				const categoryExpanded = expandedCategoryIds.has(category.id);
				return (
					<section className={`${styles.category} ${styles[category.id] ?? ''}`} key={category.id}>
						<header className={styles.categoryHeader}>
							{category.cards.length > 0 ? <button className={styles.categoryToggle} type='button' aria-expanded={categoryExpanded} onClick={() => setExpandedCategoryIds((current) => toggleExpandedItemId(current, category.id))}>
								<span className={styles.categoryIcon}><Icon aria-hidden='true' /></span>
								<strong>{category.title}</strong>
								<span className={styles.categoryCount}>{category.cards.length}</span>
								<FiChevronDown className={styles.categoryChevron} aria-hidden='true' />
							</button> : <div className={styles.categorySummary}>
								<span className={styles.categoryIcon}><Icon aria-hidden='true' /></span><strong>{category.title}</strong>
							</div>}
							{category.enabled ? (
								<button className={styles.createButton} type='button' onClick={onCreateRunningCard}><FiPlus aria-hidden='true' />{copy.create}</button>
							) : <small>{copy.comingSoon}</small>}
						</header>
						{categoryExpanded && category.cards.length > 0 && <div className={styles.cardGrid}>
							{category.cards.map((card) => <UserCardView card={card} copy={copy} expanded={expandedCardIds.has(card.id)} onToggle={() => setExpandedCardIds((current) => toggleExpandedItemId(current, card.id))} key={card.id} />)}
						</div>}
						{category.enabled && category.cards.length === 0 && <p className={styles.empty}>{copy.empty}</p>}
					</section>
				);
			})}
		</div>
	);
}

export { CardDeck };
export type { CardDeckCopy };
