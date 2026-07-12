import { createContext, useContext } from 'react';
import type { UpdateState } from './types';

export interface PwaUpdateContextValue {
	state: UpdateState;
	online: boolean;
	offlineReady: boolean;
	dismissed: boolean;
	currentVersion: string;
	buildId: string;
	checkForUpdate(): Promise<void>;
	applyUpdate(): Promise<void>;
	dismiss(): void;
}

export const PwaUpdateContext = createContext<PwaUpdateContextValue | null>(null);

export function usePwaUpdate(): PwaUpdateContextValue {
	const value = useContext(PwaUpdateContext);
	if (!value) throw new Error('PWA_UPDATE_PROVIDER_MISSING');
	return value;
}
