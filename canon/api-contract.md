# docs/canon/api-contract.md
# FIApp v1 — Canonical API Contract (LOCKED)

**Backend:** Next.js Route Handlers on AWS Amplify  
**DB:** DynamoDB (FIAPP_MAIN, FIAPP_RETURNS)  
**Rule:** All cap enforcement + lifecycle transitions happen on the server.

---

## 0) Conventions

### Auth
- All endpoints assume authenticated user context.
- Backend must resolve `userId` from session (Amplify Auth / Cognito context).

### Responses
- Prefer JSON with:
  - `ok: true|false`
  - `data` on success
  - `error: { code, message }` on failure
- Cap flows may return:
  - `warning` (non-blocking)
  - `requiresConfirm` (blocking until client confirms)
  - `hardLimit` (cannot proceed)

---

## 1) Profile

### GET `/api/me`
**Purpose:** return PROFILE (create if missing)

**Returns**
- `subscriptionStatus`
- `activePracticeIds`
- `todayFocusPracticeId`
- `latestAssessmentId`
- `focusPillar`
- counters + milestones summary (as available)

---

## 2) Assessment

### POST `/api/assessment`
**Purpose**
- Store assessment answers (optional ANS items)
- Compute pillar scores
- Select focus pillar
- Write ASSESS item
- Update PROFILE.latestAssessmentId + PROFILE.focusPillar

**Body**
- `answers`: `{ [questionId]: boolean }` (yes/no)

**Returns**
- `assessmentId`
- `scores`
- `focusPillar`

---

### GET `/api/assessment/latest`
**Purpose**
- Fetch the latest ASSESS summary via PROFILE.latestAssessmentId

**Returns**
- `assessment` or `null` if none

---

## 3) Practice suggestions / catalog

### GET `/api/practices/suggestions`
**Purpose**
- Return 3 suggested practices
- Influenced by latest assessment/focus pillar
- Must have fallback when no assessment exists

**Returns**
- `suggestions`: `[{ practiceId, title, pillar, rationale }]`

---

## 4) Practice lifecycle (caps, trials, pause/resume, focus)

### POST `/api/practice`
**Purpose:** all practice state transitions.
This endpoint is the **only** way to modify active/trial/paused/focus state.

**Body**
- `mode`: one of:
  - `add`
  - `replace`
  - `pause`
  - `resume`
  - `setFocus`
  - `startTrial`
  - `promoteTrial`
  - `discardTrial`
- Additional fields by mode (examples below)

---

### 4.1 `add`
**Body**
- `mode: "add"`
- `practiceId`

**Server rules**
- Enforce caps based on `subscriptionStatus`:
  - free cap=1
  - paid cap=10
- Warning thresholds on paid:
  - at 5 → include warning
  - at 7 → strong warning
- At 10 → hard stop (error)

**Returns**
- updated `activePracticeIds`
- optional `warning`

---

### 4.2 `replace`
**Body**
- `mode: "replace"`
- `removePracticeId`
- `addPracticeId`

**Server rules**
- Replacement allowed even at cap (since count remains constant)
- Must maintain pointer map `activePracticeSkById`

**Returns**
- updated `activePracticeIds`

---

### 4.3 `pause` / `resume` (Option 2 pause logic)
**Body**
- `mode: "pause"`
- `practiceId`

or

- `mode: "resume"`
- `practiceId`

**Server rules (Option 2)**
- Pausing removes from `activePracticeIds` but preserves a pointer to the UPRACTICE record:
  - keep mapping in `activePracticeSkById` (or equivalent) to locate SK for resume/history
- Resume re-adds to `activePracticeIds` subject to caps (free/paid)
- Resume should behave like `add` with cap checks + warnings

**Returns**
- updated active list
- optional warning

---

### 4.4 `setFocus`
**Body**
- `mode: "setFocus"`
- `practiceId | null`

**Server rules**
- Focus practice should generally be an active practice (unless design later changes explicitly)
- Update PROFILE.todayFocusPracticeId

---

### 4.5 Trials

#### `startTrial`
**Body**
- `mode: "startTrial"`
- `practiceId`

**Rules**
- Creates TRIAL item
- Does not affect active caps
- May limit concurrent trials (policy in trial epic, but must not impact active cap logic)

#### `promoteTrial`
**Body**
- `mode: "promoteTrial"`
- `practiceId`

**Rules**
- Converts trial into active practice
- **Must enforce caps**
- If cap reached: either error or require replace flow depending on UI strategy

#### `discardTrial`
**Body**
- `mode: "discardTrial"`
- `practiceId`

**Rules**
- Marks trial discarded/ended; no cap impact

---

## 5) Daily returns / habit loop

### POST `/api/return`
**Purpose**
- Log “did it” / “not today” for a practice on a given date
- Write into FIAPP_RETURNS (`PK USER#..#PRACTICE#..`, `SK DATE#YYYY-MM-DD`)
- Update counters + milestones based on delta

**Body**
- `practiceId`
- `date`: `YYYY-MM-DD` (server may default to “today” in user timezone if omitted)
- `didIt`: boolean

**Rules**
- Must support toggling (same date can be updated)
- Counter updates must be delta-based:
  - changing false→true increments
  - true→false decrements (or equivalent “undo”)
- Trials **do** count toward counters/milestones

**Returns**
- updated counters
- milestone triggers (if any)

---

### GET `/api/returns`
**Purpose**
- Fetch last N days of returns for rendering dots / streak visuals

**Query**
- `practiceId` (or return all active practices; implementation-specific)
- `days` (optional)

**Returns**
- list of `{ date, didIt }`

---

## 6) Progress

### GET `/api/progress`
**Purpose**
- Aggregate counters + milestones for Progress screen

**Returns**
- `counters`
- `milestones` (achieved + next-up if supported)

---

## 7) Cap warnings & confirm flow (canonical intent)

- Paid users:
  - warn at 5
  - strong warn at 7
  - hard stop at 10
- Free users:
  - hard stop at 1 (may offer “upgrade” messaging in UI)
- Trials do not consume cap.
- Confirm flows may exist in UI, but server remains the final authority.

---

## 8) Non-goals / out of scope
- No “background jobs required” for core v1 correctness (metrics/observability deferred)
- No reliance on client-only state for business rules
