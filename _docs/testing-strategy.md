# FIApp v1 — Testing Strategy

**Status:** Canonical  
**Purpose:** Define the testing layers, tooling, scope, and workflow for maintaining quality across the lifetime of FIApp v1.  
**Audience:** The developer working on this codebase (currently solo).

---

## Context and Goals

FIApp is expected to serve ~100 daily active users over several years. The product's core value lives in its business logic — practice caps, trial lifecycle, return counters, milestone idempotency, and routing state machine. A bug in any of these erodes user trust directly.

The testing strategy is designed to:
- Catch regressions in critical business logic before they reach production
- Keep the CI feedback loop fast enough not to slow down development
- Avoid over-engineering for a ~100 DAU product
- Scale gracefully as the codebase and user base grow

---

## The Three Layers

### Layer 1 — Unit Tests

**Tool:** Vitest  
**Runs:** GitHub Actions, on every push to a PR branch (pre-merge gate)  
**Run time:** Under 5 seconds  
**Blocks merge:** Yes

**What this layer tests:**  
Pure functions with no I/O. No database, no HTTP, no Next.js internals. These tests exist to verify that isolated logic is correct in isolation.

**Scope:**
- Assessment scoring (35 questions, 7 pillars, score calculation, focus pillar selection)
- `decideRoute` state machine — every combination of auth / assessment / practices states
- Milestone threshold boundaries (counter at N-1, N, N+1 for each milestone)
- Counter delta math — toggle logic (true→false, false→true, repeated calls)
- Practice suggestion ranking logic
- Plans and subscription tier rules

**What to mock:** Nothing. These are pure functions — no mocking needed.

**Edge cases that must be covered:**
- Assessment: all answers yes, all answers no, pillar score ties (focus pillar must be deterministic)
- `decideRoute`: unauthenticated, authenticated but no assessment, has assessment but no practices, has practices but no active, fully active
- Milestones: same threshold hit twice (idempotency), counter decrements back below threshold

**Current state:** Already reasonably covered. Gaps are in scoring edge cases, milestone boundaries, and the full `decideRoute` state matrix.

---

### Layer 2 — Integration Tests

**Tool:** Vitest + DynamoDB Local (Docker)  
**Runs:** GitHub Actions, on every push to a PR branch (pre-merge gate)  
**Run time:** 30–90 seconds  
**Blocks merge:** Yes

**What this layer tests:**  
API route handlers called directly (not over HTTP), against a real DynamoDB Local instance. This is the most important layer — it proves that business rules are enforced correctly when the database is involved.

**What to mock:** Only the auth layer. One thin function (`getSessionUser()` or equivalent) is mocked to return a hardcoded `{ userId: "test-user-123" }`. Everything else — DynamoDB, all business logic, date handling — is real.

**What NOT to mock:** DynamoDB. Mocking DynamoDB gives false safety. It cannot catch key naming bugs, wrong `ConditionExpression` syntax, schema drift, or attribute collisions. If DynamoDB is mocked, the integration tests are not meaningfully different from unit tests.

**Infrastructure:**

DynamoDB Local runs in Docker:
```
amazon/dynamodb-local:latest
Port: 8000
```

Each test file creates its own isolated tables using a unique prefix generated at startup:
```
TEST_<uuid>_FIAPP_MAIN
TEST_<uuid>_FIAPP_RETURNS
```

Tables are created in `beforeAll` and destroyed in `afterAll`. This allows test files to run in parallel without conflicts.

**Seed factory functions** (shared test utilities):
- `seedProfile(userId, overrides?)` — creates a PROFILE item with sensible defaults; accepts overrides for `subscriptionStatus`, `activePracticeIds`, `latestAssessmentId`, etc.
- `seedAssessment(userId)` — creates an `ASSESS#<id>` item and sets `PROFILE.latestAssessmentId`
- `seedActivePractice(userId, practiceId)` — pushes a practiceId onto `activePracticeIds`
- `seedReturn(userId, practiceId, date, didIt)` — writes a return item into FIAPP_RETURNS
- `seedTrial(userId, practiceId)` — creates a trial item with `status: active`

**What this layer must cover** (mapped from `testing-checklist.md`):

*Profile:*
- `GET /api/me` creates PROFILE if missing, with correct default fields
- `GET /api/me` is idempotent — calling twice does not overwrite, returns same data
- `PATCH /api/me` updates allowed fields, rejects unknown fields

*Assessment:*
- `POST /api/assessment` persists `ASSESS#<id>` item and updates `PROFILE.latestAssessmentId`
- `POST /api/assessment` returns correct scores and focusPillar
- `GET /api/assessment/latest` returns null when no assessment exists
- `GET /api/assessment/latest` returns the correct assessment when one exists

*Practice caps (LOCKED):*
- Free user can add 1 active practice
- Free user cannot add a second active practice (returns hard limit error)
- Free user can replace at cap (count stays at 1)
- Plus user can add up to 10 active practices
- Plus user cannot add an 11th practice (returns hard limit error, no partial mutation)
- Adding practice that results in count == 5 returns a soft warning but succeeds
- Adding practice that results in count == 7 returns a stronger warning but succeeds

*Pause / Resume (LOCKED):*
- Pause removes practiceId from `activePracticeIds`
- Pause does not delete the `UPRACTICE` history item
- Resume adds practiceId back if under cap
- Resume is rejected if at hard cap
- Resume triggers warning at 5 / 7 when applicable

*Trial lifecycle (LOCKED):*
- `startTrial` creates `TRIAL#<startedAt>#<practiceId>` item
- `startTrial` does NOT modify `activePracticeIds`
- `startTrial` succeeds even when Plus user is at cap=10 active
- `promoteTrial` adds to `activePracticeIds` if under cap
- `promoteTrial` is rejected if at cap (no partial mutation)
- `discardTrial` ends trial without touching `activePracticeIds`

*Returns (LOCKED):*
- `POST /api/return` with `didIt: true` creates return item with correct PK/SK
- Same date sent twice is updated in-place (upsert, no duplicates)
- Counter increments by +1 on first true
- `didIt: true` → `didIt: false` on same day decrements counter
- `didIt: false` → `didIt: true` on same day re-increments counter
- Logging a return for a trial practice updates counters (trials count toward milestones)

*Progress:*
- `GET /api/progress` returns `counters` and `milestones`
- Works correctly when user has zero activity (no crashes, empty arrays)
- Same milestone is not triggered twice for the same threshold (idempotency)
- Returns correct streak values (`currentStreak`, `longestStreak`)

*Suggestions:*
- `GET /api/practices/suggestions` returns exactly 3 suggestions
- Works with no assessment (fallback logic)
- Works with an assessment (pillar-aware logic)
- Each suggestion includes `practiceId`, `pillar`, `rationale`

*Auth guard:*
- All endpoints reject unauthenticated requests with a consistent error shape

**Current state:** This entire layer is missing. All existing API tests use mocked DynamoDB. Adding this layer is the highest-priority testing work.

---

### Layer 3 — End-to-End Tests

**Tool:** Playwright (Chromium)  
**Runs:** Manually, by the developer  
**Blocks merge:** No  
**Trigger:** Developer judgment — run before declaring a development cycle complete

**What this layer tests:**  
A real Chromium browser navigates the live app, simulating a real user. Pages load, buttons are clicked, forms are filled, navigation happens. This proves that all the layers — auth, API, DynamoDB, routing, UI — connect correctly together.

**What to mock:** Nothing. This layer is fully real.

**Running the tests:**

Playwright reads `baseURL` from an environment variable, so the same tests can be pointed at any environment:

```bash
# against local dev server (default)
npm run test:e2e

# against production
BASE_URL=https://yourapp.com npm run test:e2e

# against staging (when available)
BASE_URL=https://staging.yourapp.com npm run test:e2e
```

**Typical workflow:**  
After a series of PRs that form a meaningful feature or milestone, before declaring that development cycle done, run Layer 3 locally. Watch the browser run through the scenarios. Fix any failures. Then ship.

**Auth in E2E tests:**  
Each target environment (local, production, future staging) has its own Cognito user pool. A dedicated test account must exist in each pool. Playwright uses `storageState` to inject a pre-authenticated session so tests don't need to log in manually on every run. The session for each environment is saved once and reused.

**The 5 scenarios:**

| # | Scenario | What it proves |
|---|---|---|
| 1 | First-time journey | Full core loop works end-to-end: auth → assessment → results → add practice → today → log return → progress counter increments |
| 2 | Routing guard — no assessment | User with no assessment cannot reach `/today`; gets redirected to `/assessment` |
| 3 | Cap enforcement — free user | Free user adds 1 practice, attempts to add a second, is blocked |
| 4 | Trial lifecycle | Start trial → tap "Did it" on trial → counter increments on progress page |
| 5 | Return toggle | Log return, undo it, counter returns to previous value |

The existing unauthenticated smoke tests (redirects to `/auth`, auth page rendering) are retained as-is.

**What Layer 3 does NOT replace:**  
Layer 3 is not a substitute for Layers 1 and 2. It does not cover edge cases, boundary conditions, or error paths. It proves the happy path works end-to-end. Edge cases live in Layers 1 and 2.

---

## CI/CD Summary

| Layer | Trigger | Where it runs | Blocks merge |
|---|---|---|---|
| 1 — Unit | Every push to PR branch | GitHub Actions | Yes |
| 2 — Integration | Every push to PR branch | GitHub Actions | Yes |
| 3 — E2E | Developer judgment, pre-release | Local machine | No (manual gate) |

**GitHub Actions setup for Layers 1 + 2:**
- Single workflow file: `.github/workflows/test.yml`
- Jobs: `unit` and `integration` run in parallel
- `integration` job starts DynamoDB Local as a service container before running tests
- Both jobs must pass for the PR to be mergeable (branch protection rule on `main`)

**Amplify deployment:**  
Amplify auto-deploys on push to `main`. There is no automated trigger from Amplify back to GitHub for Layer 3. Layer 3 is run manually after deploy when the developer deems it necessary.

---

## What We Deliberately Do Not Test

- **DynamoDB SDK behavior** — AWS's responsibility
- **Next.js routing internals** — Framework's responsibility
- **Cognito authentication** — AWS's responsibility
- **Visual / pixel-perfect rendering** — wrong risk profile for this scale
- **Every UI component** — component tests are appropriate only for complex interactive components with non-trivial state (e.g. `DevSubscriptionToggle`), not stateless display components

---

## Mocking Philosophy

**Mock at the thinnest possible seam.**

The only thing worth mocking is the identity boundary — the function that extracts `userId` from a Cognito session. Everything inward from that (business logic, database, date math) should be real in integration tests.

Mocking DynamoDB is explicitly prohibited in Layer 2. If you find yourself wanting to mock DynamoDB in an integration test, that is a signal the test belongs in Layer 1 instead.

---

## Implementation Priority

When moving from strategy to implementation, follow this order:

1. **DynamoDB Local setup** — Docker Compose file + GitHub Actions service container config. This unblocks all of Layer 2.
2. **Auth mock seam** — extract `getSessionUser()` into a thin wrapper that can be `vi.mock`ed in integration tests without affecting production code.
3. **Seed factory utilities** — shared `seedProfile`, `seedAssessment`, `seedActivePractice`, `seedReturn`, `seedTrial` functions used across all integration test files.
4. **Integration: `/api/practice`** — caps, pause/resume, trial lifecycle. Highest blast radius if broken.
5. **Integration: `/api/return`** — toggle delta, trial returns counting toward milestones.
6. **Integration: `/api/me` + `/api/progress`** — profile idempotency, aggregation, milestone idempotency.
7. **Integration: `/api/assessment` + `/api/practices/suggestions`** — assessment persistence, suggestion contract.
8. **GitHub Actions workflow** — wire Layers 1 + 2 into CI with branch protection.
9. **E2E: authenticated scenarios** — add the 5 Layer 3 scenarios with session injection.
10. **Unit gaps** — assessment scoring edge cases, full `decideRoute` state matrix, milestone boundary conditions.

---

## Relationship to Canon Testing Checklist

`_docs/canon/testing-checklist.md` defines **what** must be tested (the invariants).  
This document defines **how** and **at what layer** each item is tested.

The two documents should be read together. Any new LOCKED invariant added to the canon docs should have a corresponding integration or unit test added before the implementing PR is merged.
