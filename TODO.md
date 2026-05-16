# FIApp v1 — Remaining Work

Last updated: 2026-05-13 (after v2 ship)

---

## ✅ V2 Business-Logic Refactor — shipped 2026-05-13

Full refactor (5 Cuts) merged to `main` via PR #375. Canonical spec: [_docs/canon/business-logic-v2.md](_docs/canon/business-logic-v2.md).

Headline changes:
- 35 practices (5 per pillar), with a stable 1:1 question↔practice mapping
- Lifecycle simplified to `active | inactive` only — trial / pause-as-state / replace / promote / discard / focus all removed
- `/today` is always accessible; `decideRoute` is a pure function of `latestAssessmentId`
- `/api/practice` collapsed to 4 modes; deterministic weakest-answer recommendations
- Free=1, Paid=10 hard caps; no 5+/7+ soft warnings
- Free-user "switch dialog" replaces the v1 replace flow
- Storage stays `status: "inactive"` but UI shows "Paused" / "Resume" / "Pause"

Follow-up PRs after the main merge: #376 (manual checklist rewrites against v2) and a small doc-cleanup PR (supersede-header refresh + TODO tidy). Decisions Q5/Q6/Q7 are recorded in the v2 doc. See [_docs/canon/business-logic-v2.md](_docs/canon/business-logic-v2.md) for the full spec.

---

## Code Gaps (post-epic audit)

- [ ] **Gap 4** — Show next-up milestones on Progress page. Users can't see what they're working toward. Compute next unachieved milestone from `returnCounters` vs thresholds in `lib/milestones/milestones.ts`. Add `nextMilestones` to `GET /api/progress` and render a "Coming up" section on the progress page.
- [ ] **Gap 5** *(optional)* — Individual assessment answers not stored. After writing `ASSESS#<id>`, batch-write `ANS#<assessmentId>#<questionId>` items. No user-facing impact right now.
- [x] ~~**Gap 3** — `practiceCounters` PROFILE field is never written~~ → closed by v2 Cut 5.

---

## Business / Payments

- [ ] **Stripe live mode** — Currently on test keys. Update `FIAPP_STRIPE_SECRET_KEY`, `FIAPP_STRIPE_WEBHOOK_SECRET`, and `FIAPP_STRIPE_PRICE_ID` in Amplify to live values when ready to accept real payments.

---

## Product

- [ ] **Email notifications** — No emails sent at all currently. Key candidates: daily check-in reminder, milestone celebration, weekly summary. Needs an email provider (e.g. SES, Resend).
- [x] ~~**Onboarding flow** — brief intro screen explaining the core loop~~ → redesigned 2026-05-13 (commit 99f3e36 — collapsed 3-screen intro to 1 with pillars + radar).
- [x] ~~**Practice library depth** — aim for 8–10 per pillar~~ → obsoleted by v2 (locked at 5 practices/pillar, 35 total).

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
25 tickets. Build a layered test system: unit tests for pure logic, API/integration tests for backend rules, E2E smoke suite for CI, full staging regression suite for releases, and a manual launch checklist. Covers auth, routing, assessment, practices, returns, progress, account, and plan caps. (Trials are gone in v2; epic scope adjusted.)

### EPIC 13 — Staging Environment & Deployment Readiness (issue #198)
15 tickets. Create a production-like staging environment on Amplify with separate env vars, separate DynamoDB resources, seeded/resettable test data, staging health checks, deployment checklist, rollback process, and a release readiness runbook.

### EPIC 18 — Production Monitoring, Analytics & Launch Operations (issue #283)
17 tickets. Add health check endpoint, structured server error logging, client-friendly error patterns, aggregate (privacy-conscious) analytics event model, daily metrics snapshot, operator dashboard, CloudWatch access docs, production smoke routine, incident response checklist, and post-launch feedback capture.

### EPIC 10 — Production Readiness (issue #11)
8 tickets. Structured logging, error normalization, basic rate limiting, scan-based metrics snapshot job, snapshot schema, daily metrics storage, CloudWatch dashboard, rollback runbook.
