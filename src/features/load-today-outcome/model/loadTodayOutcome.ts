/* eslint-disable i18next/no-literal-string -- Table indexes and domain statuses are identifiers. */
import type { CardTemplate } from '@entities/card-template';
import { seedSystemDefinitions } from '@entities/card-template';
import type { OutcomeBatch } from '@entities/outcome-batch';
import type { TodayDraft } from '@entities/today-draft';
import type { UserCard } from '@entities/user-card';
import { openTodayDraft } from '@features/manage-today-draft';
import type { LocalDate } from '@shared/lib/date';
import { appDatabase, type RepeatOutcomeDatabase } from '@shared/lib/db';

export interface TodayOutcomeCardView {
	id: string;
	title: string;
	slotIndex: number;
	valueText: string;
	displayUnit: string;
	baseUnit: string;
	maxDecimalPlaces: number;
	confirmationThresholdDisplay: number;
}

export type AvailableTodayOutcomeCard = Omit<TodayOutcomeCardView, 'slotIndex' | 'valueText'>;

export type BatchFooterSummary =
	| { kind: 'total'; cardCount: number; valueText: string; displayUnit: string }
	| { kind: 'completion'; cardCount: number; filledCount: number };

export interface BatchFooterEntry {
	displayValue: number;
	displayUnit: string;
	filled: boolean;
}

export interface TodayOutcomeView {
	localDate: LocalDate;
	draft: TodayDraft;
	selectedCards: TodayOutcomeCardView[];
	availableCards: AvailableTodayOutcomeCard[];
	footer: BatchFooterSummary;
	recoverableBatch?: OutcomeBatch;
}

export function buildBatchFooterSummary(entries: BatchFooterEntry[]): BatchFooterSummary {
	const units = new Set(entries.map(({ displayUnit }) => displayUnit));
	if (units.size === 1) {
		const total = entries.reduce((sum, entry) => sum + (entry.filled ? entry.displayValue : 0), 0);
		return {
			kind: 'total',
			cardCount: entries.length,
			valueText: total.toFixed(2),
			displayUnit: entries[0]?.displayUnit ?? '',
		};
	}
	return {
		kind: 'completion',
		cardCount: entries.length,
		filledCount: entries.filter(({ filled }) => filled).length,
	};
}

function cardView(card: UserCard, template: CardTemplate): AvailableTodayOutcomeCard {
	return {
		id: card.id,
		title: card.title,
		displayUnit: template.quantity.displayUnit,
		baseUnit: template.quantity.baseUnit,
		maxDecimalPlaces: template.quantity.maxDecimalPlaces,
		confirmationThresholdDisplay: template.quantity.confirmationThresholdDisplay,
	};
}

export async function loadTodayOutcome(
	database: RepeatOutcomeDatabase,
	localDate: LocalDate,
	nowIso: string,
): Promise<TodayOutcomeView> {
	const templates = database.tableFor<CardTemplate>('cardTemplates');
	if (!await templates.get('running')) await seedSystemDefinitions(database);
	const draft = await openTodayDraft(database, localDate, nowIso);
	const cards = database.tableFor<UserCard>('userCards');
	const batches = database.tableFor<OutcomeBatch>('outcomeBatches');
	const data = await database.transaction('r', [templates, cards, batches], async () => ({
		templates: await templates.toArray(),
		cards: await cards.where('status').equals('active').toArray(),
		batches: await batches.where('localDate').equals(localDate).toArray(),
	}));

	const enabledTemplates = new Map(data.templates.filter(({ enabled }) => enabled).map((template) => [template.id, template]));
	const activeCards = data.cards
		.sort((left, right) => left.sortOrder - right.sortOrder)
		.flatMap((card): Array<{ card: UserCard; template: CardTemplate }> => {
			const template = enabledTemplates.get(card.officialCardId);
			return template ? [{ card, template }] : [];
		});
	const byId = new Map(activeCards.map((entry) => [entry.card.id, entry]));
	const selectedCards = [...draft.slots]
		.sort((left, right) => left.slotIndex - right.slotIndex)
		.flatMap((slot): TodayOutcomeCardView[] => {
			if (!slot.userCardId) return [];
			const entry = byId.get(slot.userCardId);
			if (!entry) return [];
			return [{ ...cardView(entry.card, entry.template), slotIndex: slot.slotIndex, valueText: slot.valueText }];
		});
	const selectedIds = new Set(selectedCards.map(({ id }) => id));
	const availableCards = activeCards
		.filter(({ card }) => !selectedIds.has(card.id))
		.map(({ card, template }) => cardView(card, template));
	const footer = buildBatchFooterSummary(selectedCards.map(({ valueText, displayUnit }) => {
		const displayValue = Number(valueText);
		return { displayValue, displayUnit, filled: valueText.trim() !== '' && Number.isFinite(displayValue) && displayValue > 0 };
	}));
	const recoverableBatch = data.batches
		.filter(({ status }) => status === 'ready' || status === 'playing')
		.sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0];

	return { localDate, draft, selectedCards, availableCards, footer, recoverableBatch };
}

export function loadTodayOutcomeForDate(localDate: LocalDate, nowIso: string): Promise<TodayOutcomeView> {
	return loadTodayOutcome(appDatabase, localDate, nowIso);
}
