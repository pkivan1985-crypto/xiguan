/// <reference types="node" />

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const UI_FILES = [
	'src/app/App.tsx',
	'src/pages/home/ui/HomePage.tsx',
	'src/pages/today/ui/TodayPage.tsx',
	'src/pages/deck/ui/DeckPage.tsx',
	'src/pages/history/ui/HistoryPage.tsx',
	'src/pages/settings/ui/SettingsPage.tsx',
	'src/widgets/app-shell/ui/AppShell.tsx',
];

describe('data layer boundary', () => {
	it('keeps Dexie and repositories out of application UI files', () => {
		for (const file of UI_FILES) {
			const source = readFileSync(resolve(file), 'utf8');
			expect(source, file).not.toMatch(/(?:from ['"]dexie['"]|@shared\/lib\/db|\/repository\/)/);
		}
	});
});
