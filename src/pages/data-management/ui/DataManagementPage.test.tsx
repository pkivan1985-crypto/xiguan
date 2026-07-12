import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { DataManagementPage } from './DataManagementPage';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@shared/ui', () => ({
	ShellSection: ({ title, children }: { title: string; children?: unknown }) => <section><h2>{title}</h2>{children as never}</section>,
	List: ({ title }: { title: string }) => <section>{title}</section>,
}));
vi.mock('@features/data-management/export-backup', () => ({ exportBackupInApp: vi.fn() }));
vi.mock('@features/data-management/inspect-backup', () => ({ inspectBackupFileInApp: vi.fn() }));
vi.mock('@features/data-management/restore-backup', () => ({ restoreBackupInApp: vi.fn() }));
vi.mock('@features/data-management/clear-user-data', () => ({ clearUserDataInApp: vi.fn() }));

describe('DataManagementPage', () => {
	it('presents local info, ordinary-first backup, restore, and a separate danger zone', () => {
		const html = renderToStaticMarkup(<DataManagementPage />);
		expect(html).toContain('shell.dataManagement.localTitle');
		expect(html).toContain('shell.dataManagement.exportPlain');
		expect(html).toContain('shell.dataManagement.exportEncrypted');
		expect(html).toContain('shell.dataManagement.restore.action');
		expect(html).toContain('shell.dataManagement.dangerTitle');
		expect(html).toContain('shell.dataManagement.clear.action');
	});
});
