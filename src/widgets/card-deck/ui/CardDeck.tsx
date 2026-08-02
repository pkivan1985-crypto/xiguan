/* eslint-disable i18next/no-literal-string -- Filter, icon, accent, size, and goal-kind values are stable UI/domain identifiers. */
import { useState } from 'react';
import {
	PiArchive,
	PiArrowCounterClockwise,
	PiCalendarBlank,
	PiCaretDown,
	PiCaretRight,
	PiCaretUp,
	PiDotsThree,
	PiFlagPennant,
	PiBookOpen,
	PiLeaf,
	PiPersonSimpleRun,
	PiSquaresFour,
	PiTarget,
	PiTrash,
	PiWarning,
} from 'react-icons/pi';

import { formatQuantityFromBase, type HabitTrackingType } from '@entities/card-template';
import type { GoalProgress, LongTermGoal, StageGoal } from '@entities/goal';
import type { IsoWeekday } from '@entities/user-card';
import type {
	ArchivedDeckCardView,
	DeckCardView,
	DeckCategoryView,
} from '@features/load-card-deck';
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
	archiveAction: string;
	cancel: string;
	collapse: string;
	completed: string;
	customDaily?: string;
	daily: string;
	days: string;
	details: string;
	deleteAction: string;
	deleteDescription: string;
	deleteTitle: (title: string) => string;
	empty: string;
	filters: Record<DeckFilterId, string>;
	filtersLabel: string;
	longTerm: string;
	manageAction: string;
	noGoal: string;
	operationError: string;
	pending: string;
	plan: string;
	rest: string;
	restoreAction: string;
	stage: string;
	today: string;
	trackingTypes: Record<HabitTrackingType, string>;
	weekdays?: Partial<Record<IsoWeekday, string>>;
	weekdaysLong?: Partial<Record<IsoWeekday, string>>;
	weeklyPlan: (count: number, days: string) => string;
	weeklyRestPlan: (count: number, days: string) => string;
}

interface CardDeckProps {
	archivedCount: number;
	archivedCards: ArchivedDeckCardView[];
	categories: DeckCategoryView[];
	copy: CardDeckCopy;
	onArchiveCard: (cardId: string) => Promise<void>;
	onDeleteCard: (cardId: string) => Promise<void>;
	onOpenGoalDetails: (cardId: string) => void;
	onRestoreCard: (cardId: string) => Promise<void>;
}

const FILTERS: readonly DeckFilterId[] = ['all', 'sport', 'reading', 'life'];
const FILTER_ICONS = {
	all: PiSquaresFour,
	sport: PiPersonSimpleRun,
	reading: PiBookOpen,
	life: PiLeaf,
} satisfies Record<DeckFilterId, typeof PiSquaresFour>;
const WEEKDAYS: readonly IsoWeekday[] = [1, 2, 3, 4, 5, 6, 7];

function trimDeckQuantity(value: string): string {
	return value.includes('.') ? value.replace(/0+$/, '').replace(/\.$/, '') : value;
}

function formatCardQuantity(card: DeckCardView, baseValue: number): string {
	return trimDeckQuantity(formatQuantityFromBase(baseValue, card.template.quantity));
}

function planSummary(card: DeckCardView, copy: CardDeckCopy): string {
	const plan = card.dailyPlan;
	if (!plan || plan.weekdays.length === 7) {
		return plan?.mode === 'custom' ? `${copy.daily} · ${copy.customDaily ?? copy.daily}` : copy.daily;
	}
	const names = copy.weekdaysLong ?? copy.weekdays;
	const restDays = WEEKDAYS.filter((day) => !plan.weekdays.includes(day));
	const summarizeRest = plan.weekdays.length >= 5 && restDays.length > 0;
	const visibleDays = summarizeRest ? restDays : plan.weekdays;
	const dayNames = visibleDays.map((day) => names?.[day]).filter(Boolean).join('、');
	const summary = summarizeRest
		? copy.weeklyRestPlan(plan.weekdays.length, dayNames)
		: copy.weeklyPlan(plan.weekdays.length, dayNames);
	return plan.mode === 'custom' ? `${summary} · ${copy.customDaily ?? copy.daily}` : summary;
}

function todayReference(card: DeckCardView, copy: CardDeckCopy): string {
	if (card.todayStatus.kind === 'completed') return copy.completed;
	if (card.todayStatus.kind === 'rest') return copy.rest;
	const trackingType = card.template.trackingType ?? 'quantity';
	if (trackingType === 'check' || trackingType === 'avoid') return copy.pending;
	const target = card.todayStatus.targetBase
		?? card.dailyTargetBase
		?? card.template.defaultDailyTargetBase;
	return target === undefined
		? copy.pending
		: `${formatCardQuantity(card, target)} ${card.template.quantity.displayUnit}`;
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
	busy: boolean;
	item: FilteredDeckCard;
	copy: CardDeckCopy;
	onArchive: () => void;
	onDelete: () => void;
	onOpenGoalDetails: (cardId: string) => void;
	onToggle: () => void;
}

function ExpandedHabitCard({
	busy,
	item,
	copy,
	onArchive,
	onDelete,
	onOpenGoalDetails,
	onToggle,
}: HabitCardProps) {
	const [menuOpen, setMenuOpen] = useState(false);
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
				<span className={styles.todayStatus} data-kind={card.todayStatus.kind}>
					<small>{copy.today}</small>
					<strong>{todayReference(card, copy)}</strong>
				</span>
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
					<strong>{planSummary(card, copy)}</strong>
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
					<span className={styles.managementMenu}>
						<button
							className={styles.menuTrigger}
							type='button'
							aria-expanded={menuOpen}
							aria-label={copy.manageAction}
							disabled={busy}
							onClick={() => setMenuOpen((open) => !open)}
						>
							<PiDotsThree aria-hidden='true' />
						</button>
						{menuOpen && (
							<span className={styles.menuPopover} role='menu'>
								<button
									className={styles.menuItem}
									type='button'
									role='menuitem'
									onClick={() => {
										setMenuOpen(false);
										onArchive();
									}}
								>
									<PiArchive aria-hidden='true' />
									{copy.archiveAction}
								</button>
								<button
									className={`${styles.menuItem} ${styles.dangerAction}`}
									type='button'
									role='menuitem'
									onClick={() => {
										setMenuOpen(false);
										onDelete();
									}}
								>
									<PiTrash aria-hidden='true' />
									{copy.deleteAction}
								</button>
							</span>
						)}
					</span>
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
						<small>{planSummary(card, copy)}</small>
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
	archivedCards,
	categories,
	copy,
	onArchiveCard,
	onDeleteCard,
	onOpenGoalDetails,
	onRestoreCard,
}: CardDeckProps) {
	const [state, setState] = useState(() => createCardDeckState(categories));
	const [archiveOpen, setArchiveOpen] = useState(false);
	const [busyCardId, setBusyCardId] = useState<string | null>(null);
	const [deleteTarget, setDeleteTarget] = useState<{
		id: string;
		title: string;
	} | null>(null);
	const [operationError, setOperationError] = useState(false);
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

	const runCardOperation = async (
		cardId: string,
		operation: (id: string) => Promise<void>,
	): Promise<boolean> => {
		setBusyCardId(cardId);
		setOperationError(false);
		try {
			await operation(cardId);
			return true;
		} catch {
			setOperationError(true);
			return false;
		} finally {
			setBusyCardId(null);
		}
	};

	return (
		<div className={styles.deck}>
			<div
				className={styles.filters}
				data-testid='habit-filter-group'
				role='group'
				aria-label={copy.filtersLabel}
			>
				{FILTERS.map((filter) => {
					const FilterIcon = FILTER_ICONS[filter];

					return (
						<button
							type='button'
							aria-pressed={state.filter === filter}
							data-filter={filter}
							onClick={() => changeFilter(filter)}
							key={filter}
						>
							<FilterIcon aria-hidden='true' />
							<span className={styles.filterLabel}>{copy.filters[filter]}</span>
						</button>
					);
				})}
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
								busy={busyCardId === expandedItem.card.id}
								copy={copy}
								item={expandedItem}
								onArchive={() => void runCardOperation(expandedItem.card.id, onArchiveCard)}
								onDelete={() => setDeleteTarget({
									id: expandedItem.card.id,
									title: expandedItem.card.title,
								})}
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
								busy={busyCardId === item.card.id}
								copy={copy}
								item={item}
								onArchive={() => void runCardOperation(item.card.id, onArchiveCard)}
								onDelete={() => setDeleteTarget({ id: item.card.id, title: item.card.title })}
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

			<button
				type='button'
				className={styles.archiveSummary}
				data-testid='habit-archive-summary'
				aria-expanded={archiveOpen}
				disabled={archivedCount === 0}
				onClick={() => setArchiveOpen((open) => !open)}
			>
				<PiArchive aria-hidden='true' />
				<span>{copy.archive}</span>
				<strong>{archivedCount}</strong>
				{archivedCount > 0 && (
					archiveOpen
						? <PiCaretUp className={styles.archiveCaret} aria-hidden='true' />
						: <PiCaretDown className={styles.archiveCaret} aria-hidden='true' />
				)}
			</button>

			{archiveOpen && archivedCards.length > 0 && (
				<section className={styles.archiveList}>
					{archivedCards.map((card) => (
						<article className={styles.archiveCard} key={card.id}>
							<HabitGlyph
								accent={card.template.accent ?? 'blue'}
								decorative
								iconKey={card.template.iconKey ?? 'activity'}
								label={card.title}
								size='sm'
							/>
							<strong>{card.title}</strong>
							<span className={styles.archiveActions}>
								<button
									type='button'
									disabled={busyCardId === card.id}
									onClick={() => void runCardOperation(card.id, onRestoreCard)}
								>
									<PiArrowCounterClockwise aria-hidden='true' />
									{copy.restoreAction}
								</button>
								<button
									className={styles.archiveDelete}
									type='button'
									disabled={busyCardId === card.id}
									aria-label={`${copy.deleteAction}：${card.title}`}
									onClick={() => setDeleteTarget({ id: card.id, title: card.title })}
								>
									<PiTrash aria-hidden='true' />
								</button>
							</span>
						</article>
					))}
				</section>
			)}

			{operationError && <p className={styles.operationError} role='alert'>{copy.operationError}</p>}

			{deleteTarget && (
				<div className={styles.dialogBackdrop}>
					<section
						className={styles.deleteDialog}
						role='alertdialog'
						aria-modal='true'
						aria-labelledby='delete-habit-title'
						aria-describedby='delete-habit-description'
					>
						<span className={styles.warningIcon}><PiWarning aria-hidden='true' /></span>
						<h2 id='delete-habit-title'>{copy.deleteTitle(deleteTarget.title)}</h2>
						<p id='delete-habit-description'>{copy.deleteDescription}</p>
						<span className={styles.dialogActions}>
							<button
								type='button'
								disabled={busyCardId === deleteTarget.id}
								onClick={() => setDeleteTarget(null)}
							>
								{copy.cancel}
							</button>
							<button
								className={styles.confirmDelete}
								type='button'
								disabled={busyCardId === deleteTarget.id}
								onClick={() => void runCardOperation(deleteTarget.id, onDeleteCard)
									.then((deleted) => {
										if (deleted) setDeleteTarget(null);
									})}
							>
								<PiTrash aria-hidden='true' />
								{copy.deleteAction}
							</button>
						</span>
					</section>
				</div>
			)}
		</div>
	);
}

export { CardDeck };
export type { CardDeckCopy };
