# Task 4 Report — Progress Screen

## Result

Task 4 is complete. The progress screen has been rebuilt against the approved reference while preserving the existing read models, month/date navigation, `?date=` deep links, and real interactions.

## Changes

- Rebuilt the progress page with the existing R4 visual shell:
  - compact header and settings action
  - calendar/goal segmented navigation
  - calendar with selected-day outcome details
  - real total-plan summaries
- Removed the former three statistics tiles.
- Updated the outcome calendar to use Pi icons and distinct selected, today, outcome, and future states.
- Updated goal summaries to show truthful long-term and stage-target progress from the existing read model.
- Added the required Chinese and English UI strings.
- Added and updated focused tests for the new hierarchy and retained interactions.
- No database/schema, backup format, route contract, deployment, or version changes were made.

## Verification

- Task 4 focused tests: 3 files, 7 tests passed.
- `loadHomeDashboard` / `loadHistory` regressions: 2 files, 11 tests passed.
- ESLint: passed with 0 errors; 10 pre-existing warnings remain outside Task 4.
- Stylelint: passed.
- TypeScript type-check: passed.
- Production build: passed.
  - Full test suite: 77 files, 292 tests passed.
  - Vite/PWA production assets generated successfully.
  - Existing large-chunk advisory remains non-blocking.
- `git diff --check`: passed.

## Visual Review and Follow-up

- The mobile shell and empty-state layout were checked at 390 × 844.
- Populated-data side-by-side visual acceptance remains assigned to Task 6; it is not a Task 4 implementation blocker.
- No publish or push was performed.

## Independent Review Fix

The Task 4 follow-up review was addressed with a test-first correction:

- RED evidence: 4 focused files ran 21 tests; 9 failed for the six reviewed defects before production changes.
- Month transitions now move the selected date and `?date=` together, preserve the day when possible, clamp to month-end, and refuse future-month selection.
- Progress tab state and date/deep-link generation are covered by pure-state tests; interaction remains reserved for Task 6 without adding a DOM test dependency.
- `HomeGoalSummary` now maps the real long-term and stage target fields directly from the existing goal entities.
- `GoalSummary` no longer infers targets from current values or ratios. Zero, completed, and over-target facts remain truthful.
- Long-term and stage progress are independent, labelled progressbars inside a non-progressbar group.
- Calendar weekday labels use `i18n.resolvedLanguage ?? i18n.language`.
- Calendar day cells retain their compact 33px visual size while the pseudo-element touch area is 44px high.
- The existing Home page SSR i18n test double was completed with the real `i18n` shape required by the shared calendar.

Follow-up verification:

- Task 4 focused tests: 4 files, 21 tests passed.
- `loadHomeDashboard` / `loadHistory`: 2 files, 12 tests passed.
- Home page SSR regression: 1 file, 4 tests passed.
- ESLint: passed with 0 errors; the same 10 pre-existing warnings remain.
- Stylelint and TypeScript type-check: passed.
- Production build: passed; 77 files and 300 tests passed.
- No schema, business calculation, backup format, route contract, version, publish, or push change was made.
