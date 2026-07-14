import { describe, expect, it } from 'vitest';
import { detectInstallState, isIosDevice, type InstallEnvironment } from './installState';

const base: InstallEnvironment = {
	standalone: false,
	iosStandalone: false,
	userAgent: 'Mozilla/5.0 Chrome/140',
	platform: 'Win32',
	maxTouchPoints: 0,
	hasPrompt: false,
	supportsServiceWorker: true,
};

describe('detectInstallState', () => {
	it('gives installed state precedence over every prompt signal', () => {
		expect(detectInstallState({ ...base, standalone: true, hasPrompt: true })).toBe('INSTALLED');
		expect(detectInstallState({ ...base, iosStandalone: true })).toBe('INSTALLED');
	});

	it('reports a captured programmable prompt', () => {
		expect(detectInstallState({ ...base, hasPrompt: true })).toBe('CAN_PROMPT');
	});

	it('recognizes iPhone and desktop-UA iPadOS', () => {
		expect(detectInstallState({ ...base, userAgent: 'Mozilla/5.0 (iPhone)' })).toBe('IOS_MANUAL');
		expect(detectInstallState({ ...base, platform: 'MacIntel', maxTouchPoints: 5 })).toBe('IOS_MANUAL');
		expect(isIosDevice({ ...base, userAgent: 'Mozilla/5.0 (iPhone)' })).toBe(true);
		expect(isIosDevice({ ...base, platform: 'MacIntel', maxTouchPoints: 5 })).toBe(true);
		expect(isIosDevice(base)).toBe(false);
	});

	it('falls back to browser-menu or unavailable without overstating support', () => {
		expect(detectInstallState(base)).toBe('BROWSER_MENU');
		expect(detectInstallState({ ...base, supportsServiceWorker: false })).toBe('UNAVAILABLE');
	});
});
