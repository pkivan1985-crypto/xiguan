import type { BeforeInstallPromptEvent } from './store';

export async function runInstallPrompt(event: BeforeInstallPromptEvent): Promise<'accepted' | 'dismissed'> {
	await event.prompt();
	return (await event.userChoice).outcome;
}
