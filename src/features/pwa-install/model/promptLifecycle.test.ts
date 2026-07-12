import { describe, expect, it, vi } from 'vitest';
import type { BeforeInstallPromptEvent } from './store';
import { runInstallPrompt } from './promptLifecycle';

function promptEvent(outcome: 'accepted' | 'dismissed'): BeforeInstallPromptEvent {
	return {
		prompt: vi.fn(async () => undefined),
		userChoice: Promise.resolve({ outcome }),
	} as unknown as BeforeInstallPromptEvent;
}

describe('runInstallPrompt', () => {
	it.each(['accepted', 'dismissed'] as const)('returns %s after prompting once', async (outcome) => {
		const event = promptEvent(outcome);
		await expect(runInstallPrompt(event)).resolves.toBe(outcome);
		expect(event.prompt).toHaveBeenCalledOnce();
	});
});
