/* eslint-disable i18next/no-literal-string -- Service Worker errors and build IDs are internal identifiers. */
import { type ReactNode, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import pkg from '../../../../package.json';
import { appLifecycleCoordinator } from '@shared/lib/app-lifecycle';
import { installPwaQaBridge } from '../lib/pwaQaBridge';
import { PwaUpdateContext } from './PwaUpdateContext';
import { createUpdateController, type UpdateController } from './updateController';

const APP_VERSION = pkg.version;
const BUILD_ID = import.meta.env.VITE_APP_BUILD_ID?.trim() || APP_VERSION;

export function PwaUpdateProvider({ children }: { children: ReactNode }) {
	const registrationRef = useRef<ServiceWorkerRegistration | undefined>(undefined);
	const controllerRef = useRef<UpdateController | null>(null);
	const {
		needRefresh: [needRefresh],
		offlineReady: [offlineReady],
		updateServiceWorker,
	} = useRegisterSW({
		onRegisteredSW(_swUrl, registration) {
			registrationRef.current = registration;
		},
		onRegisterError() {
			controllerRef.current?.markRegistrationFailed();
		},
	});
	if (!controllerRef.current) {
		controllerRef.current = createUpdateController({
			adapter: {
				check: async () => {
					if (!registrationRef.current) throw new Error('SERVICE_WORKER_NOT_REGISTERED');
					await registrationRef.current.update();
				},
				apply: () => updateServiceWorker(true),
			},
			coordinator: appLifecycleCoordinator,
			now: Date.now,
			isOnline: () => navigator.onLine,
		});
	}
	const controller = controllerRef.current;
	const [online, setOnline] = useState(() => navigator.onLine);
	const [dismissed, setDismissed] = useState(false);
	const state = useSyncExternalStore(controller.subscribe, controller.getState, controller.getState);

	useEffect(() => {
		if (!needRefresh) return;
		controller.markAvailable();
		setDismissed(false);
	}, [controller, needRefresh]);

	useEffect(() => {
		const handleOnline = () => {
			setOnline(true);
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
		BUILD_ID,
		APP_VERSION,
		appLifecycleCoordinator,
	), []);

	useEffect(() => () => controller.dispose(), [controller]);

	const value = useMemo(() => ({
		state,
		online,
		offlineReady,
		dismissed,
		currentVersion: APP_VERSION,
		buildId: BUILD_ID,
		checkForUpdate: () => controller.checkForUpdate(true),
		applyUpdate: () => controller.applyUpdate(),
		dismiss: () => setDismissed(true),
	}), [controller, dismissed, offlineReady, online, state]);

	return <PwaUpdateContext value={value}>{children}</PwaUpdateContext>;
}
