import type { LanguageMap } from './types';
import en from './locales/en.json';
import ru from './locales/ru.json';
import zh from './locales/zh.json';
import { GB, RU, CN } from 'country-flag-icons/react/1x1';

export const resources = {
	en: { translation: en },
	ru: { translation: ru },
	zh: { translation: zh }
};

/* eslint-disable i18next/no-literal-string */
export const languageMap: LanguageMap = {
	en: { code: 'en', label: 'English', icon: GB },
	ru: { code: 'ru', label: 'Русский', icon: RU },
	zh: { code: 'zh', label: '中文简体', icon: CN }
}

export const SUPPORTED_LANGUAGES = Object.values(languageMap);