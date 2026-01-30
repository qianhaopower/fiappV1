# docs/canon/state-machine.md
# FIApp v1 — Canonical Routing & State Machine (LOCKED)

**Goal:** Deterministic user journey that enforces prerequisites (auth, assessment, practices) and prevents cap bypass.  
**Key UX decision:** “Manage Active Practices” and “Daily practice selector” are merged into a single **Active Practices** screen.

---

## 1) Core State Inputs (server-derived)

The router/guards depend on:

1. `isAuthed`
2. `hasAssessment` (PROFILE.latestAssessmentId)
3. `subscriptionStatus` (`free|paid`)
4. `activePracticeIds.length`
5. `todayFocusPracticeId` (optional)
6. Trial presence (TRIAL items) (optional for routing, important for UI)
7. Daily returns availability (for Today screen rendering)

> **Invariant:** Route decisions are derived from server truth, not local assumptions.

---

## 2) Primary Screens (canonical set)

1. **Auth**
2. **Assessment**
3. **Results + Suggestions**
4. **Active Practices (Unified screen)**
5. **Today**
6. **Progress**

(Additional screens like Settings can exist, but must not break the guard logic.)

---

## 3) High-level Journey (canonical)

### First-time user
1. Auth → Assessment → Results/Suggestions  
2. User starts trial or adds a practice  
3. Lands in **Active Practices** (manage + select in one place)  
4. Goes to Today for daily logging  
5. Progress shows counters/milestones

### Returning user
- Auth → (guarded) Today / Active Practices / Progress depending on state

---

## 4) Canonical Guards (routing rules)

### Guard A: Auth
- If not authed → **Auth**
- If authed → continue

### Guard B: Assessment
- If `latestAssessmentId` missing → **Assessment**
- Else → continue

### Guard C: Practices present
- If `activePracticeIds.length === 0`:
  - Route to **Results/Suggestions** (primary) OR **Active Practices** (if you prefer a consistent hub)
  - Canon intent: user should see suggestions to start something.

### Guard D: Main hub preference
- If user has >=1 active practice:
  - Either route to **Today** (habit loop) or **Active Practices** (management hub)
  - Canon intent: Today is the daily action, Active Practices is management.

> **Important:** These guards must prevent users from reaching “Today” in a broken state (e.g., no practices and no suggestion flow).

---

## 5) Active Practices Screen (Unified responsibilities)

This single screen replaces the “selector” + “manage” split.

### Must support:
- View active practices list
- Add practice (from suggestions or library)
- Replace practice
- Pause / resume (Option 2 pause logic)
- Set focus practice
- View trials (start/promote/discard)
- Show cap warnings at 5/7 and hard stop at 10 (paid)
- Navigate to Today + Progress

> **Invariant:** Any action that changes practice state calls `POST /api/practice`.

---

## 6) Cap & Confirm UX (canonical behavior)

### Paid users
- At 5 active: show warning (non-blocking)
- At 7 active: show strong warning (non-blocking but prominent)
- At 10 active: hard stop (cannot add more)

### Free users
- At 1 active: hard stop (cannot add more unless they replace)

### Trials
- Starting trials does not consume cap
- Promoting a trial must respect cap; may trigger replace flow if full

---

## 7) “Today” Screen (habit loop expectations)

### Preconditions
- User is authed
- Has assessment
- Has at least one active practice (or a defined fallback)

### Must support:
- Show active practices (or focus practice first)
- Log didIt/notToday via `POST /api/return`
- Render dots/streaks from `GET /api/returns` (last N days)

### Counters/milestones
- Updated server-side via delta logic (toggle-aware)

---

## 8) Progress Screen expectations
- Reads from `GET /api/progress`
- Displays:
  - counters
  - milestone feed / achieved list
- Must be robust to “no milestones yet”

---

## 9) Invariants (do not break)

1. **Server is authoritative** for caps and state transitions.
2. **No navigation trick** can bypass caps (all adds/resumes/promotions go through server).
3. Active practices screen is **one unified concept** (manage + select merged).
4. Trials:
   - do not count toward caps
   - do count toward counters/milestones
5. Return toggling must be supported and reflected in counters.

---

## 10) Recommended “decideRoute” pseudo-logic (canonical intent)

1. if !isAuthed → `/auth`
2. else fetch `/api/me`
3. if !hasAssessment → `/assessment`
4. else if activePracticeCount === 0 → `/results` (suggestions)
5. else → `/today` (default daily loop)
   - `/active-practices` remains always accessible for management

> This is the intended baseline. Refinements are allowed only if they preserve all invariants above.
