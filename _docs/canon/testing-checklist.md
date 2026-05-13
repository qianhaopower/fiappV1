# docs/canon/testing-checklist.md
# FIApp v1 — Canonical Testing Checklist

> **PARTIALLY SUPERSEDED 2026-05-13 by [business-logic-v2.md](business-logic-v2.md).** The following sections enforce v1 invariants that are removed or changed in v2 and must be reworked in Cut 5 of the v2 refactor:
>
> - §1.3 Trial policy persistence — TRIAL items removed in v2.
> - §4 Pause / Resume — replaced by `active`/`inactive` lifecycle in v2.
> - §5 Trial lifecycle — entirely removed in v2.
> - §6.3 "Trials count toward counters/milestones" — gone in v2.
> - §8.2 "If no practices, Today redirects to Results" — direct conflict with v2's always-accessible /today.
> - §9 regression red flags entries for pause logic and trial counting — gone in v2.
>
> Still valid: §0 setup baseline, §1.1-1.2 PROFILE / returns shape, §2 API contract tests (updated against v2 endpoints), §3 caps & warnings (with 5/7 warnings now optional in v2), §6.1-6.2 return delta counters, §7 progress endpoint.

**Purpose:** Prevent design drift over ~160 hours of implementation.  
**Rule:** Every “LOCKED invariant” in canon docs should be enforced by at least one automated test.  
**Layers:** Unit → Integration (route handlers) → E2E smoke.

---

## 0) Test Setup Baseline (applies to all)
- Use a DynamoDB test strategy that supports:
  - isolated tables per test run OR table prefixing
  - deterministic cleanup
- All API tests run against route handlers with:
  - mocked auth context → stable `userId`
  - controlled “today” date in `Australia/Melbourne` timezone
- Enforce JSON response shape:
  - `ok`, `data`, `error` (or consistent equivalent)

---

## 1) DB Schema & Invariants (docs/canon/db-schema.md)

### 1.1 PROFILE creation
- [ ] `GET /api/me` creates PROFILE if missing
- [ ] PROFILE contains required fields with safe defaults:
  - `subscriptionStatus` default (FREE unless dev override)
  - `activePracticeIds` defaults to `[]`
  - `latestAssessmentId` defaults to `null`
- [ ] PROFILE creation is idempotent: calling `GET /api/me` twice returns same profile (no overwrite)
- **Manual verification:** Sign in → call `GET /api/me` twice → both return same `userId`, `subscriptionStatus`, `createdAt`; default fields present

### 1.2 Returns table shape
- [ ] `POST /api/return` writes to **FIAPP_RETURNS**:
  - PK: `USER#<id>#PRACTICE#<practiceId>`
  - SK: `DATE#YYYY-MM-DD`
- [ ] Same date is updated in-place (no duplicates)

### 1.3 Trial policy persistence
- [ ] `startTrial` creates `TRIAL#<startedAt>#<practiceId>` item
- [ ] Trial items include `expiresAt` and `status`
- [ ] Trial items never modify `activePracticeIds` during start/discard

---

## 2) API Contract Tests (docs/canon/api-contract.md)

### 2.1 Auth guard behavior (baseline)
- [ ] All endpoints reject unauthenticated requests with consistent error code
  - (except any explicitly public endpoint, if one exists)

### 2.2 Assessment contract
- [ ] `POST /api/assessment`:
  - persists an `ASSESS#<id>` item
  - updates PROFILE.latestAssessmentId
  - returns scores + focusPillar
- [ ] `GET /api/assessment/latest`:
  - returns `null` if none
  - returns latest assessment if present

### 2.3 Suggestions contract
- [ ] `GET /api/practices/suggestions` returns exactly 3 suggestions
- [ ] Works with and without assessment (fallback logic)
- [ ] Suggestions include `{practiceId, pillar, rationale}`

---

## 3) Caps & Warnings (LOCKED)

### 3.1 Free cap = 1
- [ ] Free user can `add` 1 active practice
- [ ] Free user cannot `add` a second active practice
  - returns hard error or requiresReplace response (whatever your contract defines)
- [ ] Free user can `replace` at cap successfully (count stays 1)

### 3.2 Plus plan cap = 10 (hard stop; internal `PAID`)
- [ ] Plus plan user can add up to 10 active practices
- [ ] Plus plan user adding 11th is rejected (hard stop)
  - ensure no data mutation occurred

### 3.3 Warnings at 5 and 7
- [ ] When adding results in count == 5:
  - response includes `warning` (soft)
- [ ] When adding results in count == 7:
  - response includes `warning` (strong)
- [ ] Warnings do not block successful add

---

## 4) Pause / Resume (Option 2) (LOCKED)

### 4.1 Pause removes from active list but preserves pointer
- [ ] Pausing an active practice:
  - removes practiceId from `activePracticeIds`
  - preserves mapping pointer so resume can locate history record
  - does not delete UPRACTICE history

### 4.2 Resume is cap-checked and warning-aware
- [ ] Resume adds it back if under cap
- [ ] Resume triggers warning at 5 / 7 when applicable
- [ ] Resume is rejected if at hard cap (Plus plan 10, Free plan 1)

---

## 5) Trial lifecycle (LOCKED distinctions)

### 5.1 Trials don’t consume cap
- [ ] With Plus plan user at cap=10 active, `startTrial` still succeeds
- [ ] Active count remains unchanged after `startTrial`

### 5.2 Promote trial consumes cap
- [ ] If under cap, `promoteTrial`:
  - adds to active list
  - marks TRIAL status promoted/ended
- [ ] If at cap, `promoteTrial` fails (or returns requiresReplace)
  - verify no partial mutation

### 5.3 Discard trial
- [ ] `discardTrial` ends trial without affecting active list

---

## 6) Returns & Delta Counters (LOCKED)

### 6.1 Create return
- [ ] `POST /api/return didIt=true` creates/updates return item
- [ ] Counter increments by +1 for first-time true

### 6.2 Toggle support (true → false)
- [ ] If day already `didIt=true`, sending `didIt=false`:
  - updates the item
  - decrements counters appropriately (undo)
- [ ] Same in reverse: false → true increments

### 6.3 Trials count toward counters/milestones
- [ ] Logging returns for a trial practice updates counters as normal

---

## 7) Progress endpoint

### 7.1 `/api/progress` aggregation
- [ ] Returns `counters` and `milestones`
- [ ] Works when user has zero activity (empty-state safe)
- [ ] Milestone triggers are idempotent:
  - same milestone is not triggered twice for the same threshold

---

## 8) Routing / State Machine E2E Smokes (docs/canon/state-machine.md)

Use Playwright/Cypress (or similar). Keep these short and stable.

### 8.1 First-time journey
- [ ] New user → Auth → Assessment → Results
- [ ] Start trial or add practice
- [ ] Lands in Active Practices
- [ ] Navigates to Today and logs a return
- [ ] Progress shows counters updated

### 8.2 Guard enforcement
- [ ] If no assessment, attempting to open Today redirects to Assessment
- [ ] If assessment exists but no practices, Today redirects to Results (or Active Practices per your guard) and cannot log returns

### 8.3 Cap cannot be bypassed
- [ ] Plus plan user at 10 active cannot add 11th via any UI path
- [ ] Free user cannot exceed 1 active

---

## 9) Regression “Red Flags” (add tests before refactors)
If any of these change, you must update canon docs intentionally:
- active practice caps (1 / 10)
- warning thresholds (5 / 7)
- trial counting rules (caps vs counters)
- pause logic pointer strategy
- deterministic routing prerequisites (auth → assessment → practices)

---

## 10) Minimum test suite to ship v1 safely
If time is tight, do at least:
- Integration tests for `/api/practice` (caps, pause/resume, trials promote)
- Integration tests for `/api/return` (toggle delta)
- 2 E2E smokes:
  - first-time journey
  - cap enforcement
