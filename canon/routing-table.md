# docs/canon/routing-table.md
# FIApp v1 — Canonical Routing Table (LOCKED)

**Purpose:** Concrete, executable reference for route decisions.  
**Relationship:** This file operationalises `state-machine.md`.

---

## 1. Inputs to Routing Decision

Derived from server state (`/api/me`, `/api/assessment/latest`):

- `isAuthed`
- `hasAssessment`
- `activePracticeCount`
- `hasActivePractices`
- `subscriptionStatus`

---

## 2. Default Route Resolution (`decideRoute`)

| Condition | Route |
|---------|------|
| not authed | `/auth` |
| authed + no assessment | `/assessment` |
| assessment + 0 active practices | `/results` |
| assessment + ≥1 active practice | `/today` |

---

## 3. Route Guards (Hard)

### `/today`
Requires:
- authed
- assessment completed
- ≥1 active practice

If violated → redirect to `/results` or `/assessment`

---

### `/results`
Requires:
- authed
- assessment completed

Purpose:
- surface suggestions
- allow trial/start actions

---

### `/active-practices`
Requires:
- authed
- assessment completed

Always accessible once assessment exists.
Acts as the **management hub**.

---

### `/progress`
Requires:
- authed
- assessment completed

Must be robust to:
- zero counters
- zero milestones

---

## 4. Forbidden Transitions

- Cannot reach `/today` without assessment
- Cannot log returns without an active practice
- Cannot bypass caps via navigation

All forbidden transitions must be blocked server-side, not just UI.

---

## 5. Canon Rule

If routing behaviour is ambiguous:
> Follow this table, not intuition.
