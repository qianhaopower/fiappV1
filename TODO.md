# FIApp v1 — Remaining Work

Last updated: 2026-05-13

---

## V2 Business-Logic Refactor (in progress)

Tracking against the staged plan in [_docs/canon/business-logic-v2.md](_docs/canon/business-logic-v2.md). Each Cut ships as its own `feat/*` PR to `staging`.

### Cut 1 — Content + mapping ✅

Done on `feat/practice-library-35-mapping` (4 commits, not yet pushed):
- [x] Expand library 21 → 35 practices
- [x] Add `mappedPracticeId` / `mappedQuestionId` fields on questions and practices
- [x] Invariant test for the 1:1 mapping (35/35, bidirectional, pillar-aligned, deterministic order)
- [x] Canon audit: supersede headers on state-machine / routing-table / practice-caps-and-trials / api-contract / db-schema / execution-plan / launch-checklist / testing-checklist; one-line edit in product-philosophy
- [x] v2 internal consistency fixes (`totalCompletions` backing, answer-weakness definition, `/auth` + `/onboarding` in route table, 4-modes-3-ops framing)

### Decisions deferred to Cut 3

These three "Open decisions" in v2 must be answered before Cut 3 begins. Defer answering until we start Cut 3:
- [ ] **Q5** — Free-user switch flow exact UX wording ("Switch?" vs "Make X inactive to start Y?")
- [ ] **Q6** — Streak behaviour across reactivation gaps (reset vs preserve)
- [ ] **Q7** — Keep or drop the 5+/7+ Paid-plan soft warnings

### Cut 2 — Recommendation rewrite

- [ ] Rewrite `lib/practices/suggestions.ts` to weakest-answer mapped logic (per v2 §Recommendation logic)
- [ ] Update `app/api/practices/suggestions/route.ts` to consume the new logic
- [ ] Update `app/api/assessment/route.ts` to compute and persist `lowestPillarId` + `suggestedPracticeIds` on `ASSESS#<id>` write
- [ ] Update `app/api/assessment/latest/route.ts` to return the new fields
- [ ] Update `app/results/page.tsx` to render the new suggestion shape (top 3 from lowest pillar)
- [ ] Update tests: `tests/unit/practices/suggestions.test.ts`, `tests/unit/api/practices.suggestions.get.test.ts`, `tests/integration/api/suggestions.test.ts`
- [ ] PR to `staging`

### Cut 3 — Lifecycle simplification (blocked on Q5/Q6/Q7)

- [ ] Rewrite `app/api/practice/route.ts` to 4 modes (`startPractice`, `makePracticeInactive`, `reactivatePractice`, `switchToPractice`)
- [ ] Stop creating `TRIAL#` items; ignore existing on read
- [ ] Lenient read of legacy `paused`/`replaced` UPRACTICE statuses (treat as `inactive`)
- [ ] Server-side cap check using new statuses (Free=1, Paid=10; 5/7 warnings per Q7)
- [ ] Practice-card CTA logic ("Start" / "Bring this back" / "Active") in `app/results/page.tsx`, `app/practices/page.tsx`, `app/today/page.tsx`
- [ ] Switch-flow UI for free-user at-cap (wording per Q5)
- [ ] Remove pause/resume/replace/trial UI from all surfaces
- [ ] Rewrite `tests/unit/api/practice.post.test.ts`, `tests/integration/api/practice.test.ts`
- [ ] Update `tests/integration/seeds.ts`
- [ ] PR to `staging`

### Cut 4 — Routing

- [ ] Strip `todayFocusPracticeId` branch from `lib/decideRoute.ts`
- [ ] Verify `/today` empty-state UI for 0-active users (build if missing)
- [ ] Remove "Set as today's focus" CTAs and any related state
- [ ] Decide: keep `todayFocusPracticeId` as display preference, or delete entirely
- [ ] Update `tests/unit/decideRoute.test.ts`, `tests/unit/decideRouteClient.test.tsx`
- [ ] PR to `staging`

### Cut 5 — Cleanup

- [ ] Delete `lib/practices/trial.ts`
- [ ] Delete any handlers kept as no-ops in Cut 3
- [ ] Drop dead PROFILE fields (`practiceCounters`; `activePracticeSkById` if Cut 3 confirmed unused)
- [ ] Delete `tests/unit/practices/trial.test.ts`
- [ ] Full rewrite of `_docs/canon/launch-checklist.md` against v2 UX
- [ ] Full rewrite of `_docs/canon/testing-checklist.md` against v2 invariants
- [ ] Decide: delete or archive the fully-superseded canon docs (state-machine, routing-table, api-contract, practice-caps-and-trials)
- [ ] PR to `staging`

---

## Code Gaps (post-epic audit)

- [ ] **Gap 4** — Show next-up milestones on Progress page. Users can't see what they're working toward. Compute next unachieved milestone from `returnCounters` vs thresholds in `lib/milestones/milestones.ts`. Add `nextMilestones` to `GET /api/progress` and render a "Coming up" section on the progress page.
- [ ] ~~**Gap 3** — `practiceCounters` PROFILE field is never written anywhere. Likely superseded by `returnCounters`. Formally deprecate it in `_docs/canon/db-schema.md`.~~ → folded into v2 Cut 5 (drop dead PROFILE fields).
- [ ] **Gap 5** *(optional)* — Individual assessment answers not stored. After writing `ASSESS#<id>`, batch-write `ANS#<assessmentId>#<questionId>` items. No user-facing impact right now.

---

## Business / Payments

- [ ] **Stripe live mode** — Currently on test keys. Update `FIAPP_STRIPE_SECRET_KEY`, `FIAPP_STRIPE_WEBHOOK_SECRET`, and `FIAPP_STRIPE_PRICE_ID` in Amplify to live values when ready to accept real payments.

---

## Product

- [ ] **Onboarding flow** — First-time users jump straight to the assessment with no warm welcome. Consider a brief intro screen after signup that explains the core loop (assess → focus → practice → check in daily) before routing to `/assessment`.
- [ ] **Email notifications** — No emails sent at all currently. Key candidates: daily check-in reminder, milestone celebration, weekly summary. Needs an email provider (e.g. SES, Resend).
- [ ] ~~**Practice library depth** — Audit whether each of the 7 pillars has enough practices to keep users engaged across multiple trial/promote cycles. Aim for at least 8–10 per pillar.~~ → obsoleted by v2 (locked at 5 practices/pillar, 35 total; trial concept removed).

---

## Technical Health

- [ ] **Error monitoring** — No Sentry or equivalent. Production errors are invisible. Add Sentry (or similar) to both the Next.js frontend and API routes.
- [ ] **Analytics** — No visibility into drop-off points, feature usage, or retention. Add lightweight analytics (e.g. Plausible, PostHog) to understand how users actually use the app.

---

## Growth

- [ ] **Marketing landing page** — Audit the `/` landing page for clarity and conversion. Does it clearly explain the value prop? Is the CTA prominent? Is there social proof or a demo?

---

## Open GitHub Epics

### EPIC 12 — Core Regression Guardrails (issue #172)
25 tickets. Build a layered test system: unit tests for pure logic, API/integration tests for backend rules, E2E smoke suite for CI, full staging regression suite for releases, and a manual launch checklist. Covers auth, routing, assessment, practices, trials, returns, progress, account, and plan caps.

### EPIC 13 — Staging Environment & Deployment Readiness (issue #198)
15 tickets. Create a production-like staging environment on Amplify with separate env vars, separate DynamoDB resources, seeded/resettable test data, staging health checks, deployment checklist, rollback process, and a release readiness runbook.

### EPIC 18 — Production Monitoring, Analytics & Launch Operations (issue #283)
17 tickets. Add health check endpoint, structured server error logging, client-friendly error patterns, aggregate (privacy-conscious) analytics event model, daily metrics snapshot, operator dashboard, CloudWatch access docs, production smoke routine, incident response checklist, and post-launch feedback capture.

### EPIC 10 — Production Readiness (issue #11)
8 tickets. Structured logging, error normalization, basic rate limiting, scan-based metrics snapshot job, snapshot schema, daily metrics storage, CloudWatch dashboard, rollback runbook.
