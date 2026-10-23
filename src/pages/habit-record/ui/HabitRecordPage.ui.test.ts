import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('HabitRecordPage R5.1 presentation', () => {
	it('uses the regular running page for past edits and saves with an explicit historical context', () => {
		const progress = readFileSync(new URL('../../progress/ui/ProgressPage.tsx', import.meta.url), 'utf8');
		const history = readFileSync(new URL('../../history/ui/HistoryPage.tsx', import.meta.url), 'utf8');
		const source = readFileSync(new URL('./HabitRecordPage.tsx', import.meta.url), 'utf8');
		expect(progress).toMatch(/record\.officialCardId === 'running'\)\)\s*\{\s*navigate\(APP_ROUTES\.habitRecord\(record\.userCardId, record\.localDate\)\)/);
		expect(history).toContain("record.officialCardId === 'running') { navigate(APP_ROUTES.habitRecord(record.userCardId, record.localDate))");
		expect(source).toContain("recordingContext: localDate < formatLocalDate(new Date()) ? (habit.recordedToday ? 'correction' : 'backfill') : 'today'");
		expect(source).toContain('`${APP_ROUTES.PROGRESS}?date=${localDate}`');
		expect(source).toContain("habit.officialCardId === 'running' && habit.recordedToday && localDate < formatLocalDate(new Date())");
		expect(source).toContain('await correctActionRecordInApp({ actionRecordId: `${habit.id}:${localDate}`, operation: \'update\'');
	});
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

	it('renders extra expense as a full-page reflection form instead of a bottom sheet', () => {
		const source = readFileSync(new URL('./HabitRecordPage.tsx', import.meta.url), 'utf8');
		const css = readFileSync(new URL('./HabitRecordPage.module.css', import.meta.url), 'utf8');

		expect(source).toContain("habit.officialCardId === 'extra-expense'");
		expect(source).toContain('styles.expensePage');
		expect(source).toContain('buildExpenseLineItem');
		expect(source).toContain('mergeExpenseLineItem');
		expect(source).toContain('styles.expenseSummaryPage');
		expect(source).toContain('styles.expenseEntryList');
		expect(source).toContain("searchParams.get('entry')");
		expect(css).toMatch(/\.expensePage\s*\{[^}]*min-height:\s*100dvh;/s);
		expect(css).not.toContain('expenseSheet');
	});
});
