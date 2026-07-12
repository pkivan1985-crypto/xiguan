import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDialogStore } from '@shared/ui';
import { detectInstallState } from './installState';
import { runInstallPrompt } from './promptLifecycle';
import { usePwaStore } from './store';

function usePwaInstall() {
	// UI localization
	const { t } = useTranslation();

	// PWA installation state
	const deferredPrompt = usePwaStore((s) => s.deferredPrompt);
	const installed = usePwaStore((s) => s.installed);
	const setDeferredPrompt = usePwaStore((s) => s.setDeferredPrompt);
	const setInstalled = usePwaStore((s) => s.setInstalled);
	const [standalone, setStandalone] = useState(() => typeof window !== 'undefined'
		&& window.matchMedia('(display-mode: standalone)').matches);

	useEffect(() => {
		const media = window.matchMedia('(display-mode: standalone)');
		const handleModeChange = () => setStandalone(media.matches);
		const handleInstalled = () => setInstalled(true);
		media.addEventListener('change', handleModeChange);
		window.addEventListener('appinstalled', handleInstalled);
		return () => {
			media.removeEventListener('change', handleModeChange);
			window.removeEventListener('appinstalled', handleInstalled);
		};
	}, [setInstalled]);

	const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean };
	const state = detectInstallState({
		standalone: installed || standalone,
		iosStandalone: navigatorWithStandalone.standalone === true,
		userAgent: navigator.userAgent,
		platform: navigator.platform,
		maxTouchPoints: navigator.maxTouchPoints,
		hasPrompt: Boolean(deferredPrompt),
		supportsServiceWorker: 'serviceWorker' in navigator,
	});

	// Global stores
	const openDialog = useDialogStore((s) => s.open);

	/**
	 * Process PWA installation flow or trigger platform-specific instructions.
	 */
	const install = async (): Promise<void> => {
		if (state === 'INSTALLED') return;

		if (state === 'IOS_MANUAL') {
			openDialog({
				title: t('welcome.pwa.ios.title'),
				text: t('welcome.pwa.ios.steps')
			});
			return;
		}

		if (state === 'BROWSER_MENU' || state === 'UNAVAILABLE') {
			openDialog({
				title: t('welcome.pwa.chromeNudge.title'),
				text: t('welcome.pwa.chromeNudge.text')
			});
			return;
		}

		if (state === 'CAN_PROMPT' && deferredPrompt) {
			const outcome = await runInstallPrompt(deferredPrompt);
			setDeferredPrompt(null);
			if (outcome === 'accepted') setInstalled(true);
		}
	};

	return {
		state,
		install,
	};
}

export { usePwaInstall };
