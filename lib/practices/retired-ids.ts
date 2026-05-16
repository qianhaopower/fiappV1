// Registry of practice IDs that were once live but have since been retired or renamed.
//
// Why this exists: UPRACTICE# rows in DynamoDB are keyed by the practice ID at the
// time of writing. When we rename a practice, old rows survive in users' data with
// the *old* ID and (usually) status='active'. We tolerate them by filtering on
// `practicesById.has(up.practiceId)` everywhere we read UPRACTICE — they become
// inert ghosts.
//
// The hazard: if a *new* practice ID later collides with a retired one, those
// dormant ghost rows silently spring back to life. The new practice would
// inherit the old rows' status, firstStartedAt, returns history, milestone
// progress — every consumer would treat it as if the user had been doing
// the new practice for years. That is a data-correctness incident, not a
// minor UI bug.
//
// Procedure when renaming or removing a practice:
//   1. Add the OLD id to RETIRED_PRACTICE_IDS below.
//   2. The unit test in tests/unit/practices/retired-ids.test.ts will refuse
//      any current practice ID that overlaps this set.
//   3. Never delete entries from this list. It is append-only.

export const RETIRED_PRACTICE_IDS: ReadonlySet<string> = new Set([
  // 2026-05-16 — v2 content rewrite, commit 094fa55
  'dynamic-10-min-walk',
  'dynamic-active-choice',
  'dynamic-daylight-block',
  'dynamic-one-challenge',
  'dynamic-stretch-break',
  'emotional-3-breath-reset',
  'emotional-calm-routine',
  'emotional-journal-3-lines',
  'emotional-name-feeling',
  'emotional-trigger-note',
  'financial-24hr-rule',
  'financial-bill-list',
  'financial-expense-buffer',
  'financial-save-small',
  'financial-weekly-review',
  'information-decision-pause',
  'information-evening-review',
  'information-news-free-morning',
  'information-single-tab',
  'information-thinking-block',
  'nutrition-eat-without-screens',
  'nutrition-half-plate-check',
  'nutrition-no-processed-snack',
  'nutrition-vegetables-first',
  'nutrition-water-first',
  'relationship-daily-checkin',
  'relationship-device-free-meal',
  'relationship-express-gratitude',
  'relationship-one-deeper-question',
  'relationship-pause-before-reply',
  'sleep-bedroom-prep',
  'sleep-screen-off',
  'sleep-wind-down-ritual',
])
