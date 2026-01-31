# docs/canon/db-schema.md
# FIApp v1 — DynamoDB Canonical Schema (LOCKED)

**Status:** Canonical / locked for FIApp v1  
**Tables:** 2 (FIAPP_MAIN + FIAPP_RETURNS)  
**Rule:** DynamoDB is the source of truth (no local-storage persistence logic).

---

## 1) Table: FIAPP_MAIN (Single-table design)

### 1.1 Primary keys
- **PK:** `USER#<userId>`
- **SK:** multiple entity types (see below)

### 1.2 Item types (by SK prefix)

#### A) PROFILE (single item per user)
- **SK:** `PROFILE`
- **Purpose:** user-level state, caps, focus pointers, counters, milestones pointers.
- **Fields (canonical):**
  - `subscriptionStatus`: `"free" | "paid"` (dev override allowed elsewhere; schema supports both)
  - `activePracticeIds`: `string[]` (IDs)
  - `activePracticeSkById`: `{ [practiceId: string]: string }`  
    - Used by **Option 2 pause logic** (lets you locate the user-practice record SK even if “paused”)
  - `todayFocusPracticeId`: `string | null`
  - `latestAssessmentId`: `string | null`
  - `focusPillar`: `string | null`
  - `returnCounters`: object (aggregate counters; exact names defined in Counters & Milestones epic)
  - `practiceCounters`: object (aggregate counters; exact names defined in Counters & Milestones epic)
  - `milestonesAchieved`: `string[]` (or equivalent set-like representation)

> **Invariant:** Any user experience that depends on state must be derivable from PROFILE + related items.

---

#### B) UPRACTICE (user practice history / lifecycle)
- **SK:** `UPRACTICE#<startedAt>#<practiceId>`
- **Purpose:** canonical record of a practice the user has engaged with (active/paused/resumed history)
- **Fields (typical, canonical intent):**
  - `practiceId`
  - `startedAt` (ISO string)
  - `status`: `"active" | "paused" | "ended"` (implementation-specific but must support pause/resume)
  - `isFocusEligible`: boolean (optional)
  - `endedAt` (optional)

> **Invariant:** “Active practices” is a derived concept: PROFILE has the current active list; UPRACTICE holds lifecycle/history.

---

#### C) ASSESS (assessment summary)
- **SK:** `ASSESS#<assessmentId>`
- **Purpose:** store computed results + metadata
- **Fields:**
  - `assessmentId`
  - `createdAt`
  - `scores` (pillar scores)
  - `focusPillar` (computed)
  - `rawSummary` (optional)

---

#### D) ANS (optional per-question answers)
- **SK:** `ANS#<assessmentId>#<questionId>`
- **Purpose:** optional detail answers (can be omitted in v1 if you only need ASSESS summary)
- **Fields:**
  - `assessmentId`
  - `questionId`
  - `answer` (yes/no)

---

#### E) MILESTONE definitions (static-ish per user)
- **SK:** `MILESTONE#<type>#<threshold>`
- **Purpose:** milestone definition rows and/or per-user milestone state
- **Fields:**
  - `type`
  - `threshold`
  - `title`, `description` (optional)
  - `triggeredAt` (when achieved) OR “achieved” in PROFILE list

> **Invariant:** Milestone triggering must be idempotent.

---

#### F) TRIAL (trial practice items)
- **SK:** `TRIAL#<startedAt>#<practiceId>`
- **Purpose:** record trial practice lifecycle.
- **Critical policy:**
  - Trials **DO NOT** count toward **active practice caps**
  - Trials **DO** count toward **counters & milestones**
- **Fields (typical):**
  - `practiceId`
  - `startedAt`
  - `expiresAt`
  - `status`: `"active" | "expired" | "promoted" | "discarded"`

---

## 2) Table: FIAPP_RETURNS (time-series)

### 2.1 Primary keys
- **PK:** `USER#<userId>#PRACTICE#<practiceId>`
- **SK:** `DATE#YYYY-MM-DD`

### 2.2 Purpose
Stores daily completion signal per practice per day.

### 2.3 Fields
- `didIt`: boolean  
  - `true` = completed  
  - `false` = explicitly not completed (or “not today” depending on UI semantics)
- Optional:
  - `updatedAt`
  - `source` (if needed)

> **Invariant:** Daily return toggling must be supported (changing a day from true→false or false→true) and counter deltas must reflect the change.

---

## 3) Caps & Policy (schema-dependent)

### 3.1 Caps
- Free: **1 active practice**
- Paid: **10 active practices hard cap**
- Warning thresholds: **5 (soft), 7 (strong), 10 (hard stop)**

### 3.2 Trials policy
- Trials don’t consume caps
- Trials still influence counters/milestones

---

## 4) Access Patterns (canonical intent)

- Load profile: `PK=USER#<id>, SK=PROFILE`
- List active practices (metadata):  
  - Read PROFILE first → get `activePracticeSkById` pointers → batch-get UPRACTICE items
- Latest assessment: PROFILE.latestAssessmentId → get `ASSESS#...`
- Practice history: query `PK=USER#<id>` where `SK begins_with "UPRACTICE#"`
- Trial list: query `PK=USER#<id>` where `SK begins_with "TRIAL#"`
- Returns dots for a practice: query `PK=USER#<id>#PRACTICE#<practiceId>` for last N `DATE#...`

---

## 5) Hard invariants (do not break)
- PROFILE is the authoritative pointer hub.
- Active practice list/caps enforced server-side.
- Trials never count toward caps; always count toward counters/milestones.
- Returns table is append/update by date key, not embedded arrays in PROFILE.
