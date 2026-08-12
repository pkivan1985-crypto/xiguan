import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('HabitRecordPage R5.1 presentation', () => {
	it('keeps the running record compact without removing detailed metrics', () => {
		const source = readFileSync(new URL('./HabitRecordPage.tsx', import.meta.url), 'utf8');
		const css = readFileSync(new URL('./HabitRecordPage.module.css', import.meta.url), 'utf8');
		const zh = JSON.parse(readFileSync(
			new URL('../../../shared/lib/i18n/locales/zh.json', import.meta.url),
			'utf8',
		)) as { shell: { record: { running: Record<string, string> } } };

		expect(zh.shell.record.running.previousDistance).toBe('上次 {{value}} {{unit}}');
		expect(zh.shell.record.running.reuseDistance).toBe('一键沿用');
		expect(zh.shell.record.running.completionLocked).toBe('修改详情不会取消完成状态');
		expect(source).toContain('styles.runningPage');
		expect(source).toContain('styles.previousDistance');
		expect(source).toContain('styles.completionLock');
		expect(css).toMatch(/\.previousDistance\s*\{[^}]*min-height:\s*44px;/s);
		expect(css).toMatch(/\.runningSave\s*\{[^}]*min-height:\s*52px;/s);
	});
});
