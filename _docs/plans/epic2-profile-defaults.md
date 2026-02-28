# Epic #2 — PROFILE Defaults Plan

**Status:** Implemented

**Purpose:** Ensure PROFILE exists for all future flows without extra checks elsewhere.

**Success criteria:**
- Default fields present (`subscriptionStatus` = free etc.)
- Create is idempotent
- No overwriting existing profile

---

## Cross-reference: Compatibility with Canon Docs

Cross-checked against `_docs/canon/*.md` and implementation. Resolutions below.

### PROFILE fields — consistent

| Source | Fields |
|--------|--------|
| **db-schema.md** | subscriptionStatus, activePracticeIds, activePracticeSkById, todayFocusPracticeId, latestAssessmentId, focusPillar, returnCounters, practiceCounters, milestonesAchieved |
| **api-contract.md** (GET /api/me) | subscriptionStatus, activePracticeIds, todayFocusPracticeId, latestAssessmentId, focusPillar, counters + milestones |
| **testing-checklist.md** | subscriptionStatus, activePracticeIds, latestAssessmentId |
| **state-machine.md** | hasAssessment (latestAssessmentId), subscriptionStatus, activePracticeIds, todayFocusPracticeId |
| **Plan defaults** | All above + userId, createdAt, updatedAt (implementation fields) |

→ **Compatible.** Plan’s default fields match db-schema and api-contract.

### subscriptionStatus casing — inconsistent (resolve before implementation)

| Source | Value |
|--------|-------|
| **db-schema.md** | `"FREE" \| "PAID"` |
| **state-machine.md** | `FREE|PAID` |
| **testing-checklist.md** | FREE unless dev override |
| **.env.example** | `FIAPP_FORCE_SUBSCRIPTION_STATUS=FREE` |
| **Code** (createMyProfile, resource.ts, dev/subscription) | `"FREE"` / `"PAID"` (uppercase) |
| **api-contract.md** (cap rules) | FREE cap=1, PAID cap=10 |

**Resolution:** All canon docs and .env.example updated to use `FREE`/`PAID`. Code unchanged.

### Epic numbering

- **execution-plan.md** Epic 2 = "Core Screens / UX Skeleton"
- This plan = "PROFILE Defaults" (profile creation, defaults, idempotency)

Different scope; no conflict. This work aligns with Epic 1 (Identity, Profile & Subscription) in execution-plan.

### Other canon references

- **routing-table.md:** uses subscriptionStatus, hasAssessment, activePracticeCount — all derived from PROFILE. Compatible.
- **practice-caps-and-trials.md:** cap rules use subscriptionStatus — compatible.
- **design-guardrails.md:** UI-focused, no PROFILE schema. N/A.

---

## Current State

| Item | Status |
|------|--------|
| Conditional write | ✅ Already in `createMyProfile.js`: `attribute_not_exists(PK) AND attribute_not_exists(SK)` |
| `/api/me` create-if-missing flow | ✅ Reads first, creates only when missing |
| Default fields | ⚠️ Partial: only `userId`, `subscriptionStatus`, `createdAt`, `updatedAt` |

**Gap:** db-schema and api-contract define additional canonical fields that flows will expect. Defaults are missing for `activePracticeIds`, `activePracticeSkById`, `todayFocusPracticeId`, `latestAssessmentId`, `focusPillar`, and (optional for now) `returnCounters`, `practiceCounters`, `milestonesAchieved`.

---

## Plan

### Step 1: Define default PROFILE shape

**Location:** `_docs/canon/db-schema.md` (reference) + `amplify/data/handlers/profile/createMyProfile.js` (implementation)

Add a single source of truth for the "default PROFILE" shape. Options:
- **A)** Add `_docs/canon/profile-defaults.md` with the exact default item
- **B)** Define inline in createMyProfile with a comment pointing to db-schema

**Default fields to include** (per db-schema + testing-checklist):

| Field | Default | Notes |
|-------|---------|-------|
| `userId` | `sub` | Already present |
| `subscriptionStatus` | `"FREE"` | Already present; schema uses FREE/PAID |
| `createdAt` / `updatedAt` | ISO8601 | Already present |
| `activePracticeIds` | `[]` | testing-checklist requires |
| `activePracticeSkById` | `{}` | db-schema |
| `todayFocusPracticeId` | `null` | db-schema |
| `latestAssessmentId` | `null` | testing-checklist requires |
| `focusPillar` | `null` | db-schema |
| `returnCounters` | `{}` | stub for Counters epic |
| `practiceCounters` | `{}` | stub for Counters epic |
| `milestonesAchieved` | `[]` | db-schema |

**Amplify schema note:** `Profile` in `amplify/data/resource.ts` currently only declares `userId`, `subscriptionStatus`, `createdAt`, `updatedAt`. Extra fields written to DynamoDB will be returned by getMyProfile; Amplify types may need optional fields if consumers expect them. Decision: add optional fields to Profile type or keep type minimal and rely on runtime shape.

---

### Step 2: Update createMyProfile with full default shape

**File:** `amplify/data/handlers/profile/createMyProfile.js`

- Extend the `item` object with all default fields from Step 1
- Ensure condition remains: `attribute_not_exists(PK) AND attribute_not_exists(SK)` (no change)
- Optionally extract defaults to a shared constant for reuse in tests

---

### Step 3: (Optional) Update Amplify Profile type

**File:** `amplify/data/resource.ts`

- Add optional fields to `Profile` custom type if downstream code (e.g. `lib/apiClient`, `DecideRouteClient`) expects them
- Or leave as-is if those consumers already handle partial shape

---

### Step 4: Add minimal test — /api/me twice

**Approach:**

1. **Unit test** (recommended)  
   - File: `tests/unit/api/me.test.ts` (new) or extend existing  
   - Mock `getDataClient()`:
     - First `GET /api/me`: `getMyProfile` returns `null` → `createMyProfile` returns new profile → response `{ ok: true, data }`
     - Second `GET /api/me`: `getMyProfile` returns existing profile → no `createMyProfile` call → same profile returned
   - Assert: second response matches first (or at least has same `userId`, `subscriptionStatus`, no overwrite)
   - Assert: `createMyProfile` invoked exactly once across both calls

2. **Integration / handler test** (optional, if DynamoDB mock available)  
   - Call createMyProfile twice with same user
   - Second call should throw `ConditionalCheckFailedException` (or equivalent) — we treat that as "already exists" and re-read in `/api/me`

---

### Step 5: Manual verification

Document in testing-checklist or README:

1. Start dev server, sign in
2. Open `GET /api/me` in browser (or DevTools → copy as cURL)
3. Note response, e.g. `{ ok: true, data: { userId, subscriptionStatus: "FREE", ... } }`
4. Refresh or call `GET /api/me` again
5. Assert: same `userId`, `subscriptionStatus`, `createdAt`; no 500
6. (Optional) In DynamoDB console, confirm single PROFILE item per user

---

## Checklist before starting

- [ ] Confirm which default fields to include (all above vs. minimal set)
- [ ] Decide: new `profile-defaults.md` vs. inline comment in createMyProfile
- [ ] Decide: update Amplify Profile type now or later
- [x] Resolve subscriptionStatus casing: db-schema, state-machine, testing-checklist, api-contract, .env.example updated to FREE/PAID

---

## Estimated effort

| Step | Effort |
|------|--------|
| 1. Define shape | ~10 min |
| 2. Update createMyProfile | ~15 min |
| 3. Update Profile type (optional) | ~5 min |
| 4. Unit test | ~20 min |
| 5. Manual verify + doc | ~10 min |

**Total:** ~1 hour
