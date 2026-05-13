# docs/canon/testing-checklist.md
# FIApp v1 — Canonical Testing Checklist (v2 invariants)

**Purpose:** Prevent design drift over the remaining v1 implementation. Every locked v2 invariant should be enforced by at least one automated test.
**Rule:** Test layers do not overlap unnecessarily. Unit tests cover pure logic, integration tests cover route handlers + DynamoDB, E2E covers the UI shell.
**Layers:** Unit → Integration (route handlers, dynalite) → E2E smoke (Playwright).

Last revised: 2026-05-13 (v2 business-logic refactor). Canonical spec: [business-logic-v2.md](business-logic-v2.md).

---

## 0) Test Setup Baseline (applies to all)
- DynamoDB strategy must support:
  - isolated tables per test run OR table prefixing
  - deterministic cleanup
- All API tests run against route handlers with:
  - mocked auth context → stable `userId`
  - controlled "today" date in `Australia/Melbourne` timezone
- E2E safety guard (`tests/e2e/global-setup.ts`) refuses to run against non-local environments unless `E2E_EMAIL=qianhaopower+e2etest@gmail.com`.

---

## 1) Storage shape & DB invariants

### 1.1 PROFILE creation
- [ ] `GET /api/me` creates PROFILE if missing
- [ ] PROFILE contains required fields with safe defaults: `subscriptionStatus` (FREE), `activePracticeIds` (`[]`), `latestAssessmentId` (`null`), `lowestPillarId` (`null`), `returnCounters` (`{}`), `milestonesAchieved` (`[]`)
- [ ] PROFILE response **does not include** dead v1 fields: `activePracticeSkById`, `practiceCounters`, `todayFocusPracticeId`, `activeTrialCount`
- [ ] PROFILE creation is idempotent: two `GET /api/me` calls return the same `userId`/`createdAt`

### 1.2 UPRACTICE shape (v2)
- [ ] `startPractice` writes `UPRACTICE#<practiceId>` (no `<startedAt>` prefix — one record per `userId+practiceId`)
- [ ] New records have `status: "active"`, `firstStartedAt`, `lastActivatedAt`
- [ ] `makePracticeInactive` sets `status: "inactive"` and `lastInactivatedAt`
- [ ] Reactivation (`startPractice` on an `inactive` record) **preserves** `firstStartedAt` and updates `lastActivatedAt`
- [ ] Legacy status values (`"paused"`, `"replaced"`) are read leniently — `startPractice` treats them as reactivatable; `/api/practices/active` surfaces them as `inactive`

### 1.3 Returns table shape
- [ ] `POST /api/return` writes to `FIAPP_RETURNS` with `PK USER#<id>#PRACTICE#<id>` + `SK DATE#YYYY-MM-DD`
- [ ] Same `(practiceId, date)` is updated in place — no duplicates
- [ ] DailyReturn rows are preserved across lifecycle transitions (active → inactive → active)

### 1.4 ASSESS shape (v2)
- [ ] `POST /api/assessment` writes `ASSESS#<id>` with `pillarScores`, `lowestPillarId`, `suggestedPracticeIds[]` (length 3), `focusPillar` (legacy alias)
- [ ] PROFILE update sets both `latestAssessmentId` and `lowestPillarId`

### 1.5 TRIAL items (gone in v2)
- [ ] `/api/practice` no longer writes `TRIAL#` items in any mode
- [ ] `/api/me` does not query the `TRIAL#` partition
- [ ] `/api/return` does not query the `TRIAL#` partition
- [ ] Stale `TRIAL#` items in storage do not affect any read response

---

## 2) API contract tests

### 2.1 Auth guard baseline
- [ ] All endpoints reject unauthenticated requests with `401`

### 2.2 Assessment contract
- [ ] `POST /api/assessment` returns `{ assessmentId, focusPillar, lowestPillarId, scoresByPillar, suggestedPracticeIds }`
- [ ] `suggestedPracticeIds.length === 3`; all IDs are real practices in the library
- [ ] `lowestPillarId === focusPillar` (legacy alias parity)
- [ ] `GET /api/assessment/latest` returns the persisted item including `suggestedPracticeIds` or `null` if none

### 2.3 Suggestions contract
- [ ] `GET /api/practices/suggestions` hydrates the persisted `suggestedPracticeIds` into full `Practice[]` records
- [ ] Falls back to the static pillar-pick when an `ASSESS` record exists without `suggestedPracticeIds` (legacy)
- [ ] Falls back to the static fallback when no `ASSESS` record exists at all
- [ ] All returned `Practice` records include `mappedQuestionId` (v2 field)

### 2.4 Practice lifecycle modes (`POST /api/practice`)
- [ ] **`startPractice`** creates a new UPRACTICE (status active) when none exists
- [ ] **`startPractice`** reactivates an inactive (or legacy paused/replaced) UPRACTICE
- [ ] **`startPractice`** on an already-active UPRACTICE returns `200 { alreadyActive: true }` and writes nothing
- [ ] **`reactivatePractice`** behaves identically to `startPractice` (alias)
- [ ] **`makePracticeInactive`** flips an active UPRACTICE to inactive; returns `409 PRACTICE_NOT_ACTIVE` otherwise
- [ ] **`switchToPractice`** atomically deactivates `deactivatePracticeId` and activates `practiceId`; returns `400 SAME_PRACTICE` if the two IDs match; returns `409 DEACTIVATE_PRACTICE_NOT_ACTIVE` if the target-to-deactivate isn't currently active
- [ ] All other modes (legacy `add`, `replace`, `pause`, `resume`, `setFocus`, `startTrial`, `promoteTrial`, `discardTrial`) return `400 Unknown mode`

### 2.5 Return logging
- [ ] `POST /api/return` rejects with `409 PRACTICE_NOT_ACTIVE` when `practiceId` is not in `activePracticeIds`
- [ ] Toggling `didIt` true → false → true updates counters by ±1 each time (delta-based, no double-counting same date)
- [ ] Milestone triggers are idempotent (same milestone is not emitted twice)

---

## 3) Caps & switch flow

### 3.1 Free cap = 1
- [ ] Free user can `startPractice` when 0 active
- [ ] Free user at cap (1 active) → `startPractice` on a *different* practice returns `409 CAP_REACHED { cap: 1 }`
- [ ] **Switch flow:** `switchToPractice` with the active practice as `deactivatePracticeId` succeeds; old practice becomes inactive, new one active

### 3.2 Paid cap = 10
- [ ] Paid user can `startPractice` up to 10 active
- [ ] Paid user adding 11th returns `409 CAP_REACHED { cap: 10 }`
- [ ] **No 5+/7+ soft warnings** appear in the response — `warning` field is `undefined` regardless of active count

### 3.3 `checkActiveCap` helper
- [ ] Returns `{ allowed: true }` below cap
- [ ] Returns `{ allowed: false, reason: 'CAP_REACHED', cap }` at cap
- [ ] Lowercase `"paid"` is treated as PAID; lowercase `"free"` as FREE; `null`/`undefined` defaults to FREE

---

## 4) Question ↔ practice mapping (v2 invariant)

- [ ] Exactly **35 questions** and **35 practices** in the library
- [ ] Exactly **5 of each per pillar** across all 7 pillars
- [ ] Every `Practice.mappedQuestionId` resolves to a real question, and that question's `mappedPracticeId` points back (bidirectional)
- [ ] Mapping is 1-to-1 — no two practices share a `mappedQuestionId`, no two questions share a `mappedPracticeId`
- [ ] Mapped pairs always share the same pillar
- [ ] `order` field is `[1, 2, 3, 4, 5]` within every pillar for both questions and practices

---

## 5) Recommendation logic (deterministic)

- [ ] For a given assessment lowest pillar, `getSuggestedPractices(answers, lowestPillar)` returns 3 practices in a deterministic order
- [ ] `no`-answer questions rank weaker than `yes`-answer questions; their mapped practices are picked first
- [ ] Ties are broken by question `order` ascending
- [ ] If fewer than 3 `no` answers exist in the pillar, the list is padded with `yes`-answer practices from the same pillar (still in `order` ascending)
- [ ] Repeated calls with identical inputs return identical outputs (no randomness)

---

## 6) Returns & Delta Counters

### 6.1 Create return
- [ ] `POST /api/return didIt=true` creates/updates the return item and increments the counter for first-time true
- [ ] `POST /api/return didIt=false` creates the item but does not change counters (delta=0)

### 6.2 Toggle support
- [ ] `true → false` on a same-date record decrements the counter by 1
- [ ] `false → true` increments by 1
- [ ] No-op when value unchanged (returns `noop: true`)

### 6.3 Streak rule (v2)
- [ ] Streak = count of consecutive days ending today with `didIt=true`
- [ ] A gap in DailyReturn breaks the streak regardless of cause (skipped day OR paused practice)
- [ ] Reactivating a practice with no recent returns yields `streak = 0` until the user logs a day

---

## 7) Progress endpoint

- [ ] `GET /api/progress` returns `counters` + `milestones`
- [ ] Robust to a user with zero activity (empty-state safe)
- [ ] Milestone triggers are idempotent — same threshold is not emitted twice

---

## 8) Routing / State machine

Aligned to v2's `decideRoute` (`lib/decideRoute.ts`):

### 8.1 `decideRoute` invariants
- [ ] No `latestAssessmentId` → routes to `/onboarding`
- [ ] Empty-string `latestAssessmentId` → treated as no assessment
- [ ] Has `latestAssessmentId` → routes to `/today` regardless of active-practice count or focus state
- [ ] `ProfileForRouting` type does not depend on `activePracticeIds`, `activeTrialCount`, or `todayFocusPracticeId`

### 8.2 E2E smoke (Layer 3, `tests/e2e/authenticated.spec.ts`)
- [ ] **`/today` always loads** — even with 0 active practices, renders the empty state (never redirects to `/results` or `/practices`)
- [ ] **`/practices`** renders all 7 pillar headings and shows v2 CTAs (Start / Resume / View on Today + Pause); no v1 controls (Set focus, Replace, Promote, Discard, "Bring this back", "Make inactive", "Inactive" badge)
- [ ] **`/results`** has no `Try this practice` text anywhere; the radar chart renders (selector: `svg[viewBox="0 0 500 420"]`)

### 8.3 Cap cannot be bypassed
- [ ] Free user at 1 active cannot add another via any UI path — must use the switch flow
- [ ] Paid user at 10 active cannot add an 11th via any UI path

---

## 9) Regression "Red Flags" (v2)

If any of these change, canon docs must be updated intentionally:

- Active practice caps (Free=1, Paid=10)
- Soft cap warnings — currently **none** in v2; reintroducing them is a canon-level change
- Question count (35) and practice count (35); the 1:1 mapping invariant
- v2 UPRACTICE status enum (`active | inactive` only)
- Lenient legacy-status reads (`paused` / `replaced` → inactive on read)
- `decideRoute` shape: `(profile: { latestAssessmentId }) → "/onboarding" | "/today"`
- Free-user switch-flow atomicity (deactivate-then-activate)

---

## 10) Minimum test suite to ship safely

If time is tight, the irreducible coverage is:

**Unit (Layer 1):**
- `tests/unit/practices/mapping.test.ts` — 35/35 1:1 invariant
- `tests/unit/practices/suggestions.test.ts` — weakness-rank determinism
- `tests/unit/api/practice.post.test.ts` — 4-mode coverage + legacy lenient read

**Integration (Layer 2):**
- `tests/integration/api/practice.test.ts` — full lifecycle + switch flow
- `tests/integration/api/return.test.ts` — toggle + counter delta
- `tests/integration/api/assessment.test.ts` — `suggestedPracticeIds` persisted

**E2E (Layer 3):**
- `tests/e2e/smoke.spec.ts` — auth redirect invariants
- `tests/e2e/assessment.spec.ts` — 35-question flow + submit
- `tests/e2e/authenticated.spec.ts` — `/today` always-loads + `/practices` v2 CTAs + switch dialog

Run order in CI: `npm run test` (Layer 1) → `npm run test:integration` (Layer 2). Run Layer 3 against staging manually before promoting `staging → main`.
