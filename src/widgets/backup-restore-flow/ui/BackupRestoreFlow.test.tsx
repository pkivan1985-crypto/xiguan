import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { BackupRestoreFlow } from './BackupRestoreFlow';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string, values?: Record<string, unknown>) => `${key}${values ? JSON.stringify(values) : ''}` }) }));

describe('BackupRestoreFlow', () => {
	it('renders password entry without exposing backup contents', () => {
		const html = renderToStaticMarkup(<BackupRestoreFlow state={{ step: 'password' }} onPassword={() => undefined} onConfirm={() => undefined} onCancel={() => undefined} />);
		expect(html).toContain('type="password"');
		expect(html).toContain('shell.dataManagement.restore.passwordTitle');
	});

	it('renders a count-only replacement preview and separated confirmation', () => {
		const html = renderToStaticMarkup(<BackupRestoreFlow state={{ step: 'preview', preview: { userCards: 2, longTermGoals: 2, stageGoals: 1, goalRevisions: 0, todayDrafts: 1, actionRecords: 8, outcomeBatches: 4, settings: 1, exportedAt: '2026-07-12T02:00:00.000Z', appVersion: '0.50.0', encrypted: false } }} onPassword={() => undefined} onConfirm={() => undefined} onCancel={() => undefined} />);
		expect(html).toContain('shell.dataManagement.restore.replaceWarning');
		expect(html).toContain('shell.dataManagement.restore.cards');
		expect(html).toContain('shell.dataManagement.restore.confirm');
		expect(html).not.toContain('来源晨跑');
	});
});
