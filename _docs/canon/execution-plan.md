# docs/canon/execution-plan.md
# FIApp v1 — Canonical Execution Plan

> **PARTIALLY SUPERSEDED.** v2 shipped to production 2026-05-13 (PR #375). Active spec: [business-logic-v2.md](business-logic-v2.md).
>
> - **EPIC 5 — Trial Practices (Activation Engine)**: removed. The trial concept is gone in v2; resuming a paused practice is the new model.
> - **EPIC 9 — Routing & State Machine Hardening**: routing rules reworked — `/today` is always accessible, `decideRoute` is a pure function of `latestAssessmentId`, and `todayFocusPracticeId` is no longer a routing input.
>
> Other epics (0 Foundations, 1 Identity, 2 Core Screens, 3 Assessment, 4 Practice Library, 6 Active Practice Management, 7 Daily Returns, 8 Counters & Milestones, 10 Production Readiness) are still relevant as objectives. The specific tickets that touched trial/pause/replace/focus state were reworked in v2's Cuts 3-5 (all shipped).

**Purpose:** Preserve build order, intent, and scope discipline.

---

## 1. Execution Philosophy

- Small, shippable increments
- 30–60 minute tickets
- No speculative features
- Testing embedded, not postponed

---

## 2. Epic Order (LOCKED)

1. **EPIC 0** — Foundations & CI/CD  
2. **EPIC 1** — Identity, Profile & Subscription  
3. **EPIC 2** — Core Screens / UX Skeleton  
4. **EPIC 3** — Assessment Engine  
5. **EPIC 4** — Practice Library & Suggestions  
6. **EPIC 5** — Trial Practices (Activation Engine)  
7. **EPIC 6** — Active Practice Management  
8. **EPIC 7** — Daily Returns (Habit Loop)  
9. **EPIC 8** — Counters & Milestones  
10. **EPIC 9** — Routing & State Machine Hardening  
11. **EPIC 10** — Production Readiness

Order matters. Later epics assume invariants from earlier ones.

---

## 3. What “Done” Means

An epic is done only when:
- core functionality works
- edge cases are handled
- tests exist for locked invariants
- UI empty states are safe

---

## 4. Non-Goals for v1

Explicitly deferred:
- advanced analytics dashboards
- social features
- notifications engine
- growth experiments

Deferral is intentional, not omission.

---

## 5. Canon Rule

If future work proposes:
- reordering epics
- skipping tests
- collapsing steps

This document must be updated first.
