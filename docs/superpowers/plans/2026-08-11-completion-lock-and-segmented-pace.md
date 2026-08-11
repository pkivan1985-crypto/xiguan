# Completion Lock and Segmented Pace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preserve an explicit completed check-in while editing record details, and replace punctuation-heavy pace entry with two numeric groups.

**Architecture:** Keep completion intent in the existing `ActionRecord.entryMethod` fact and preserve `completed` in both same-day saves and record corrections. Expose that fact through `DailyHabitView` so the Today UI can treat explicit completion independently from quantity. Add one shared controlled `SegmentedPaceInput` used by all three running-detail editors, while retaining the existing canonical `M:SS` string at their boundaries.

**Tech Stack:** React 19.2.7, TypeScript 6.0.3, Vite 8.1.4, Vitest 4.1.10, CSS Modules, IndexedDB/Dexie 4.4.4.

## Global Constraints

- Mobile-first PWA; no account, backend, cloud sync, native app, analytics, or new runtime dependency.
- An existing `entryMethod: completed` survives quantity and detail edits until the user explicitly cancels completion or deletes the record.
- Pace uses two numeric groups with fixed `:` and `/km`; distance, duration, and heart rate keep normal numeric fields with fixed units.
- Existing action records, backup format, IndexedDB schema, quick values, and running-record defaults stay compatible.
- Inputs must retain focus while typing and expose visible labels and accessible group semantics.
- Do not touch or stage the pre-existing `index.html`, `.artifacts/`, `00-项目统筹/`, or `design-qa-artifacts/` entries.
- Do not push, tag, release, or deploy without separate user authorization.

---

## File Structure

- `src/features/save-daily-habit/model/saveDailyHabit.ts`: preserve explicit completion during same-day detail saves.
- `src/features/correct-action-record/model/correctActionRecord.ts`: preserve explicit completion during history/detail corrections.
- `src/features/load-daily-habits/model/loadDailyHabits.ts`: expose `entryMethod` and count explicit completion.
- `src/widgets/today-habit-panel/ui/TodayHabitPanel.tsx`: render explicit completion as locked even below the planned quantity.
- `src/shared/ui/segmented-pace-input/SegmentedPaceInput.tsx`: own digit sanitization, focus movement, and fixed punctuation/unit rendering.
- `src/shared/ui/segmented-pace-input/SegmentedPaceInput.module.css`: touch-sized grouped pace control.
- `src/shared/ui/segmented-pace-input/SegmentedPaceInput.test.tsx`: verify numeric filtering, canonical value emission, and formatting.
- `src/shared/ui/index.ts`: export the shared control.
- `src/pages/habit-record/ui/HabitRecordPage.tsx`: use grouped pace entry on the dedicated habit record page.
- `src/widgets/action-record-editor/ui/ActionRecordEditor.tsx`: use grouped pace entry when correcting a saved record.
- Corresponding CSS modules: fit the shared control into existing field grids without changing the visual theme.

---

### Task 1: Preserve Explicit Completion Through Detail Edits

**Files:**
- Modify: `src/features/save-daily-habit/model/saveDailyHabit.test.ts`
- Modify: `src/features/save-daily-habit/model/saveDailyHabit.ts`
- Modify: `src/features/correct-action-record/model/correctActionRecord.test.ts`
- Modify: `src/features/correct-action-record/model/correctActionRecord.ts`
- Modify: `src/features/load-daily-habits/model/loadDailyHabits.test.ts`
- Modify: `src/features/load-daily-habits/model/loadDailyHabits.ts`
- Modify: `src/widgets/today-habit-panel/ui/TodayHabitPanel.test.tsx`
- Modify: `src/widgets/today-habit-panel/ui/TodayHabitPanel.tsx`

**Interfaces:**
- Consumes: `ActionRecord.entryMethod?: 'completed' | 'actual' | 'adjustment'`.
- Produces: `DailyHabitView.entryMethod?: ActionRecord['entryMethod']` and completion rule `entryMethod === 'completed' || quantityBaseValue >= dailyTargetBase`.

- [ ] **Step 1: Write failing persistence tests**

Add a `saveDailyHabit` test that first saves the target with `entryMethod: 'completed'`, then saves a lower actual value plus details with `entryMethod: 'actual'`, and expects the stored method to remain completed:

```ts
expect(await database.table('actionRecords').get(`card-a:${LOCAL_DATE}`)).toMatchObject({
	quantityBaseValue: 3_000,
	entryMethod: 'completed',
	note: '补充训练详情',
});
```

Add a `correctActionRecord` test whose seed record has `entryMethod: 'completed'`, then update its quantity and training details and expect `entryMethod: 'completed'`. Keep the existing test proving ordinary records become `adjustment`.

- [ ] **Step 2: Run persistence tests and verify RED**

```powershell
npm test -- --run src/features/save-daily-habit/model/saveDailyHabit.test.ts src/features/correct-action-record/model/correctActionRecord.test.ts
```

Expected: both new assertions fail because the saved methods are currently `actual` and `adjustment`.

- [ ] **Step 3: Implement the minimum preservation rule**

In `saveDailyHabit`, resolve the method before `saveTodayOutcome`:

```ts
const entryMethod = existingRecord?.entryMethod === 'completed'
	&& input.entryMethod === 'actual'
	? 'completed'
	: input.entryMethod;
```

Use `entryMethod` in `actionRecordDetails`. In `correctActionRecord`, set:

```ts
entryMethod: record.entryMethod === 'completed' ? 'completed' : 'adjustment',
```

- [ ] **Step 4: Run persistence tests and verify GREEN**

Run the command from Step 2. Expected: all tests pass.

- [ ] **Step 5: Write failing read-model and UI tests**

Seed a below-target record with `entryMethod: 'completed'` in `loadDailyHabits.test.ts` and expect:

```ts
expect(result.habits[0]).toMatchObject({
	quantityBaseValue: 3_000,
	entryMethod: 'completed',
});
expect(result.completedCount).toBe(1);
```

Render that habit in `TodayHabitPanel.test.tsx` and expect the disabled “完成” state with `data-recorded="true"` even though `3_000 < 5_000`.

- [ ] **Step 6: Run read-model/UI tests and verify RED**

```powershell
npm test -- --run src/features/load-daily-habits/model/loadDailyHabits.test.ts src/widgets/today-habit-panel/ui/TodayHabitPanel.test.tsx
```

Expected: the read model lacks `entryMethod`, `completedCount` is zero, and the button is not locked.

- [ ] **Step 7: Expose and consume explicit completion**

Add to `DailyHabitView`:

```ts
entryMethod?: ActionRecord['entryMethod'];
```

Map `todayRecord?.entryMethod`, and use this completion rule in the read model and Today panel:

```ts
habit.entryMethod === 'completed'
	|| habit.quantityBaseValue >= habit.dailyTargetBase
```

The Today panel predicate must still require `scheduledToday`.

- [ ] **Step 8: Run read-model/UI tests and verify GREEN**

Run the command from Step 6. Expected: all tests pass.

- [ ] **Step 9: Commit Task 1**

```powershell
git add -- src/features/save-daily-habit/model/saveDailyHabit.ts src/features/save-daily-habit/model/saveDailyHabit.test.ts src/features/correct-action-record/model/correctActionRecord.ts src/features/correct-action-record/model/correctActionRecord.test.ts src/features/load-daily-habits/model/loadDailyHabits.ts src/features/load-daily-habits/model/loadDailyHabits.test.ts src/widgets/today-habit-panel/ui/TodayHabitPanel.tsx src/widgets/today-habit-panel/ui/TodayHabitPanel.test.tsx
git commit -m "fix: preserve completed check-ins while editing"
```

---

### Task 2: Add the Shared Segmented Pace Input

**Files:**
- Create: `src/shared/ui/segmented-pace-input/SegmentedPaceInput.tsx`
- Create: `src/shared/ui/segmented-pace-input/SegmentedPaceInput.module.css`
- Create: `src/shared/ui/segmented-pace-input/SegmentedPaceInput.test.tsx`
- Modify: `src/shared/ui/index.ts`

**Interfaces:**
- Produces: `SegmentedPaceInput({ value, onChange, disabled?, invalid?, label })`, where `value` and `onChange` use the existing canonical partial or complete `M:SS` string.
- Produces: `parsePaceSegments(value: string): { minutes: string; seconds: string }` for deterministic tests and rendering.

- [ ] **Step 1: Write failing helper and component tests**

Cover these cases:

```ts
expect(parsePaceSegments('06:30')).toEqual({ minutes: '06', seconds: '30' });
expect(parsePaceSegments('6:')).toEqual({ minutes: '6', seconds: '' });
```

Render the component, enter `a06` in minutes and `7b5` in seconds, and expect controlled emissions `06:` then `06:75`. Validation remains in the existing form parser, which rejects seconds above 59.

- [ ] **Step 2: Run the new test and verify RED**

```powershell
npm test -- --run src/shared/ui/segmented-pace-input/SegmentedPaceInput.test.tsx
```

Expected: FAIL because the component and helper do not exist.

- [ ] **Step 3: Implement the controlled segmented input**

Create a stable top-level component with two `type='text'`, `inputMode='numeric'`, `pattern='[0-9]*'`, and `maxLength={2}` inputs. Sanitize with:

```ts
const digits = value.replace(/\D/g, '').slice(0, 2);
```

Render fixed punctuation and unit:

```tsx
<div role='group' aria-label={label} data-invalid={invalid || undefined}>
	<input aria-label={`${label}分钟`} value={minutes} />
	<span aria-hidden='true'>:</span>
	<input aria-label={`${label}秒`} value={seconds} />
	<small aria-hidden='true'>/km</small>
</div>
```

After two minute digits, focus seconds. When seconds is empty and Backspace is pressed, focus minutes. Do not remount either input on state changes.

- [ ] **Step 4: Style for mobile touch and visual grouping**

Use the existing dark surface tokens. Each input must be at least 44px high, use tabular figures, have a visible focus ring, and visually read as one field. Do not change the app palette or surrounding card layout.

- [ ] **Step 5: Export and run the component tests GREEN**

Export from `src/shared/ui/index.ts`, rerun Step 2, and expect all tests to pass.

- [ ] **Step 6: Commit Task 2**

```powershell
git add -- src/shared/ui/segmented-pace-input src/shared/ui/index.ts
git commit -m "feat: add segmented pace input"
```

---

### Task 3: Integrate Grouped Pace Entry Everywhere

**Files:**
- Modify: `src/pages/habit-record/ui/HabitRecordPage.tsx`
- Modify: `src/pages/habit-record/ui/HabitRecordPage.module.css`
- Modify: `src/widgets/today-habit-panel/ui/TodayHabitPanel.tsx`
- Modify: `src/widgets/today-habit-panel/ui/TodayHabitPanel.module.css`
- Modify: `src/widgets/action-record-editor/ui/ActionRecordEditor.tsx`
- Modify: `src/widgets/action-record-editor/ui/ActionRecordEditor.module.css`
- Modify: `src/widgets/action-record-editor/ui/ActionRecordEditor.test.tsx`

**Interfaces:**
- Consumes: shared `SegmentedPaceInput` with canonical pace string.
- Preserves: existing `parsePaceText`, `paceSeconds`, `parsePace`, saved seconds-per-kilometre values, quick values, and optional-field semantics.

- [ ] **Step 1: Write failing integration assertions**

Update relevant static/component tests to expect two pace inputs, fixed `:` and `/km`, numeric input modes, and no editable `placeholder='06:30'` text field.

- [ ] **Step 2: Run integration tests and verify RED**

```powershell
npm test -- --run src/widgets/today-habit-panel/ui/TodayHabitPanel.test.tsx src/widgets/action-record-editor/ui/ActionRecordEditor.test.tsx
```

Expected: FAIL because existing editors still render one free-text pace input.

- [ ] **Step 3: Replace all free-text pace fields**

Import `SegmentedPaceInput` from `@shared/ui` and wire existing state:

```tsx
<SegmentedPaceInput
	label={t('shell.today.averagePace')}
	value={pace}
	onChange={(value) => {
		setPace(value);
		setInvalid(false);
	}}
/>
```

Use `paceText`/`setPaceText` in the history editor. Keep duration and heart-rate inputs unchanged with their fixed units.

- [ ] **Step 4: Adjust only surrounding layout selectors**

Let the shared pace group occupy the same grid cell as the old pace field. On narrow screens, keep the existing one-column collapse and prevent horizontal overflow at 360px.

- [ ] **Step 5: Run integration and record-flow tests GREEN**

```powershell
npm test -- --run src/shared/ui/segmented-pace-input/SegmentedPaceInput.test.tsx src/widgets/today-habit-panel/ui/TodayHabitPanel.test.tsx src/widgets/action-record-editor/ui/ActionRecordEditor.test.tsx src/pages/habit-record/model/runningRecordDefaults.test.ts
```

Expected: all tests pass.

- [ ] **Step 6: Commit Task 3**

```powershell
git add -- src/pages/habit-record/ui/HabitRecordPage.tsx src/pages/habit-record/ui/HabitRecordPage.module.css src/widgets/today-habit-panel/ui/TodayHabitPanel.tsx src/widgets/today-habit-panel/ui/TodayHabitPanel.module.css src/widgets/action-record-editor/ui/ActionRecordEditor.tsx src/widgets/action-record-editor/ui/ActionRecordEditor.module.css src/widgets/action-record-editor/ui/ActionRecordEditor.test.tsx
git commit -m "feat: simplify running pace entry"
```

---

### Task 4: Full Verification and Mobile Acceptance

**Files:**
- Modify only if verification exposes an in-scope defect.

**Interfaces:**
- Consumes: completed-lock behavior and grouped pace control from Tasks 1-3.
- Produces: local verification evidence; no release artifact.

- [ ] **Step 1: Run focused regression tests**

```powershell
npm test -- --run src/features/save-daily-habit/model/saveDailyHabit.test.ts src/features/correct-action-record/model/correctActionRecord.test.ts src/features/load-daily-habits/model/loadDailyHabits.test.ts src/shared/ui/segmented-pace-input/SegmentedPaceInput.test.tsx src/widgets/today-habit-panel/ui/TodayHabitPanel.test.tsx src/widgets/action-record-editor/ui/ActionRecordEditor.test.tsx
```

- [ ] **Step 2: Run static and build checks**

```powershell
npm run type-check
npm run lint
npm run lint:css
npm run build
```

- [ ] **Step 3: Run mobile browser acceptance**

At 360px and 430px widths verify:

1. Tap completion, open details, lower the distance, edit every optional field, and save; the Today button remains “完成” and locked.
2. Enter `06` then `30`; focus advances, the keyboard stays open, and the UI displays `06:30 /km`.
3. Enter seconds `75`; save is rejected near the form without losing input.
4. Reopen and use “沿用上次”; both grouped values populate correctly.
5. Correct a historical completed record; completion intent remains stored.

- [ ] **Step 4: Inspect scope and record status**

```powershell
git status --short
git diff --check
git log -5 --oneline
```

Confirm protected pre-existing entries are untouched. Do not push or release.

## Plan Self-Review

- Spec coverage: completion preservation covers same-day save, history correction, read model, Today rendering, and cancellation/deletion boundaries; grouped pace covers every editable running-detail surface.
- Placeholder scan: no `TBD`, `TODO`, deferred implementation, or unspecified error behavior remains.
- Type consistency: every integration consumes the same canonical `M:SS` value and `SegmentedPaceInput` interface; storage remains integer seconds per kilometre.
