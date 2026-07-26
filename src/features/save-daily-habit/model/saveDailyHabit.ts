/* eslint-disable i18next/no-literal-string -- Domain error codes are stable identifiers. */
import type { ActionRecord } from '@entities/action-record';
import { formatQuantityFromBase, type CardTemplate } from '@entities/card-template';
import type { TodayDraft } from '@entities/today-draft';
import type { UserCard } from '@entities/user-card';
import { correctActionRecord } from '@features/correct-action-record';
import { completeOutcomePlayback } from '@features/manage-outcome-playback';
import { saveTodayOutcome } from '@features/save-today-outcome';
import { appLifecycleCoordinator } from '@shared/lib/app-lifecycle';
import { appDatabase, type RepeatOutcomeDatabase } from '@shared/lib/db';

export interface SaveDailyHabitInput {
	userCardId: string;
	localDate: string;
	currentLocalDate: string;
	quantityBaseValue: number;
	entryMethod?: ActionRecord['entryMethod'];
	plannedQuantityBaseValue?: number;
	carryInBaseValue?: number;
	durationSeconds?: number;
	averagePaceSecondsPerKm?: number;
	averageHeartRateBpm?: number;
	note?: string;
	nowIso: string;
	submissionId: string;
}

export interface SaveDailyHabitResult {
	operation: 'save' | 'delete';
	actionRecordId: string;
}

function assertInput(input: SaveDailyHabitInput): void {
	if (!input.userCardId.trim()) throw new Error('USER_CARD_ID_REQUIRED');
	if (!input.submissionId.trim()) throw new Error('SUBMISSION_ID_REQUIRED');
	if (!Number.isSafeInteger(input.quantityBaseValue) || input.quantityBaseValue < 0) {
		throw new Error('INVALID_QUANTITY');
	}
	if (input.plannedQuantityBaseValue !== undefined
		&& (!Number.isSafeInteger(input.plannedQuantityBaseValue) || input.plannedQuantityBaseValue <= 0)) {
		throw new Error('INVALID_PLANNED_QUANTITY');
	}
	if (input.carryInBaseValue !== undefined
		&& (!Number.isSafeInteger(input.carryInBaseValue) || input.carryInBaseValue < 0)) {
		throw new Error('INVALID_CARRY_IN');
	}
	if (input.durationSeconds !== undefined
		&& (!Number.isSafeInteger(input.durationSeconds) || input.durationSeconds <= 0)) {
		throw new Error('INVALID_DURATION');
	}
	if (input.averagePaceSecondsPerKm !== undefined
		&& (!Number.isSafeInteger(input.averagePaceSecondsPerKm) || input.averagePaceSecondsPerKm <= 0)) {
		throw new Error('INVALID_PACE');
	}
	if (input.averageHeartRateBpm !== undefined
		&& (!Number.isSafeInteger(input.averageHeartRateBpm) || input.averageHeartRateBpm < 30 || input.averageHeartRateBpm > 240)) {
		throw new Error('INVALID_HEART_RATE');
	}
	if (input.note !== undefined && input.note.length > 280) throw new Error('NOTE_TOO_LONG');
}

function singleCardDraft(input: SaveDailyHabitInput, valueText: string): TodayDraft {
	return {
		localDate: input.localDate,
		status: 'editing',
		updatedAt: input.nowIso,
		slots: Array.from({ length: 6 }, (_, slotIndex) => ({
			slotIndex,
			userCardId: slotIndex === 0 ? input.userCardId : null,
			valueText: slotIndex === 0 ? valueText : '',
		})),
	};
}

export async function saveDailyHabit(
	database: RepeatOutcomeDatabase,
	input: SaveDailyHabitInput,
): Promise<SaveDailyHabitResult> {
	assertInput(input);
	const actionRecordId = `${input.userCardId}:${input.localDate}`;
	const actionRecords = database.tableFor<ActionRecord>('actionRecords');

	if (input.quantityBaseValue === 0) {
		const existing = await actionRecords.get(actionRecordId);
		if (existing) {
			await correctActionRecord(database, {
				actionRecordId,
				operation: 'delete',
				currentLocalDate: input.currentLocalDate,
				nowIso: input.nowIso,
				correctionId: input.submissionId,
			});
		} else if (input.localDate !== input.currentLocalDate) {
			throw new Error('ACTION_RECORD_NOT_TODAY');
		}
		return { operation: 'delete', actionRecordId };
	}

	const cards = database.tableFor<UserCard>('userCards');
	const templates = database.tableFor<CardTemplate>('cardTemplates');
	const card = await cards.get(input.userCardId);
	if (!card || card.status !== 'active') throw new Error('USER_CARD_NOT_AVAILABLE');
	const template = await templates.get(card.officialCardId);
	if (!template?.enabled) throw new Error('CARD_TEMPLATE_NOT_AVAILABLE');

	const displayValue = template.quantity.maxDecimalPlaces === 0
		? String(input.quantityBaseValue / template.quantity.basePerDisplayUnit)
		: formatQuantityFromBase(input.quantityBaseValue, template.quantity);
	const batch = await saveTodayOutcome(database, {
		localDate: input.localDate,
		currentLocalDate: input.currentLocalDate,
		nowIso: input.nowIso,
		submissionId: input.submissionId,
		confirmedOverLimit: true,
		actionRecordDetails: {
			[input.userCardId]: {
				entryMethod: input.entryMethod,
				plannedQuantityBaseValue: input.plannedQuantityBaseValue,
				carryInBaseValue: input.carryInBaseValue,
				carryOutBaseValue: input.plannedQuantityBaseValue === undefined
					? undefined
					: Math.max(0, input.plannedQuantityBaseValue - input.quantityBaseValue),
				durationSeconds: input.durationSeconds,
				averagePaceSecondsPerKm: input.averagePaceSecondsPerKm,
				averageHeartRateBpm: input.averageHeartRateBpm,
				note: input.note?.trim() || undefined,
			},
		},
	}, singleCardDraft(input, displayValue));
	try {
		await completeOutcomePlayback(database, batch.id, input.nowIso);
	} catch {
		// The action record and audit batch are already committed. Playback status
		// cleanup must not turn a successful user save into a reported failure.
	}
	return { operation: 'save', actionRecordId };
}

export function saveDailyHabitInApp(input: SaveDailyHabitInput): Promise<SaveDailyHabitResult> {
	return appLifecycleCoordinator.runCriticalOperation('save-outcome', () => saveDailyHabit(appDatabase, input));
}
