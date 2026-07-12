/// <reference types="node" />

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const GUARDED_ENTRY_POINTS = [
	['src/features/create-running-card/model/createRunningCard.ts', 'create-card', 'createRunningCardInApp'],
	['src/features/save-today-outcome/model/saveTodayOutcome.ts', 'save-outcome', 'saveTodayOutcomeInApp'],
	['src/features/correct-action-record/model/correctActionRecord.ts', 'correct-record', 'correctActionRecordInApp'],
	['src/features/data-management/restore-backup/model/restoreBackup.ts', 'restore-backup', 'restoreBackupInApp'],
	['src/features/data-management/clear-user-data/model/clearUserData.ts', 'clear-data', 'clearUserDataInApp'],
] as const;

describe('critical operation boundary', () => {
	it('guards every reload-sensitive in-app write entry point', () => {
		for (const [file, kind, functionName] of GUARDED_ENTRY_POINTS) {
			const source = readFileSync(resolve(file), 'utf8');
			const wrapper = source.slice(source.indexOf(`export function ${functionName}`));
			expect(wrapper, file).toContain(`runCriticalOperation('${kind}'`);
		}
	});

	it('keeps the coordinator out of injected-database transaction functions', () => {
		for (const [file, , functionName] of GUARDED_ENTRY_POINTS) {
			const source = readFileSync(resolve(file), 'utf8');
			const wrapperStart = source.indexOf(`export function ${functionName}`);
			expect(source.slice(0, wrapperStart), file).not.toContain('runCriticalOperation(');
		}
	});
});
