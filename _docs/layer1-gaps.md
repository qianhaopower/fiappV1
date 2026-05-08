# FIApp v1 — Layer 1 Unit Test Gaps

**Purpose:** Itemised list of missing unit tests, ready to implement.  
**Scope:** Pure functions in `lib/` only. No I/O, no database, no HTTP.  
**Priority:** HIGH = business logic that can silently break; MEDIUM = edge case of important rule; LOW = defensive/structural.

---

## Housekeeping — fix before adding new tests

### HK-1 · Duplicate scoring test file (LOW)

`tests/unit/assessmentScoring.test.ts` (root level) is an older, smaller subset of `tests/unit/assessment/scoring.test.ts`. It tests the same two functions with less coverage.

**Action:** Delete `tests/unit/assessmentScoring.test.ts`. All its cases are already covered by the `assessment/` version.

### HK-2 · Misleading `decideRoute` test description (LOW)

In `tests/unit/decideRoute.test.ts`, the first test is described as `"routes to /assessment when no assessment"` but the assertion is `expect(...).toBe("/onboarding")`. The description was written before the `/onboarding` route was added.

**Action:** Rename the `it()` description to `"routes to /onboarding when no assessment"`.

---

## Module: `lib/assessment/scoring.ts`

**File to add tests to:** `tests/unit/assessment/scoring.test.ts`

**Already covered:**
- One pillar all-yes, rest all-no → correct scores and total
- All-equal scores → tie-break picks first in `pillarOrder` (financial)
- Same input → deterministic output

**Gaps:**

### GAP-S1 · All answers YES (HIGH)
All 35 answers `true`. Every pillar should score 5. `totalScore` should be 35.
`pickFocusPillar` should return `"financial"` (all tied, picks first in `pillarOrder`).

### GAP-S2 · All answers NO (HIGH)
All 35 answers `false`. Every pillar should score 0. `totalScore` should be 0.
`pickFocusPillar` should return `"financial"` (all tied at 0).

### GAP-S3 · Two pillars tied for lowest — not all equal (HIGH)
Set two pillars to score 1, all others to score 3. `pickFocusPillar` should return whichever of the two tied pillars appears first in `pillarOrder`.
This proves tie-breaking uses `pillarOrder` position, not alphabetical or insertion order.

### GAP-S4 · Partial answers — missing question IDs (MEDIUM)
Pass an `answers` dict that only contains some question IDs (e.g., 10 out of 35). The missing ones should be treated as `false` (score 0). `computeScores` should not throw.

---

## Module: `lib/decideRoute.ts`

**File to add tests to:** `tests/unit/decideRoute.test.ts`

**Already covered:**
- No `latestAssessmentId` → `/onboarding`
- Has assessment, no practices, no trials → `/results`
- Has assessment, no practices, 1 trial, no focus → `/practices`
- Has assessment, no practices, 1 trial, has focus → `/today`
- Has assessment, has practices, no focus → `/practices`
- Has assessment, has practices, has focus → `/today`
- `undefined` / `null` `activePracticeIds` → `/results`
- Omitted `activeTrialCount` → `/results`

**Gaps:**

### GAP-D1 · Has both active practices AND active trials, with focus practice (MEDIUM)
`activePracticeIds: ["p1"]`, `activeTrialCount: 1`, `todayFocusPracticeId: "p1"` → should route to `/today`.
The current tests only combine trials-without-practices, never practices-and-trials together.

### GAP-D2 · Empty string `latestAssessmentId` (MEDIUM)
`latestAssessmentId: ""` → should route to `/onboarding`.
An empty string is falsy in JavaScript, so `!profile.latestAssessmentId` is `true`. This should behave identically to `null`, but is worth making explicit since DynamoDB could theoretically return an empty string.

---

## Module: `lib/milestones/milestones.ts`

**File to add tests to:** `tests/unit/milestones/milestones.test.ts`

**Already covered (`checkNewMilestones`):**
- delta=0 → empty
- delta negative → empty
- Total milestones at 1, 7, 30, 100
- Does not re-trigger total milestone already passed
- Practice milestones at 7, 30
- Does not trigger for a different practice
- Both total and practice simultaneously
- Multi-practice total crossing threshold

**Gaps:**

### GAP-M1 · `makeMilestoneSK` — both types (HIGH)
This function formats the DynamoDB SK for milestone items. It is used in the return route handler to check idempotency, and a wrong format means milestones trigger twice.

- `makeMilestoneSK('total', 7)` → `"MILESTONE#total#7"`
- `makeMilestoneSK('practice', 30, 'sleep-consistent-bedtime')` → `"MILESTONE#practice#sleep-consistent-bedtime#30"`

### GAP-M2 · `getMilestoneDef` — hit and miss (MEDIUM)
- Known type+threshold → returns the correct `MilestoneDef`
- Unknown threshold → returns `undefined`
- Wrong type → returns `undefined`

### GAP-M3 · `ALL_MILESTONE_DEFS` has exactly 6 entries (MEDIUM)
4 total milestones (1, 7, 30, 100) + 2 practice milestones (7, 30) = 6. This acts as a schema guard — if a new milestone is added without updating the constant, tests catch it.

### GAP-M4 · `checkNewMilestones` — delta > 1 (MEDIUM)
Pass `delta: 3` where the counter jumps from 5 to 8, crossing the threshold of 7. The milestone at 7 should still trigger because the code uses `>=` not `===`.

### GAP-M5 · `checkNewMilestones` — practice not yet in counters (MEDIUM)
Pass `updatedCounters: { 'other-practice': 5 }` with `practiceId: 'new-practice'` and `delta: 1`. The new practice is not in the counters dict. The function does `updatedCounters[practiceId] ?? 0`, so `newPracticeCount` = 0 and `oldPracticeCount` = -1. No practice milestone should trigger (count is 0, below all thresholds).

---

## Module: `lib/practices/trial.ts`

**File to add tests to:** `tests/unit/practices/trial.test.ts`

**Already covered:**
- `isTrialExpired`: future and past `expiresAt`
- `isTrialActive`: active, promoted, discarded, expired (by time)
- `getTrialDaysRemaining`: new trial (7), expired (0)
- `checkActiveCap`: FREE at 0, FREE at cap, PAID at 0, PAID at warn-low, PAID at warn-high, PAID at cap, undefined input
- `makeTrialSK`, `makeUPracticeSK` format

**Gaps:**

### GAP-T1 · `checkActiveCap` — PAID zones not fully tested (HIGH)

The current tests hit only the exact boundary values. The full zone coverage is:

| Count | Expected result |
|---|---|
| 4 | `{ allowed: true }` — no warning, below PAID_WARN_LOW |
| 6 | `{ allowed: true, warning: 'APPROACHING_CAP' }` — between low and high |
| 8 | `{ allowed: true, warning: 'APPROACHING_CAP', remaining: 2 }` — between high and cap |
| 9 | `{ allowed: true, warning: 'APPROACHING_CAP', remaining: 1 }` — one below cap |

The `remaining` field is currently not asserted in any test. It drives the "X spots left" UI message.

### GAP-T2 · `checkActiveCap` — case-insensitive subscription status (HIGH)
The source code does `subscriptionStatus?.toUpperCase() === 'PAID'`. This means `"paid"` and `"Paid"` should behave like `"PAID"`.

- `checkActiveCap('paid', 0)` → `{ allowed: true }` (treated as PAID)
- `checkActiveCap('free', FREE_CAP)` → `{ allowed: false }` (treated as FREE)

These are HIGH priority because DynamoDB could theoretically return a lowercase string if someone sets it manually during debugging, and the wrong case should not silently grant or deny access.

### GAP-T3 · `checkActiveCap` — null input (MEDIUM)
`checkActiveCap(null, 0)` → should default to FREE behaviour (allowed at 0). The source code handles this via optional chaining (`?.toUpperCase()`), so null is safe, but it's not tested.

### GAP-T4 · `getTrialDaysRemaining` — mid-trial (LOW)
A trial that's 3 days in should return approximately 4 days remaining. Verify the ceiling math works correctly for a mid-trial state (not just brand-new or expired extremes).

### GAP-T5 · Exported constants are correct values (LOW)
- `TRIAL_DURATION_DAYS` === 7
- `MAX_CONCURRENT_TRIALS` === 1
- `FREE_CAP` === 1
- `PAID_CAP` === 10
- `PAID_WARN_LOW` === 5
- `PAID_WARN_HIGH` === 7

These are import-and-assert tests. They act as a guard: if someone changes a constant accidentally, CI breaks immediately.

---

## Module: `lib/plans.ts`

**File to add tests to:** `tests/unit/plans.test.ts`

**Already covered:**
- `"FREE"` → "Free plan", "Free", `false`
- `"PAID"` → "Plus plan", "Plus", `true`

**Gaps:**

### GAP-P1 · Null and undefined inputs (HIGH)
- `isPlusPlan(null)` → `false`
- `isPlusPlan(undefined)` → `false`
- `getPlanLabel(null)` → `"Free plan"`
- `getPlanLabel(undefined)` → `"Free plan"`

These are HIGH because `subscriptionStatus` can be absent from a freshly created PROFILE, and the UI must not crash or show the wrong plan type.

### GAP-P2 · Lowercase inputs (MEDIUM)
- `isPlusPlan("paid")` → `true`
- `isPlusPlan("free")` → `false`
- `getPlanLabel("paid")` → `"Plus plan"`

### GAP-P3 · Empty string and unknown values (LOW)
- `isPlusPlan("")` → `false`
- `isPlusPlan("UNKNOWN")` → `false`
- `getPlanLabel("UNKNOWN")` → `"Free plan"`

---

## Module: `lib/returns/returns.ts`

**File to add tests to:** `tests/unit/returns/returns.test.ts`

**Already covered:** Very thorough. `computeDelta`, `applyDelta`, `computeStreaks`, `returnDayForUser` (including DST spring-forward), `dateRange`, `makeReturnPK`, `makeReturnSK`.

**Gaps:**

### GAP-R1 · `dateRange(1, date)` — single day (LOW)
`dateRange(1, '2026-01-15')` → `['2026-01-15']`. Only one entry, which is the end date itself.

### GAP-R2 · `dateRange(0, date)` — zero days (LOW)
`dateRange(0, '2026-01-15')` → `[]`. The loop runs zero iterations and returns an empty array. Verify it doesn't crash.

---

## Not worth testing

- `lib/utils.ts` — `cn()` is a Tailwind class merger from a third-party library. Not business logic.
- `lib/design/pillarColors.ts` — static lookup table, no logic.
- `lib/amplifyClient.ts`, `lib/apiClient.ts` — infrastructure wrappers, no pure logic.
- `lib/assessment/pillars.ts` — static constants, verified indirectly by scoring and question tests.
- `lib/practices/library.ts` — static data, verified indirectly by the suggestions test (3 per pillar).
- `lib/testAuthMock.ts` — test helper, not production logic.

---

## Summary table

| Gap ID | Module | Priority | What to add |
|---|---|---|---|
| HK-1 | assessmentScoring.test.ts | LOW | Delete duplicate file |
| HK-2 | decideRoute.test.ts | LOW | Fix misleading `it()` description |
| GAP-S1 | scoring.ts | HIGH | All-yes answers |
| GAP-S2 | scoring.ts | HIGH | All-no answers |
| GAP-S3 | scoring.ts | HIGH | Two-pillar tie, not all-equal |
| GAP-S4 | scoring.ts | MEDIUM | Partial answers dict |
| GAP-D1 | decideRoute.ts | MEDIUM | Practices + trials + focus → /today |
| GAP-D2 | decideRoute.ts | MEDIUM | Empty string assessmentId → /onboarding |
| GAP-M1 | milestones.ts | HIGH | `makeMilestoneSK` both types |
| GAP-M2 | milestones.ts | MEDIUM | `getMilestoneDef` hit and miss |
| GAP-M3 | milestones.ts | MEDIUM | `ALL_MILESTONE_DEFS` has 6 entries |
| GAP-M4 | milestones.ts | MEDIUM | `checkNewMilestones` delta > 1 |
| GAP-M5 | milestones.ts | MEDIUM | `checkNewMilestones` practice not in counters |
| GAP-T1 | trial.ts | HIGH | `checkActiveCap` full zone coverage + `remaining` field |
| GAP-T2 | trial.ts | HIGH | `checkActiveCap` case-insensitive status |
| GAP-T3 | trial.ts | MEDIUM | `checkActiveCap` null input |
| GAP-T4 | trial.ts | LOW | `getTrialDaysRemaining` mid-trial |
| GAP-T5 | trial.ts | LOW | Exported constants have correct values |
| GAP-P1 | plans.ts | HIGH | `isPlusPlan`/`getPlanLabel` with null/undefined |
| GAP-P2 | plans.ts | MEDIUM | Lowercase subscription status |
| GAP-P3 | plans.ts | LOW | Empty string and unknown values |
| GAP-R1 | returns.ts | LOW | `dateRange(1, date)` |
| GAP-R2 | returns.ts | LOW | `dateRange(0, date)` |

**HIGH priority gaps: 7** — implement these first.  
**MEDIUM priority gaps: 9** — implement in the same pass.  
**LOW priority gaps: 7** — implement last or skip if time-constrained.
