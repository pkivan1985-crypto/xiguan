import type { resources } from './config';
import type en from './locales/en.json';
import type { FlagComponent } from 'country-flag-icons/react/3x2';

export type TranslationSchema = typeof en;

export type AppLanguageCode = keyof typeof resources;

export interface LanguageOption {
	code: AppLanguageCode;
	label: string;
	icon: FlagComponent;
}

export type LanguageMap = Record<AppLanguageCode, LanguageOption>;