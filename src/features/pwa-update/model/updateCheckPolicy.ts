export const AUTOMATIC_CHECK_MIN_INTERVAL_MS = 30_000;

export interface UpdateCheckInput {
	online: boolean;
	now: number;
	lastCheckedAt?: number;
	manual?: boolean;
}

export function shouldCheckForUpdate(input: UpdateCheckInput): boolean {
	if (!input.online) return false;
	if (input.manual) return true;
	return input.lastCheckedAt === undefined
		|| input.now - input.lastCheckedAt >= AUTOMATIC_CHECK_MIN_INTERVAL_MS;
}
