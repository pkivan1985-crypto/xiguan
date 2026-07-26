/* eslint-disable i18next/no-literal-string -- Returned values are translation keys and domain error identifiers. */
export type TodayErrorKey = 'shell.today.submitError' | 'shell.today.dateChanged' | 'shell.today.invalidValue' | 'shell.today.duplicateCard';

export interface TodaySaveQueueState {
	pendingIds: ReadonlySet<string>;
	saveErrorIds: ReadonlySet<string>;
}

export interface TodaySaveQueue {
	enqueue<T>(
		habitId: string,
		operation: () => Promise<T>,
	): Promise<T> | undefined;
}

export function createTodaySaveQueue(
	onStateChange: (state: TodaySaveQueueState) => void,
): TodaySaveQueue {
	const pendingIds = new Set<string>();
	const saveErrorIds = new Set<string>();
	let tail: Promise<void> = Promise.resolve();

	function emitState(): void {
		onStateChange({
			pendingIds: new Set(pendingIds),
			saveErrorIds: new Set(saveErrorIds),
		});
	}

	return {
		enqueue<T>(
			habitId: string,
			operation: () => Promise<T>,
		): Promise<T> | undefined {
			if (pendingIds.has(habitId)) return undefined;

			pendingIds.add(habitId);
			saveErrorIds.delete(habitId);
			emitState();

			const result = tail.then(operation);
			const trackedResult = result.then(
				(value) => {
					pendingIds.delete(habitId);
					emitState();
					return value;
				},
				(error: unknown) => {
					pendingIds.delete(habitId);
					saveErrorIds.add(habitId);
					emitState();
					throw error;
				},
			);
			tail = trackedResult.then(
				() => undefined,
				() => undefined,
			);
			return trackedResult;
		},
	};
}

export function todayErrorKey(error: unknown): TodayErrorKey {
	if (!(error instanceof Error)) return 'shell.today.submitError';
	if (error.message === 'TODAY_DRAFT_DATE_CHANGED') return 'shell.today.dateChanged';
	if (error.message === 'INVALID_QUANTITY') return 'shell.today.invalidValue';
	if (error.message === 'TODAY_DRAFT_CARD_DUPLICATED') return 'shell.today.duplicateCard';
	return 'shell.today.submitError';
}
