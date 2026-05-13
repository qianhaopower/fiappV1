# docs/canon/business-logic-v2.md
# FIApp v1 — Business Logic v2 (CANONICAL)

**Status:** Canonical. The v1 docs `state-machine.md`, `routing-table.md`, `api-contract.md`, and `practice-caps-and-trials.md` were superseded by this file and deleted in Cut 5 of the v2 rollout (history in git).
**Adopted:** 2026-05-13
**Summary:** Move from 21 practices to 35; collapse lifecycle to `active | inactive`; add 1:1 question↔practice mapping; make `/today` unconditionally accessible.

---

## Headline changes vs. v1

- **35 practices**, 5 per pillar (was 21, 3 per pillar).
- **35 questions ↔ 35 practices** via stable 1:1 mapping (`mappedPracticeId` / `mappedQuestionId`).
- **Lifecycle:** `active | inactive` only. No `trial`, `promoted`, `discarded`, `expired`, `replaced`, `paused`, or required focus state.
- **`/today` is always accessible.** No redirect when `todayFocusPracticeId` is unset.
- **Recommendations are deterministic:** weakest answers in lowest-scoring pillar → mapped practices.

---

## Core concepts

1. `AssessmentQuestion` — `{ questionId, pillarId, order, text, mappedPracticeId }`
2. `Practice` — `{ practiceId, pillarId, mappedQuestionId, order, title, description, tags?, difficulty? }`
3. `AssessmentResult` — `{ assessmentId, userId, answers, pillarScores, lowestPillarId, suggestedPracticeIds, createdAt }`
4. `UserPractice` — `{ userId, practiceId, status: "active"|"inactive", firstStartedAt, lastActivatedAt, lastInactivatedAt?, totalCompletions }`
5. `DailyReturn` — `{ userId, practiceId, date, didIt }`

`UserPractice` records only exist after a user starts a practice. "Suggested" is **not** a status.

**Field mapping note:** `totalCompletions` is the conceptual name used throughout this spec. In storage it is backed by `PROFILE.returnCounters[practiceId]` — the spec deliberately keeps the storage name during transition (see "Open decisions"). Anywhere v2 says "preserve totalCompletions," read as "preserve the corresponding `returnCounters[practiceId]` value."

---

## Recommendation logic

1. Calculate pillar scores.
2. Identify lowest-scoring pillar.
3. Within that pillar, rank questions by **answer weakness** (defined below).
4. Recommend the practices mapped to those weakest questions.

**Answer weakness definition** (answers are boolean yes/no per the API):
- A `false` ("no") answer ranks **weaker** than a `true` ("yes") answer.
- Within the lowest-scoring pillar, take the practices mapped to questions ranked: all `no` answers first, then `yes` answers, until 3 practices are picked.
- If the lowest pillar has 3+ `no` answers, the suggestions are exactly those 3. If fewer than 3 `no` answers exist, the list is padded with `yes`-answer practices from the same pillar so the result is always 3.

Tie-breakers (deterministic, never random):
1. Weaker answer first (`no` before `yes`).
2. Lower question `order` within pillar.
3. Lower practice `order` within pillar.

Display: top 3 practices on the result screen, with a secondary link to "Browse all 35 practices."

---

## UserPractice lifecycle

```
(no record)  ──start──▶  active
   active    ──make inactive──▶  inactive
   inactive  ──bring back──────▶  active
```

Rules:
- Starting an already-active practice is a no-op.
- Making a practice inactive removes it from Today and from the cap count. **DailyReturn history and totalCompletions are preserved.**
- Reactivating preserves `firstStartedAt` and history; updates `lastActivatedAt`.
- One `UserPractice` per `userId + practiceId`, ever. No duplicates.

---

## Practice card CTA

- No `UserPractice` → "Start this practice"
- `UserPractice.status = "inactive"` → "Bring this back" (+ "You've completed this X times before")
- `UserPractice.status = "active"` → "Active" badge + "View on Today"

Same CTA rules everywhere: results screen, practice bank, recommendation cards.

---

## Today screen

- `/today` always exists.
- 0 active practices → empty state with "Browse practices" / "Take assessment" CTAs.
- 1+ active practices → log "Did it" / "Not today" per active practice.
- No `todayFocusPracticeId` requirement.

---

## Routing rules (v2)

### Default route resolution (`decideRoute`)

| Condition | Route |
|---|---|
| not authed | `/auth` |
| authed, no assessment | `/onboarding` → `/assessment` |
| authed, has assessment | `/today` |

Note: with assessment but 0 active practices, the default destination is **still `/today`** (it renders the empty state). It is no longer `/results`.

### Per-route guards

| Route | Required state | 0-active behaviour |
|---|---|---|
| `/auth` | unauthenticated | N/A. Authed users who land here are redirected to the default route. |
| `/onboarding` | authed, no assessment | N/A (pre-assessment). Intro screen that leads into `/assessment`. |
| `/assessment` | authed | N/A. Always accessible (user can retake anytime). |
| `/today` | authed + assessment | Empty state with "Browse practices" / "Take assessment" CTAs. **Never redirect.** |
| `/practices` | authed + assessment | Always accessible. Practice bank: all 35 practices grouped by 7 pillars. |
| `/results` | authed + assessment | Always accessible. Shows latest assessment summary + suggested practices. |
| `/progress` | authed + assessment | Always accessible. Robust to 0 counters / 0 milestones. |

### Forbidden / server-enforced

- Cannot reach an assessment-gated route without an assessment record — redirect to `/onboarding` or `/assessment`.
- Cannot log a `DailyReturn` without an active `UserPractice` — server rejects, UI hides controls.
- Cannot bypass caps via direct navigation — `/api/practice` enforces.

### Removed from v1

- **`/active-practices`** — specced in v1 as a unified "manage + select" hub but never built. v2 does not introduce it. Use `/practices` for the practice bank and `/today` for the active list.
- **Redirect to `/results` when activePracticeCount === 0** — replaced by `/today` empty state.
- **Redirect to `/practices` when `todayFocusPracticeId` is missing** — focus is no longer a routing input. If retained later, it is a display preference only.

---

## Daily return logging

- Only active practices can be logged.
- "Did it" updates `totalCompletions` once per `(practiceId, date)`. Toggling back to false decrements.
- DailyReturn history is preserved when a practice becomes inactive.
- 14-day track reflects the **last 14 calendar days only** — empty grid after long inactivity is correct. Long-term history lives in `totalCompletions` + full DailyReturn record.

### Streak rule

Streak is **pure rolling**, derived from `DailyReturn` records — lifecycle status is irrelevant to the calculation.

- Streak = count of consecutive days ending today with `didIt=true`.
- A gap of missed days breaks the streak. This happens equally whether the user simply skipped days or made the practice inactive — both produce missing positive DailyReturn records.
- Reactivating a practice after a long pause shows `streak = 0` until the user logs a day. This is correct: the streak number represents recent unbroken effort, not historical engagement (which is captured by `totalCompletions`).

---

## Subscription caps

- **Free:** 1 active practice max. Starting/reactivating another triggers a **switch flow** (see dialog copy below). No "replaced" status — the previous practice becomes inactive and can be brought back later.
- **Paid:** up to 10 active practices. Block at 10. **No soft warnings** at 5+/7+ — the hard cap is the only boundary. (v1 had progressive warnings; v2 removes them for simplicity. Can be added back later if user feedback requests them.)
- Inactive practices, suggested practices, and library entries do **not** count toward the cap.

### Free-user switch dialog (canonical copy)

When a free user at the 1-active cap taps "Start this practice" on a different practice, show:

> **Switch to "[new practice title]"?**
>
> "[current practice title]" will move to your practice bank. You can bring it back anytime.
>
> [ Switch ] [ Cancel ]

The dialog deliberately does **not** name the active/inactive mechanic — users see it as "switching between practices," not "deactivating one to activate another."

---

## API surface (target)

`POST /api/practice` supports 4 mode names backing 3 effective operations:

| Mode | Operation | Notes |
|---|---|---|
| `startPractice` | start-or-reactivate | Handles the "no record" case and the "inactive record" case identically |
| `reactivatePractice` | start-or-reactivate (alias) | Same server handler as `startPractice`; distinct name so the client can be explicit about user intent ("Bring this back") |
| `makePracticeInactive` | flip to inactive | |
| `switchToPractice` | atomic deactivate + activate | For the free-user 1-cap switch flow |

Removed modes: `startTrial`, `promoteTrial`, `discardTrial`, `add`, `replace`, `pause`, `resume`, `setFocus`.

---

## Storage notes (DynamoDB)

- `UPRACTICE#<practiceId>` items remain, but `status` is now `"active" | "inactive"` only.
- **Stop creating `TRIAL#` items.** Existing trial items can be ignored (we have no production users to migrate).
- `PROFILE.activePracticeIds` may stay as a fast lookup but must contain only active practices.
- `PROFILE.todayFocusPracticeId` is **no longer required for routing**. If present, treat as a display preference only.
- `ASSESS` items store `pillarScores`, `lowestPillarId`, optional `suggestedPracticeIds`.
- `FIAPP_RETURNS` records survive lifecycle transitions.

---

## API contract (v2)

All endpoints require an authenticated user; `userId` is resolved server-side from the session. Error responses follow `{ error: "CODE", ...optional fields }` with an appropriate HTTP status.

### `GET /api/me`

**Purpose:** return PROFILE (create if missing).

**Returns:**
```json
{
  "subscriptionStatus": "FREE" | "PAID",
  "activePracticeIds": ["..."],
  "latestAssessmentId": "..." | null,
  "lowestPillarId": "sleep" | "..." | null,
  "counters": { "returnCounters": { "<practiceId>": number } },
  "todayFocusPracticeId": "..." | null
}
```

Notes:
- `lowestPillarId` replaces the v1 `focusPillar` field. The legacy name may still be served during transition; clients should prefer `lowestPillarId`.
- `todayFocusPracticeId` is **display-only** in v2. It is **not** a routing input. Clients must not depend on it for guard logic.

---

### `POST /api/assessment`

**Purpose:** record a new assessment, score pillars, identify the lowest pillar, derive suggested practices via the 1:1 mapping.

**Body:**
```json
{
  "answers": { "<questionId>": boolean }
}
```

**Server actions:**
1. Validate that every `questionId` belongs to the 35-question bank.
2. Compute `pillarScores` (one score per pillar).
3. Compute `lowestPillarId`.
4. Compute `suggestedPracticeIds` (see "Recommendation logic" above — top 3 weakest-answer practices in the lowest pillar; deterministic tie-breakers).
5. Write `ASSESS#<assessmentId>` item with all of the above.
6. Update `PROFILE.latestAssessmentId` and `PROFILE.lowestPillarId`.

**Returns:**
```json
{
  "assessmentId": "...",
  "pillarScores": { "<pillarId>": number },
  "lowestPillarId": "...",
  "suggestedPracticeIds": ["...", "...", "..."]
}
```

---

### `GET /api/assessment/latest`

**Returns:** the latest `ASSESS` summary (including `suggestedPracticeIds`) or `null` if none.

---

### `GET /api/practices/suggestions`

**Purpose:** return practices to recommend to the user.

**Behaviour:**
- If the user has a latest assessment: return the top 3 practices mapped to the weakest-answered questions in the lowest-scoring pillar. Deterministic — never random.
- If no assessment exists: return a stable fallback (one practice from each of a small fixed set of pillars).

**Returns:**
```json
{
  "suggestions": [
    {
      "practiceId": "...",
      "title": "...",
      "pillar": "...",
      "mappedQuestionId": "...",
      "rationale": "..."
    }
  ]
}
```

---

### `POST /api/practice`

The **only** endpoint for `UserPractice` state transitions. Body always includes `mode` and `practiceId`.

**Modes:**

#### `mode: "startPractice"`

Creates a new `UPRACTICE` or reactivates an existing inactive one (these are merged because the user's mental model is the same — see "Starting a practice" above).

- If no record exists: create with `status: "active"`, `firstStartedAt = now`, `lastActivatedAt = now`, `totalCompletions = 0`.
- If record exists with `status: "inactive"`: flip to `active`, set `lastActivatedAt = now`, preserve `firstStartedAt`, `totalCompletions`, DailyReturn history.
- If record exists with `status: "active"`: return `200` with `{ alreadyActive: true }`.

Cap enforcement runs in both create and reactivate cases. Free users at cap → `409 CAP_REACHED` (client should offer the switch flow).

**Returns:**
```json
{ "practiceId": "...", "status": "active", "warning"?: "APPROACHING_CAP" }
```

#### `mode: "makePracticeInactive"`

Flips an active practice to inactive. Removes from `activePracticeIds`. Preserves the `UPRACTICE` record, `totalCompletions`, and DailyReturn history. Sets `lastInactivatedAt = now`.

- If practice is already inactive or has no record: `409 PRACTICE_NOT_ACTIVE`.

**Returns:** `{ ok: true }`

#### `mode: "reactivatePractice"`

Alias for `startPractice` when a record exists with `status: "inactive"`. Provided as a separate mode for UX clarity (UI button "Bring this back"). Server may route both to the same handler.

#### `mode: "switchToPractice"`

For free users at the 1-active cap (or paid users at the 10-active cap who prefer one-shot replacement).

**Body:**
```json
{
  "mode": "switchToPractice",
  "practiceId": "...",                // practice to activate
  "deactivatePracticeId": "..."       // current active practice to make inactive
}
```

**Server:** atomically (a) flip `deactivatePracticeId` → inactive, (b) start/reactivate `practiceId` as active. Both must succeed or neither.

**Returns:** `{ ok: true, practiceId: "...", deactivated: "..." }`

#### Removed in v2

`add`, `replace`, `pause`, `resume`, `setFocus`, `startTrial`, `promoteTrial`, `discardTrial`. Servers may keep handlers temporarily as no-ops or removed entirely; clients must not call them.

---

### `POST /api/return`

**Body:**
```json
{
  "practiceId": "...",
  "date": "YYYY-MM-DD",
  "didIt": boolean
}
```

**Rules:**
- The practice must be currently active for this user. Otherwise `409 PRACTICE_NOT_ACTIVE`.
- Counter updates are delta-based and toggle-aware: `false → true` increments `returnCounters[practiceId]`, `true → false` decrements. Same `(practiceId, date)` cannot double-count.
- DailyReturn records survive lifecycle transitions: a practice going inactive does **not** delete returns.

**Returns:**
```json
{ "counters": { "<practiceId>": number }, "milestones"?: ["..."] }
```

---

### `GET /api/returns`

**Query:** `practiceId` (optional — omit for all active practices), `days` (optional, default 14).

**Returns:** `{ returns: [ { practiceId, date, didIt } ] }`

---

### `GET /api/progress`

**Returns:** `{ counters, milestones: { achieved: [...], nextUp: [...] } }`. Must be robust to zero counters and zero milestones.

---

### Conventions

- Auth: every endpoint resolves `userId` server-side; client cannot pass it.
- Caps: enforced server-side. Free=1 active, Paid=10 active. Inactive practices and library entries do not count.
- Soft warnings at 5+/7+ active (Paid plan): **optional**. If kept, returned as `warning: "APPROACHING_CAP"` alongside a `200` response — never as an error.
- Confirm flows: v2 does not require server-issued confirm tokens for switch/inactivate. The client UI handles confirmation; the server trusts the call.

---

## North star

> FIApp uses 35 structured questions to identify life patterns that need attention, maps each question to one practical behaviour, and helps users activate, track, stop, and return to those practices over time.

The app must not manage practice lifecycles like Jira tickets. Active = on Today. Inactive = off Today, history kept. Suggested = recommendation, not status.

---

## UI copy

Use: "Start this practice", "Bring this back", "Make inactive", "View on Today", "Active", "You've completed this X times before", "Welcome back".

Avoid in user-facing copy: "Trial", "Promote", "Discard", "Expire", "Replace", "Pause", "Resume" (as system term), "Focus" (as required system state).

---

## Open decisions (deferred)

- `returnCounters` (current field) vs. `totalCompletions` (spec field) — UI rename only; backend stays as `returnCounters` for now.

### Resolved 2026-05-13

- **Free-user switch flow wording** → "Direct switch dialog" copy locked in (see §Subscription caps).
- **Streak across reactivation gaps** → Pure rolling, derived from DailyReturn (see §Daily return logging).
- **5+/7+ soft cap warnings** → Dropped in v2 (see §Subscription caps).

---

## Implementation plan (staged PRs)

1. **Content + mapping** (this PR) — 14 new practices, `mappedPracticeId` on questions, invariant tests.
2. **Recommendation rewrite** — weakest-answer logic, results screen consumes new output.
3. **Lifecycle simplification** — rewrite `/api/practice` to 4 modes, lenient read of legacy statuses, delete TRIAL writes.
4. **Routing** — strip focus guard from `decideRoute`, remove focus UI.
5. **Cleanup** — delete `trial.ts`, dead modes, dead tests, dead canon doc sections.
