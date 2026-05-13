# docs/canon/business-logic-v2.md
# FIApp v1 — Business Logic v2 (CANONICAL)

**Status:** Canonical — supersedes [state-machine.md](state-machine.md) and [practice-caps-and-trials.md](practice-caps-and-trials.md).
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

---

## Recommendation logic

1. Calculate pillar scores.
2. Identify lowest-scoring pillar.
3. Within that pillar, sort questions by answer weakness.
4. Recommend the practices mapped to those weakest questions.

Tie-breakers (deterministic, never random):
1. Lower answer score first.
2. Question `order` within pillar.
3. Practice `order` within pillar.

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

Replaces [state-machine.md](state-machine.md) §4, §10 and [routing-table.md](routing-table.md) §2, §3.

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
| `/today` | authed + assessment | Empty state with "Browse practices" / "Take assessment" CTAs. **Never redirect.** |
| `/practices` | authed + assessment | Always accessible. Practice bank: all 35 practices grouped by 7 pillars. |
| `/results` | authed + assessment | Always accessible. Shows latest assessment summary + suggested practices. |
| `/progress` | authed + assessment | Always accessible. Robust to 0 counters / 0 milestones. |
| `/assessment` | authed | Always accessible (user can retake anytime). |

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

---

## Subscription caps

- **Free:** 1 active practice max. Starting/reactivating another triggers a **switch flow** ("make current inactive → activate this"). No "replaced" status.
- **Paid:** up to 10 active practices. Block at 10. (Optional soft warnings at 5+/7+ may be retained — does **not** introduce new lifecycle states.)
- Inactive practices, suggested practices, and library entries do **not** count toward the cap.

---

## API surface (target)

`POST /api/practice` supports only:
- `startPractice`
- `makePracticeInactive`
- `reactivatePractice` (a.k.a. `makePracticeActiveAgain`)
- `switchToPractice` (free-user replacement flow)

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
- Free-user switch flow exact UX wording.
- Streak behavior across reactivation gaps.
- Whether to keep the 5+/7+ soft cap warnings.

---

## Implementation plan (staged PRs)

1. **Content + mapping** (this PR) — 14 new practices, `mappedPracticeId` on questions, invariant tests.
2. **Recommendation rewrite** — weakest-answer logic, results screen consumes new output.
3. **Lifecycle simplification** — rewrite `/api/practice` to 4 modes, lenient read of legacy statuses, delete TRIAL writes.
4. **Routing** — strip focus guard from `decideRoute`, remove focus UI.
5. **Cleanup** — delete `trial.ts`, dead modes, dead tests, dead canon doc sections.
