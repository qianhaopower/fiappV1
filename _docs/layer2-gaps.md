# FIApp v1 — Layer 2 Integration Test Gaps

**Purpose:** Full analysis of what needs to be built for Layer 2, ready to implement.  
**Scope:** API route handlers called directly against DynamoDB Local. No mocked DynamoDB.  
**Current state:** Zero integration tests exist. All existing API tests under `tests/unit/api/` mock DynamoDB with `aws-sdk-client-mock`.

---

## What Layer 2 Is Not

The existing `tests/unit/api/` tests are kept as-is. They efficiently cover:
- Auth rejection (401 paths)
- Invalid/missing request body
- Bad input validation (wrong types, missing fields)
- Error propagation (DynamoDB throws → handler returns 500)

Integration tests do not duplicate those. They add what mocked tests cannot provide: proof that the actual DynamoDB mutations, queries, and conditional writes behave correctly when a real database is involved.

---

## Infrastructure That Must Be Built First

This entire layer is blocked on infrastructure. Nothing can be written until items 1–4 are in place.

### INFRA-1 · DynamoDB Local via Docker Compose

Create `docker-compose.test.yml` in the repo root:

```yaml
services:
  dynamodb-local:
    image: amazon/dynamodb-local:latest
    command: "-jar DynamoDBLocal.jar -inMemory -sharedDb"
    ports:
      - "8000:8000"
```

Run before integration tests: `docker compose -f docker-compose.test.yml up -d`  
Stop after: `docker compose -f docker-compose.test.yml down`

The `-inMemory` flag means data resets on container restart. `-sharedDb` means all connections share the same data, which is what we want for tests creating tables in `beforeAll`.

### INFRA-2 · Separate Vitest Config for Integration Tests

The main `vitest.config.ts` excludes integration tests. A new `vitest.integration.config.ts`:

```ts
import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'node',        // not jsdom — these are server-side handlers
    globals: true,
    setupFiles: ['./tests/integration/setup.ts'],
    include: ['tests/integration/**/*.test.ts'],
    testTimeout: 15000,         // DynamoDB Local can be slow on cold start
    pool: 'forks',              // isolate each test file's process env
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './') },
  },
})
```

Add scripts to `package.json`:
```json
"test:integration": "vitest run --config vitest.integration.config.ts",
"test:all": "vitest run && vitest run --config vitest.integration.config.ts"
```

### INFRA-3 · Integration Test Setup File

`tests/integration/setup.ts` — runs once before all integration test files. Sets environment variables so the DynamoDB client points to local:

```ts
process.env.AWS_ENDPOINT_URL_DYNAMODB = 'http://localhost:8000'
process.env.FIAPP_AWS_ACCESS_KEY_ID = 'test'
process.env.FIAPP_AWS_SECRET_ACCESS_KEY = 'test'
process.env.AWS_REGION = 'ap-southeast-2'
```

The AWS SDK v3 picks up `AWS_ENDPOINT_URL_DYNAMODB` automatically — no changes to production code needed.

### INFRA-4 · Table Management Utilities

`tests/integration/tableUtils.ts` — creates and destroys DynamoDB Local tables per test file:

```ts
import { DynamoDBClient, CreateTableCommand, DeleteTableCommand } from '@aws-sdk/client-dynamodb'
import { randomUUID } from 'crypto'

export function makeTableNames() {
  const id = randomUUID().slice(0, 8)
  return {
    mainTable: `TEST_${id}_FIAPP_MAIN`,
    returnsTable: `TEST_${id}_FIAPP_RETURNS`,
  }
}

export async function createTables(client: DynamoDBClient, mainTable: string, returnsTable: string) {
  const schema = {
    KeySchema: [
      { AttributeName: 'PK', KeyType: 'HASH' },
      { AttributeName: 'SK', KeyType: 'RANGE' },
    ],
    AttributeDefinitions: [
      { AttributeName: 'PK', AttributeType: 'S' },
      { AttributeName: 'SK', AttributeType: 'S' },
    ],
    BillingMode: 'PAY_PER_REQUEST',
  }
  await Promise.all([
    client.send(new CreateTableCommand({ TableName: mainTable, ...schema })),
    client.send(new CreateTableCommand({ TableName: returnsTable, ...schema })),
  ])
}

export async function deleteTables(client: DynamoDBClient, mainTable: string, returnsTable: string) {
  await Promise.all([
    client.send(new DeleteTableCommand({ TableName: mainTable })),
    client.send(new DeleteTableCommand({ TableName: returnsTable })),
  ])
}
```

Each test file calls `makeTableNames()` in module scope, sets `process.env.FIAPP_MAIN_TABLE` and `process.env.FIAPP_RETURNS_TABLE` before each test, and creates/deletes tables in `beforeAll`/`afterAll`.

### INFRA-5 · Auth Mock Pattern

Every integration test file must mock `withAuth` to bypass Cognito. The auth mock replaces `withAuth` and calls the handler directly with a hardcoded test user:

```ts
vi.mock('@/utils/authServer', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/utils/authServer')>()
  return {
    ...actual,
    withAuth: vi.fn().mockImplementation(
      async (_req: Request | undefined, handler: (user: { userId: string }) => Promise<Response>) => {
        return handler({ userId: 'test-user-123' })
      }
    ),
  }
})
```

This is the correct seam: `withAuth` is what every route handler calls, and mocking it at the module level means the handler receives the test user without touching Cognito or cookies.

**Why not mock `getUserId` instead?** `getUserId` is defined and called in the same file as `withAuth`. Mocking the export doesn't intercept the internal call. `withAuth` is the right seam.

Also mock metrics so tests don't call external telemetry:
```ts
vi.mock('@/utils/metricsClient', () => ({ trackEvent: vi.fn(), trackPillarFocus: vi.fn() }))
```

### INFRA-6 · Seed Factory Functions

`tests/integration/seeds.ts` — shared utilities for setting up DynamoDB state before tests. Each factory takes a `DynamoDBDocumentClient` (or `DynamoClient`) and writes items directly:

```ts
export async function seedProfile(client: DynamoClient, userId: string, overrides = {})
// Writes a PROFILE item with safe defaults + overrides
// Accepts: subscriptionStatus, activePracticeIds, activePracticeSkById,
//          latestAssessmentId, focusPillar, returnCounters, todayFocusPracticeId

export async function seedAssessment(client: DynamoClient, userId: string, assessmentId: string, overrides = {})
// Writes an ASSESS# item and updates PROFILE.latestAssessmentId + focusPillar

export async function seedActivePractice(client: DynamoClient, userId: string, practiceId: string)
// Writes a UPRACTICE# item and appends to PROFILE.activePracticeIds + activePracticeSkById

export async function seedTrial(client: DynamoClient, userId: string, practiceId: string, overrides = {})
// Writes a TRIAL# item with status: 'trial', expiresAt in the future

export async function seedReturn(returnsClient: DynamoClient, userId: string, practiceId: string, date: string, didIt: boolean)
// Writes a return item to FIAPP_RETURNS table

export async function seedMilestone(client: DynamoClient, userId: string, type: string, threshold: number, practiceId?: string)
// Writes a MILESTONE# item (simulates a previously achieved milestone)
```

---

## Test Files to Build

Six test files, ordered by business risk.

---

### FILE-1 · `tests/integration/api/practice.test.ts`

**Why first:** Highest blast radius. Caps, trials, pause/resume — all business-critical rules live here. This is the route with the most complex state transitions.

**Setup per describe block:** fresh tables, seeded profile, `FIAPP_MAIN_TABLE` pointing to the test table.

#### mode = add

| Test | What to verify in DynamoDB |
|---|---|
| Adds practice for FREE user (first) | UPRACTICE# item exists; PROFILE.activePracticeIds = [practiceId] |
| FREE user blocked at cap=1 | Returns 409; PROFILE.activePracticeIds unchanged |
| PAID user adds up to 10 | After 10th add: PROFILE.activePracticeIds has 10 entries |
| PAID user blocked at cap=10 | Returns 409; count stays at 10 |
| Warns at count=5 (PAID) | Response contains warning; add still succeeds, UPRACTICE# written |
| Warns at count=7 (PAID) | Response contains warning; add still succeeds |
| Rejects unknown practiceId | Returns 404; no DB writes |
| Rejects already-active practiceId | Returns 409; no duplicate UPRACTICE# written |

#### mode = startTrial

| Test | What to verify |
|---|---|
| Creates TRIAL# item | Item exists with correct SK format, status=trial, expiresAt set |
| Does NOT touch activePracticeIds | PROFILE.activePracticeIds unchanged |
| Works when PAID user is at cap=10 | Trial created despite active count = 10 |
| Rejects practice already active | Returns 409 ALREADY_ACTIVE |
| Rejects practice already trialing | Returns 409 ALREADY_TRIALING |
| Rejects when at MAX_CONCURRENT_TRIALS (1) | Returns 409 TRIAL_LIMIT_REACHED |

#### mode = promoteTrial

| Test | What to verify |
|---|---|
| Adds to activePracticeIds | PROFILE.activePracticeIds includes practiceId |
| Marks TRIAL item as promoted | TRIAL# item has status=promoted, resolvedAt set |
| Creates UPRACTICE# item | Item exists with status=active |
| Cap-checked: blocked if at cap | Returns 409; PROFILE.activePracticeIds unchanged; TRIAL# still status=trial |
| Returns warning at 5/7 | warning in response; add succeeds |

#### mode = discardTrial

| Test | What to verify |
|---|---|
| Marks TRIAL item as discarded | TRIAL# item has status=discarded, resolvedAt set |
| Does NOT touch activePracticeIds | PROFILE unchanged |
| Rejects non-existent trial | Returns 404 |

#### mode = pause

| Test | What to verify |
|---|---|
| Removes from activePracticeIds | PROFILE.activePracticeIds no longer contains practiceId |
| UPRACTICE# item preserved | Item still exists with status=paused, pausedAt set |
| Rejects non-active practice | Returns 404 |

#### mode = resume

| Test | What to verify |
|---|---|
| Adds back to activePracticeIds | PROFILE.activePracticeIds includes practiceId again |
| UPRACTICE# item updated | Item has status=active, resumedAt set |
| Cap-checked: blocked if at cap | Returns 409; PROFILE unchanged |
| Warns at 5/7 | warning in response; resume succeeds |
| Rejects non-paused practice | Returns 404 |

#### mode = replace

| Test | What to verify |
|---|---|
| First call returns confirmToken | Response has confirmRequired=true, confirmToken |
| Second call with valid token executes swap | Old practiceId removed; new added; old UPRACTICE# has status=replaced |
| Invalid token returns 409 | PROFILE unchanged |

#### mode = setFocus

| Test | What to verify |
|---|---|
| Sets todayFocusPracticeId on PROFILE | PROFILE.todayFocusPracticeId = practiceId |
| Accepts active practice | 200 |
| Accepts active trial | 200 |
| Rejects non-active, non-trial practice | Returns 409 |

---

### FILE-2 · `tests/integration/api/return.test.ts`

**Why second:** Counter mutations and milestone idempotency are silent failure modes — wrong delta = wrong counters forever.

| Test | What to verify |
|---|---|
| Creates return item | FIAPP_RETURNS has item with correct PK (`USER#<id>#PRACTICE#<practiceId>`), SK (`DATE#YYYY-MM-DD`), didIt=true |
| Same date, same didIt → noop | Response has noop=true; FIAPP_RETURNS item updated but delta=0 |
| Same date, true → false → counter decrements | PROFILE.returnCounters[practiceId] goes from 1 to 0 |
| Same date, false → true → counter increments | PROFILE.returnCounters[practiceId] goes from 0 to 1 |
| Upsert — second write same date overwrites | No duplicate items; only one item per PK+SK |
| Returns for trial practice — counters update | Trial is active; returnCounters[practiceId] increments |
| Milestone triggered at threshold=1 | MILESTONE# item written after first return |
| Milestone NOT written twice (idempotency) | Second return at count=2 does not create second MILESTONE#total#1 |
| Returns for inactive/non-trial practice → 409 | PRACTICE_NOT_ACTIVE_OR_TRIAL |
| date param accepted | Return item SK uses supplied date, not today |

---

### FILE-3 · `tests/integration/api/me.test.ts`

| Test | What to verify |
|---|---|
| Creates PROFILE if missing | Item written with subscriptionStatus=FREE, activePracticeIds=[], all default fields |
| Idempotent — second GET returns same profile | No overwrite; createdAt unchanged |
| Returns activeTrialCount from real TRIAL# items | Seed 1 active trial → response has activeTrialCount=1 |
| Returns activeTrialCount=0 for expired trial | Seed trial with past expiresAt → not counted |
| PATCH updates timezone | PROFILE.timezone set in DynamoDB |
| PATCH updates dayResetTime | PROFILE.dayResetTime set in DynamoDB |
| PATCH rejects invalid timezone | Returns 400; PROFILE unchanged |
| PATCH rejects dayResetTime=1440 | Returns 400; PROFILE unchanged |
| PATCH with no known fields is a no-op | Returns 200 ok; no DB write |

---

### FILE-4 · `tests/integration/api/assessment.test.ts`

| Test | What to verify |
|---|---|
| POST persists ASSESS# item | Item exists with scoresByPillar, focusPillar, totalScore, assessmentId |
| POST updates PROFILE.latestAssessmentId | PROFILE item has correct assessmentId |
| POST updates PROFILE.focusPillar | PROFILE item has correct focusPillar |
| POST returns correct scoresByPillar and focusPillar | Response matches computed values |
| GET /latest returns 404 when no assessment | 404 response |
| GET /latest returns assessment data | Response has scoresByPillar, focusPillar, assessmentId |
| GET /latest returns the most recent after two assessments | latestAssessmentId on PROFILE points to second one; GET returns second |
| POST rejects wrong answer count | Returns 400 |
| POST rejects invalid question IDs | Returns 400 |

---

### FILE-5 · `tests/integration/api/progress.test.ts`

| Test | What to verify |
|---|---|
| Returns zero-state safely | No profile, no practices → totalReturns=0, milestones=[], nextMilestones has first total milestone |
| totalReturns reflects real returnCounters | Seed counters → response totalReturns matches sum |
| practicesActivated reflects real UPRACTICE# items | Seed 2 UPRACTICE# items → practicesActivated=2 |
| Achieved milestones returned | Seed MILESTONE# item → appears in milestones array |
| nextMilestones skips achieved | If MILESTONE#total#1 achieved, nextMilestones shows MILESTONE#total#7 |
| Streaks computed from real FIAPP_RETURNS data | Seed consecutive return items → currentStreak=N |
| Empty activePracticeIds → streaks are 0 | No returns queried when no active practices |

---

### FILE-6 · `tests/integration/api/suggestions.test.ts`

| Test | What to verify |
|---|---|
| Returns 3 suggestions matching focusPillar | Seed PROFILE with focusPillar=sleep → all suggestions are sleep pillar |
| Returns fallback 3 when no focusPillar | Seed PROFILE with focusPillar=null → 3 suggestions from different pillars |
| Returns fallback 3 when no PROFILE | No profile seeded → suggestions still returned (fallback) |
| All suggestions have required fields | practiceId, pillar, title, description, rationale |

---

### FILE-7 · `tests/integration/api/returns-get.test.ts`

| Test | What to verify |
|---|---|
| Returns dot entries for date range | Seed 3 returns → response has correct dates with didIt values |
| Dates with no returns have didIt=null | Response fills in nulls for missing dates |
| total reflects count of didIt=true items | Seeded true items count matches response total |
| Respects days param | days=7 returns 7 entries |
| Rejects unknown practiceId | Returns 404 |
| Rejects missing practiceId | Returns 400 |

---

## Routes Not Integration-Tested (and Why)

| Route | Reason |
|---|---|
| `POST /api/auth/signout` | Cookie clearing, no DynamoDB. Auth infrastructure. |
| `GET /api/health` | Returns `{ ok: true }`. No logic. |
| `GET /api/dev/whoami` | Dev-only tool. |
| `POST /api/dev/subscription` | Dev-only toggle. Unit test sufficient. |
| `POST /api/payment/checkout` | Calls Stripe. Requires external mock. Not in scope. |
| `POST /api/payment/webhook` | Stripe webhook. Same. |
| `GET /api/admin/metrics` | Admin tooling. |

`GET /api/practices/active` — reads PROFILE + UPRACTICE# + TRIAL# items. Covered indirectly by the practice test (after an `add`, `startTrial`, etc. the state should be correct). Can add a dedicated file if regressions occur.

---

## CI Integration

In GitHub Actions, the integration test job:

1. Starts DynamoDB Local as a service container:
```yaml
services:
  dynamodb:
    image: amazon/dynamodb-local:latest
    ports:
      - 8000:8000
    options: >-
      --health-cmd "curl -s http://localhost:8000"
      --health-interval 5s
      --health-timeout 3s
      --health-retries 10
```

2. Runs: `npm run test:integration`

Both the `unit` and `integration` jobs run in parallel and both must pass before merge.

---

## Implementation Order

1. `docker-compose.test.yml` + `vitest.integration.config.ts`
2. `tests/integration/setup.ts` (env vars)
3. `tests/integration/tableUtils.ts` (create/delete tables)
4. `tests/integration/seeds.ts` (all seed factories)
5. `tests/integration/api/practice.test.ts` — caps, trials, pause/resume, replace, setFocus
6. `tests/integration/api/return.test.ts` — delta, milestone idempotency
7. `tests/integration/api/me.test.ts` — profile creation, idempotency, PATCH
8. `tests/integration/api/assessment.test.ts`
9. `tests/integration/api/progress.test.ts`
10. `tests/integration/api/suggestions.test.ts`
11. `tests/integration/api/returns-get.test.ts`
12. GitHub Actions workflow update (add `integration` job with DynamoDB service)
