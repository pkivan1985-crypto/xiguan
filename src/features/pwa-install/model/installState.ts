export type InstallState = 'INSTALLED' | 'CAN_PROMPT' | 'IOS_MANUAL' | 'BROWSER_MENU' | 'UNAVAILABLE';

export interface InstallEnvironment {
	standalone: boolean;
	iosStandalone: boolean;
	userAgent: string;
	platform: string;
	maxTouchPoints: number;
	hasPrompt: boolean;
	supportsServiceWorker: boolean;
}

export function detectInstallState(environment: InstallEnvironment): InstallState {
	if (environment.standalone || environment.iosStandalone) return 'INSTALLED';
	if (environment.hasPrompt) return 'CAN_PROMPT';
	const iosDevice = /iPad|iPhone|iPod/.test(environment.userAgent)
		|| (environment.platform === 'MacIntel' && environment.maxTouchPoints > 1);
	if (iosDevice) return 'IOS_MANUAL';
	if (environment.supportsServiceWorker) return 'BROWSER_MENU';
	return 'UNAVAILABLE';
}
