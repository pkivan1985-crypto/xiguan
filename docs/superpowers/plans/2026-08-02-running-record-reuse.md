# Running Record Reuse Implementation Plan

**Goal:** Keep mobile inputs focused while typing, and make a new running record start from the latest actual distance with clear shortcuts for the previous value and today's plan.

**Architecture:** Extend the daily-habit read model with the latest prior effective action record. Pure helpers decide initial running values and format optional training details. Stable component identities prevent input remounting.

## Constraints

- Mobile-first PWA; no account, backend, cloud sync, analytics, or new runtime dependency.
- Existing selected-date records always take precedence.
- Scheduled days reuse the latest distance, then fall back to today's plan; rest days start blank.
- Previous optional metrics require an explicit reuse action; notes always start blank.
- Do not touch protected pre-existing worktree entries.
- Do not commit, push, version, release, or deploy without separate authorization.

## Tasks

- [x] Expose the nearest prior effective record in `DailyHabitView` and test it.
- [x] Add and test deterministic running-record defaults.
- [x] Keep input nodes stable and implement the approved compact running editor.
- [x] Update the English and Chinese source locales used by this interface.
- [x] Run targeted tests, full checks, build, and 430px mobile acceptance.
