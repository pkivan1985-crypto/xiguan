import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { BackupExportSheet } from './BackupExportSheet';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

describe('BackupExportSheet', () => {
	it('renders two password fields, irrecoverable warning, and separated actions', () => {
		const html = renderToStaticMarkup(<BackupExportSheet busy={false} onSubmit={() => undefined} onClose={() => undefined} />);
		expect(html.match(/type="password"/g)).toHaveLength(2);
		expect(html).toContain('shell.dataManagement.encryption.passwordWarning');
		expect(html).toContain('common.cancel');
		expect(html).toContain('shell.dataManagement.exportEncrypted');
	});
});
