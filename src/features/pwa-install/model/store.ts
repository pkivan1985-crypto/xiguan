import { create } from 'zustand';

export interface BeforeInstallPromptEvent extends Event {
	userChoice: Promise<{
		outcome: 'accepted' | 'dismissed';
	}>;
	prompt: () => Promise<void>;
}

interface PwaStoreState {
	deferredPrompt: BeforeInstallPromptEvent | null;
	installed: boolean;
	setDeferredPrompt: (prompt: BeforeInstallPromptEvent | null) => void;
	setInstalled: (installed: boolean) => void;
}

/**
 * Global PWA installation manager.
 * Captures browser installation prompts on startup to enable custom installation triggers.
 */
export const usePwaStore = create<PwaStoreState>()(
	(set) => ({
		deferredPrompt: null,
		installed: false,
		setDeferredPrompt: (prompt) => set({ deferredPrompt: prompt }),
		setInstalled: (installed) => set(installed ? { installed, deferredPrompt: null } : { installed }),
	})
);

export const pwaStore = usePwaStore;
