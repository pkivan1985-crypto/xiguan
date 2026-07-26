/* eslint-disable i18next/no-literal-string -- Filter, icon, accent, size, and goal-kind values are stable UI/domain identifiers. */
import { useState } from 'react';
import {
	PiArchive,
	PiCalendarBlank,
	PiCaretRight,
	PiCaretUp,
	PiFlagPennant,
	PiTarget,
} from 'react-icons/pi';

import { formatQuantityFromBase, type HabitTrackingType } from '@entities/card-template';
import type { GoalProgress, LongTermGoal, StageGoal } from '@entities/goal';
import type { IsoWeekday } from '@entities/user-card';
import type { DeckCardView, DeckCategoryView } from '@features/load-card-deck';
import { HabitGlyph } from '@widgets/habit-glyph';

import {
	createCardDeckState,
	filterDeckCards,
	transitionCardDeckState,
	type DeckFilterId,
	type FilteredDeckCard,
} from '../model/toggleExpandedItemId';
import styles from './CardDeck.module.css';

interface CardDeckCopy {
	active: string;
	archive: string;
	collapse: string;
	customDaily?: string;
	daily: string;
	days: string;
	details: string;
	empty: string;
	filters: Record<DeckFilterId, string>;
	filtersLabel: string;
	longTerm: string;
	noGoal: string;
	plan: string;
	stage: string;
	trackingTypes: Record<HabitTrackingType, string>;
	weekdays?: Partial<Record<IsoWeekday, string>>;
}

interface CardDeckProps {
	archivedCount: number;
	categories: DeckCategoryView[];
	copy: CardDeckCopy;
	onOpenGoalDetails: (cardId: string) => void;
}

const FILTERS: readonly DeckFilterId[] = ['all', 'sport', 'reading', 'life'];

function trimDeckQuantity(value: string): string {
	return value.includes('.') ? value.replace(/0+$/, '').replace(/\.$/, '') : value;
}

function formatCardQuantity(card: DeckCardView, baseValue: number): string {
	return trimDeckQuantity(formatQuantityFromBase(baseValue, card.template.quantity));
}

function dailyReference(card: DeckCardView, copy: CardDeckCopy): string {
	const target = card.dailyTargetBase ?? card.template.defaultDailyTargetBase;
	if (card.dailyPlan?.mode === 'custom') {
		const days = card.dailyPlan.weekdays.map((day) => copy.weekdays?.[day]).filter(Boolean).join('、');
		return `${days || copy.daily} · ${copy.customDaily ?? copy.daily}`;
	}
	const schedule = card.dailyPlan && card.dailyPlan.weekdays.length < 7
		? card.dailyPlan.weekdays.map((day) => copy.weekdays?.[day]).filter(Boolean).join('、')
		: copy.daily;
	if (target === undefined) return copy.daily;
	return `${schedule || copy.daily} ${formatCardQuantity(card, target)} ${card.template.quantity.displayUnit}`;
}

function progressPercent(card: DeckCardView): number | null {
	const progress = card.stageProgress ?? card.longTermProgress;
	return progress ? Math.round(progress.ratio * 100) : null;
}

function quantityProgressText(
	card: DeckCardView,
	progress: GoalProgress,
	target: number,
): string {
	return `${formatCardQuantity(card, progress.quantityBaseValue)} / ${formatCardQuantity(card, target)} ${card.template.quantity.displayUnit}`;
}

interface GoalLineProps {
	card: DeckCardView;
	goal: LongTermGoal | StageGoal;
	kind: 'longTerm' | 'stage';
	label: string;
	progress: GoalProgress;
	copy: CardDeckCopy;
}

function goalValues({
	card,
	goal,
	kind,
	progress,
	copy,
}: GoalLineProps): string[] {
	if (kind === 'longTerm') {
		const longTermGoal = goal as LongTermGoal;
		return [quantityProgressText(card, progress, longTermGoal.targetQuantityBase)];
	}
	const stageGoal = goal as StageGoal;
	const values: string[] = [];
	if (stageGoal.mode !== 'activeDays' && stageGoal.targetQuantityBase !== undefined) {
		values.push(quantityProgressText(card, progress, stageGoal.targetQuantityBase));
	}
	if (stageGoal.mode !== 'quantity' && stageGoal.targetActiveDays !== undefined) {
		values.push(`${progress.activeDays} / ${stageGoal.targetActiveDays} ${copy.days}`);
	}
	return values;
}

function GoalLine(props: GoalLineProps) {
	const {
		goal,
		kind,
		label,
		progress,
	} = props;
	const values = goalValues(props);
	const GoalIcon = kind === 'longTerm' ? PiTarget : PiFlagPennant;
	const percentage = Math.round(progress.ratio * 100);

	return (
		<div className={styles.goal} data-kind={kind}>
			<span className={styles.goalIcon}><GoalIcon aria-hidden='true' /></span>
			<span className={styles.goalCopy}>
				<small>{label}</small>
				<strong>{goal.title}</strong>
			</span>
			<span className={styles.goalValues}>
				{values.map((value) => <b key={value}>{value}</b>)}
			</span>
			<span
				className={styles.goalTrack}
				role='progressbar'
				aria-label={`${label}：${goal.title}`}
				aria-valuemin={0}
				aria-valuemax={100}
				aria-valuenow={percentage}
				aria-valuetext={values.join('；')}
			>
				<i style={{ width: `${percentage}%` }} />
			</span>
		</div>
	);
}

interface HabitCardProps {
	item: FilteredDeckCard;
	copy: CardDeckCopy;
	onOpenGoalDetails: (cardId: string) => void;
	onToggle: () => void;
}

function ExpandedHabitCard({
	item,
	copy,
	onOpenGoalDetails,
	onToggle,
}: HabitCardProps) {
	const { card, category } = item;
	const trackingType = card.template.trackingType ?? 'quantity';
	const categoryName = copy.filters[category.id as DeckFilterId] ?? category.title;
	const hasGoal = Boolean(card.longTermGoal || card.stageGoal);

	return (
		<article
			className={styles.expandedCard}
			data-card-id={card.id}
			data-layout='expanded'
		>
			<header className={styles.expandedHeader}>
				<HabitGlyph
					accent={card.template.accent ?? 'blue'}
					decorative
					iconKey={card.template.iconKey ?? 'activity'}
					label={card.title}
					size='lg'
				/>
				<span className={styles.expandedIdentity}>
					<strong>{card.title}</strong>
					<small>{categoryName} · {copy.trackingTypes[trackingType]}</small>
				</span>
				<span className={styles.dailyReference}>{dailyReference(card, copy)}</span>
			</header>

			{hasGoal ? (
				<div className={styles.goalPanel} role='group' aria-label={card.title}>
					{card.stageGoal && card.stageProgress && (
						<GoalLine
							card={card}
							copy={copy}
							goal={card.stageGoal}
							kind='stage'
							label={card.stagePosition ? `${copy.stage} · ${card.stagePosition.current}/${card.stagePosition.total}` : copy.stage}
							progress={card.stageProgress}
						/>
					)}
					{card.longTermGoal && card.longTermProgress && (
						<GoalLine
							card={card}
							copy={copy}
							goal={card.longTermGoal}
							kind='longTerm'
							label={copy.longTerm}
							progress={card.longTermProgress}
						/>
					)}
				</div>
			) : <p className={styles.noGoal}>{copy.noGoal}</p>}

			<footer className={styles.expandedFooter}>
				<span className={styles.plan}>
					<PiCalendarBlank aria-hidden='true' />
					<small>{copy.plan}</small>
					<strong>{dailyReference(card, copy)}</strong>
				</span>
				<span className={styles.cardActions}>
					{card.longTermGoal && (
						<button type='button' onClick={() => onOpenGoalDetails(card.id)}>
							<PiTarget aria-hidden='true' />
							{copy.details}
						</button>
					)}
					<button type='button' onClick={onToggle}>
						<PiCaretUp aria-hidden='true' />
						{copy.collapse}
					</button>
				</span>
			</footer>
		</article>
	);
}

function CompactHabitCard({ item, copy, onToggle }: HabitCardProps) {
	const { card } = item;
	const percentage = progressPercent(card);

	return (
		<article
			className={styles.compactCard}
			data-card-id={card.id}
			data-layout='compact'
			data-progress={percentage === null ? undefined : `${percentage}%`}
		>
			<button type='button' aria-expanded='false' onClick={onToggle}>
				<span className={styles.compactHeading}>
					<HabitGlyph
						accent={card.template.accent ?? 'blue'}
						decorative
						iconKey={card.template.iconKey ?? 'activity'}
						label={card.title}
						size='sm'
					/>
					<span className={styles.compactIdentity}>
						<strong>{card.title}</strong>
						<small>{dailyReference(card, copy)}</small>
					</span>
					<PiCaretRight aria-hidden='true' />
				</span>
				{percentage === null ? (
					<span className={styles.compactStatus}>{copy.noGoal}</span>
				) : (
					<span className={styles.compactProgress}>
						<strong>{percentage}%</strong>
						<span
							className={styles.compactTrack}
							role='progressbar'
							aria-label={card.title}
							aria-valuemin={0}
							aria-valuemax={100}
							aria-valuenow={percentage}
						>
							<i style={{ width: `${percentage}%` }} />
						</span>
					</span>
				)}
			</button>
		</article>
	);
}

function CardDeck({
	archivedCount,
	categories,
	copy,
	onOpenGoalDetails,
}: CardDeckProps) {
	const [state, setState] = useState(() => createCardDeckState(categories));
	const visibleCards = filterDeckCards(categories, state.filter);
	const expandedItem = visibleCards.find(
		({ card }) => card.id === state.expandedItemId,
	);
	const compactItems = visibleCards.filter(
		({ card }) => card.id !== state.expandedItemId,
	);

	const changeFilter = (filter: DeckFilterId) => {
		setState((current) => transitionCardDeckState(
			current,
			{ type: 'selectFilter', filter },
			categories,
		));
	};

	return (
		<div className={styles.deck}>
			<div
				className={styles.filters}
				data-testid='habit-filter-group'
				role='group'
				aria-label={copy.filtersLabel}
			>
				{FILTERS.map((filter) => (
					<button
						type='button'
						aria-pressed={state.filter === filter}
						data-filter={filter}
						onClick={() => changeFilter(filter)}
						key={filter}
					>
						<span className={styles.filterLabel}>{copy.filters[filter]}</span>
					</button>
				))}
			</div>

			<h2 className={styles.sectionTitle}>{copy.active}</h2>

			<section
				className={styles.activeSection}
				id='habit-card-grid'
			>
				{visibleCards.length === 0 ? (
					<p className={styles.empty}>{copy.empty}</p>
				) : (
					<div className={styles.cardGrid}>
						{expandedItem && (
							<ExpandedHabitCard
								copy={copy}
								item={expandedItem}
								onOpenGoalDetails={onOpenGoalDetails}
								onToggle={() => setState((current) => transitionCardDeckState(
									current,
									{ type: 'toggleCard', cardId: expandedItem.card.id },
									categories,
								))}
							/>
						)}
						{compactItems.map((item) => (
							<CompactHabitCard
								copy={copy}
								item={item}
								onOpenGoalDetails={onOpenGoalDetails}
								onToggle={() => setState((current) => transitionCardDeckState(
									current,
									{ type: 'toggleCard', cardId: item.card.id },
									categories,
								))}
								key={item.card.id}
							/>
						))}
					</div>
				)}
			</section>

			<div
				className={styles.archiveSummary}
				data-testid='habit-archive-summary'
			>
				<PiArchive aria-hidden='true' />
				<span>{copy.archive}</span>
				<strong>{archivedCount}</strong>
			</div>
		</div>
	);
}

export { CardDeck };
export type { CardDeckCopy };
