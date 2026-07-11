/* eslint-disable i18next/no-literal-string -- Dexie transaction mode is a persistence identifier. */
import type { RepeatOutcomeDatabase } from '@shared/lib/db';
import type { CategoryDefinition } from '@entities/category';

import { SYSTEM_CARD_TEMPLATES, SYSTEM_CATEGORIES } from './systemDefinitions';
import type { CardTemplate } from './types';

export function seedSystemDefinitions(database: RepeatOutcomeDatabase): Promise<void> {
	const categories = database.tableFor<CategoryDefinition>('categoryDefinitions');
	const templates = database.tableFor<CardTemplate>('cardTemplates');
	return database.transaction('rw', categories, templates, async () => {
		await categories.bulkPut([...SYSTEM_CATEGORIES]);
		await templates.bulkPut([...SYSTEM_CARD_TEMPLATES]);
	});
}
