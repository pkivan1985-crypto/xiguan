import { type ReactNode, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { appLifecycleCoordinator } from '@shared/lib/app-lifecycle';
import { APP_BUILD_ID, APP_VERSION } from '@shared/config';
import { installPwaQaBridge } from '../lib/pwaQaBridge';
import { PwaUpdateContext } from './PwaUpdateContext';
import { createUpdateController, type UpdateAdapter } from './updateController';

class RuntimeUpdateAdapter implements UpdateAdapter {
	private registration?: ServiceWorkerRegistration;
	private applyWorker: () => Promise<void> = async () => undefined;

	setRegistration(registration?: ServiceWorkerRegistration): void {
		this.registration = registration;
	}

	setApplyWorker(applyWorker: () => Promise<void>): void {
		this.applyWorker = applyWorker;
	}

	async check(): Promise<void> {
		if (!this.registration) throw new Error('SERVICE_WORKER_NOT_REGISTERED');
		await this.registration.update();
	}

	apply(): Promise<void> {
		return this.applyWorker();
	}
}

export function PwaUpdateProvider({ children }: { children: ReactNode }) {
	const [online, setOnline] = useState(() => navigator.onLine);
	const [dismissed, setDismissed] = useState(false);
	const [offlineNoticeDismissed, setOfflineNoticeDismissed] = useState(false);
	const [runtime] = useState(() => new RuntimeUpdateAdapter());
	const [controller] = useState(() => createUpdateController({
		adapter: runtime,
		coordinator: appLifecycleCoordinator,
		now: Date.now,
		isOnline: () => navigator.onLine,
	}));
	const {
		offlineReady: [offlineReady],
		updateServiceWorker,
	} = useRegisterSW({
		onRegisteredSW(_swUrl, registration) {
			runtime.setRegistration(registration);
		},
		onNeedRefresh() {
			controller.markAvailable();
			setDismissed(false);
		},
		onRegisterError() {
			controller.markRegistrationFailed();
		},
	});
	useEffect(() => {
		runtime.setApplyWorker(() => updateServiceWorker(true));
	}, [runtime, updateServiceWorker]);
	const state = useSyncExternalStore(controller.subscribe, controller.getState, controller.getState);

	useEffect(() => {
		const handleOnline = () => {
			setOnline(true);
			setOfflineNoticeDismissed(false);
			void controller.checkForUpdate();
		};
		const handleOffline = () => setOnline(false);
		const handleVisibility = () => {
			if (document.visibilityState === 'visible') void controller.checkForUpdate();
		};
		window.addEventListener('online', handleOnline);
		window.addEventListener('offline', handleOffline);
		document.addEventListener('visibilitychange', handleVisibility);
		return () => {
			window.removeEventListener('online', handleOnline);
			window.removeEventListener('offline', handleOffline);
			document.removeEventListener('visibilitychange', handleVisibility);
		};
	}, [controller]);

	useEffect(() => installPwaQaBridge(
		window as unknown as Record<string, unknown>,
		APP_BUILD_ID,
		APP_VERSION,
		appLifecycleCoordinator,
	), []);

	useEffect(() => () => controller.dispose(), [controller]);

	const value = useMemo(() => ({
		state,
		online,
		offlineReady,
		dismissed,
		offlineNoticeDismissed,
		currentVersion: APP_VERSION,
		buildId: APP_BUILD_ID,
		checkForUpdate: () => controller.checkForUpdate(true),
		applyUpdate: () => controller.applyUpdate(),
		dismiss: () => setDismissed(true),
		dismissOfflineNotice: () => setOfflineNoticeDismissed(true),
	}), [controller, dismissed, offlineNoticeDismissed, offlineReady, online, state]);

	return <PwaUpdateContext value={value}>{children}</PwaUpdateContext>;
}
