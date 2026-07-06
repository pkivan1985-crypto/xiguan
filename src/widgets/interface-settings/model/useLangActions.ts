import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES } from '@shared/lib/i18n';
import { renderIcon } from '@shared/lib/react';
import { type DrawerAction } from '@shared/ui';

const iconStyles: CSSProperties = {
	width: '22px',
	height: '22px',
	borderRadius: '50%',
	overflow: 'hidden'
}

function useLangActions() {
	const { i18n } = useTranslation();

	const langActions: DrawerAction[] = SUPPORTED_LANGUAGES.map((lang) => ({
		icon: renderIcon(lang.icon, { style: iconStyles }),
		label: lang.label,
		indicator: { type: i18n.language === lang.code ? 'checkmark' : 'none' },
		onClick: () => i18n.changeLanguage(lang.code)
	}));

	return {
		langActions
	};
}

export default useLangActions;