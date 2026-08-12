# Running Check Action Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the running card's ambiguous minus/plus controls with one lockable check-in button while retaining the details entry.

**Architecture:** Keep the existing `TodayPage -> TodayHabitPanel -> onComplete -> saveDailyHabitInApp` data flow. Change only the quantity-with-details presentation branch in `HabitControl`; reuse the existing completed-state predicate and completion callback rather than adding new state or persistence behavior.

**Tech Stack:** React 19, TypeScript, CSS Modules, react-icons/pi, Vitest, Vite PWA

## Global Constraints

- The unfinished state is one gray outer circle with one plain check icon; no nested check-circle icon.
- The completed state uses the same outer circle in green and remains disabled.
- Keep the `详情` entry and all existing running detail fields.
- Editing details must not cancel an explicit completed check-in.
- Do not change the IndexedDB schema, route structure, version number, or deployment state.
- Preserve unrelated dirty-worktree files and never use `git add -A`.

---

### Task 1: Simplify the running-card controls

**Files:**
- Modify: `src/widgets/today-habit-panel/ui/TodayHabitPanel.test.tsx`
- Modify: `src/widgets/today-habit-panel/ui/TodayHabitPanel.tsx`
- Modify: `src/widgets/today-habit-panel/ui/TodayHabitPanel.module.css`
- Modify: `design-qa.md`

**Interfaces:**
- Consumes: `isCompleted(habit: DailyHabitView): boolean`, `onComplete(): void`, `onOpenDetails(): void`
- Produces: the existing quantity-with-details control group with a details button and one disabled-after-completion check-in button

- [x] **Step 1: Write the failing structural tests**

Replace the old quantity stepper expectation with unfinished and completed assertions:

```tsx
it('uses details and one plain check button for an unfinished quantity habit', () => {
  const html = renderPanel({
    renderedHabits: [{
      ...habits[0]!,
      quantityBaseValue: 0,
      displayValue: '0.00',
      recordedToday: false,
    }],
    openDetails: true,
  });

  expect(html).toContain('aria-label="查看跑步详情"');
  expect(html).toContain('aria-label="完成跑步"');
  expect(html).toContain('data-layout="detail-check"');
  expect(html).not.toContain('aria-label="减少跑步"');
  expect(html).not.toContain('aria-label="增加跑步"');
  expect(html).not.toContain('data-recorded="true"');
});

it('locks the same check button after the quantity habit is completed', () => {
  const html = renderPanel({ renderedHabits: [habits[0]!], openDetails: true });

  expect(html).toContain('aria-label="完成跑步"');
  expect(html).toMatch(/class="[^"]*checkAction[^"]*" disabled="" data-recorded="true"/);
  expect(html).not.toContain('aria-label="减少跑步"');
  expect(html).not.toContain('aria-label="增加跑步"');
});
```

Production mutation caught: restoring either step button, using a different control branch, or allowing the completed check button to remain enabled makes at least one test fail.

- [x] **Step 2: Run the focused test and verify RED**

Run:

```powershell
npm test -- src/widgets/today-habit-panel/ui/TodayHabitPanel.test.tsx
```

Expected: FAIL because the rendered branch still contains `data-layout="stepper"`, decrease/increase labels, and no `checkAction`.

- [x] **Step 3: Implement the minimal component change**

In `HabitControl`, replace the quantity-with-details stepper branch with:

```tsx
if (onOpenDetails && habit.trackingType === 'quantity') {
  return (
    <div className={styles.quantityActions} data-layout='detail-check'>
      <button
        type='button'
        className={styles.detailAction}
        disabled={pending}
        aria-label={t('shell.today.openDetails', { title: habit.title })}
        onClick={onOpenDetails}
      >
        <span>{t('shell.today.detailsAction')}</span>
      </button>
      <button
        type='button'
        className={styles.checkAction}
        disabled={pending || completed}
        data-recorded={completed || undefined}
        aria-label={t('shell.today.completeHabit', { title: habit.title })}
        onClick={completed ? undefined : onComplete}
      >
        <PiCheck aria-hidden='true' />
      </button>
    </div>
  );
}
```

Import `PiCheck` from `react-icons/pi` and remove `PiMinus` only if no other branch still uses it.

- [x] **Step 4: Implement the single-circle visual state**

Replace the stepper-specific CSS with a two-control layout:

```css
.quantityActions[data-layout='detail-check'] {
  grid-template-columns: minmax(42px, auto) 44px;
  gap: 10px;
  width: auto;
}

.quantityActions[data-layout='detail-check'] .detailAction {
  min-width: 42px;
  min-height: 44px;
  padding-inline: 6px;
  color: var(--accent-color);
  background: transparent;
}

.checkAction {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  padding: 0;
  color: var(--muted-color);
  background: transparent;
  border: 1px solid var(--border-color);
  border-radius: 50%;
}

.checkAction svg {
  width: 20px;
  height: 20px;
}

.checkAction[data-recorded='true'] {
  color: var(--background-color);
  background: var(--success-color);
  border-color: var(--success-color);
}
```

The outer button supplies the only circle; `PiCheck` supplies only the check mark.

- [x] **Step 5: Run focused tests and verify GREEN**

Run:

```powershell
npm test -- src/widgets/today-habit-panel/ui/TodayHabitPanel.test.tsx src/pages/today/ui/TodayPage.test.tsx
```

Expected: PASS.

- [x] **Step 6: Run the complete project gate**

Run:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\invoke-toolchain.ps1 npm run verify
```

Expected: all tests, TypeScript, ESLint, Stylelint, Vite/PWA build, and audits pass; only already-documented non-blocking warnings may remain.

- [x] **Step 7: Verify the selected visual target in the in-app browser**

At 390 × 844 CSS pixels, verify:

- the running row has `详情` plus one 44 × 44px gray outer circle with a plain check;
- no plus or minus control remains;
- completing the habit turns the same button green and disables it;
- editing details preserves completion;
- no horizontal overflow and no console errors.

Append the source image, final screenshot, viewport measurements, interaction evidence, and `final result: passed` to `design-qa.md`.

- [x] **Step 8: Record the local implementation checkpoint**

Account-switch note (2026-08-12): implementation, full verification, and browser QA are complete. The takeover agent reviewed the complete approved R5.1/R5.2 diff and recorded one coherent local implementation checkpoint without staging protected `index.html` or user-material directories. See `HANDOFF-20260812-037`.

Stage only the explicit files from this task:

```powershell
git add -- src/widgets/today-habit-panel/ui/TodayHabitPanel.test.tsx src/widgets/today-habit-panel/ui/TodayHabitPanel.tsx src/widgets/today-habit-panel/ui/TodayHabitPanel.module.css design-qa.md docs/superpowers/specs/2026-08-12-running-check-action-design.md docs/superpowers/plans/2026-08-12-running-check-action.md
git commit -m "fix: simplify running check-in control"
```

Do not push, publish, deploy, or stage unrelated files.
