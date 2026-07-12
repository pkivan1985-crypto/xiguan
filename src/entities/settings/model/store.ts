import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { SettingsState } from './types';
import { settingsReducer } from './reducer';
import { createDexieSettingsStorage } from './dexieSettingsStorage';
import { STORAGE_KEYS } from '@shared/const';

/**
 * Settings store providing state and a dispatch function.
 */
export const useSettingsStore = create<SettingsState>()(
	persist(
		(set) => ({
			settings: {
				isAnimationsEnabled: true,
				calendarHighlightToday: true,
				calendarShowDayNames: true,
				calendarShowDayNumbers: true
			},

			settingsDispatch: (action) => set(
				(s) => ({ settings: settingsReducer(s.settings, action) })
			)
		}),
		{
			name: STORAGE_KEYS.SETTINGS,
			storage: createJSONStorage(() => createDexieSettingsStorage())
		}
	)
);
