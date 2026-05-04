# Epic #2 — Dev Subscription Toggle Plan

**Status:** Implemented

**Purpose:** Allow testing Plus plan flows without payment integration.

**Success criteria:**
- Dev can toggle subscriptionStatus ✓
- Prod unaffected ✓
- UI reacts immediately ✓

---

## Local setup

Add to `.env.local`:
```
NEXT_PUBLIC_FIAPP_DEV_SUBSCRIPTION=true
```
Restart dev server. The "Free | Plus" toggle appears in the header. Click to switch; UI updates immediately.

---

## Current State

| Item | Status |
|------|--------|
| **POST /api/dev/subscription** | Exists; gated by `NODE_ENV === "production"` → 404 in prod |
| **setMySubscriptionStatus** | Updates PROFILE in DynamoDB |
| **ProfileContext.refetch** | Exposed via `useProfile().refetch()` |
| **Dev UI control** | Missing — dev must use curl/Postman |
| **Auto-refresh after API call** | Missing — page refresh required to see change |

---

## Plan

### Step 1: Ensure dev endpoint is properly gated

**File:** `app/api/dev/subscription/route.ts`

- Already returns 404 when `NODE_ENV === "production"`. No change if that suffices.
- Optional: add `FIAPP_SUBSCRIPTION_DEV_MODE` check so the route is disabled even in non-prod when explicitly turned off. Low priority.

**Verification:** Deploy to prod → `POST /api/dev/subscription` returns 404.

---

### Step 2: Add dev-only env flag for UI

**Files:** `.env.example`, `next.config.*` (if needed)

Add `NEXT_PUBLIC_FIAPP_DEV_SUBSCRIPTION=true` so the client can gate the dev control. In production, omit or set to `false`; the control will not render.

---

### Step 3: Create DevSubscriptionToggle component

**File:** `components/DevSubscriptionToggle.tsx` (new)

- Client component
- Renders only when `process.env.NEXT_PUBLIC_FIAPP_DEV_SUBSCRIPTION === "true"`
- Shows Free | Plus toggle (or two buttons: "Set Free" / "Set Plus")
- On click:
  1. `POST /api/dev/subscription` with `{ subscriptionStatus: "FREE" | "PAID" }`
  2. On success: call `refetch()` from `useProfile()`
  3. On error: show toast
- Place in header near PlanBadge (e.g. only when dev flag is on)
- Uses outline/ghost styling so it’s clearly dev-only

---

### Step 4: Integrate into AppShell

**File:** `components/layout/AppShell.tsx`

- Import and render `<DevSubscriptionToggle />` in the header (e.g. next to PlanBadge)
- Wrapped in same visibility check or inside component

---

### Step 5: Refetch flow

**File:** `contexts/ProfileContext.tsx`

- No change; `refetch` is already exposed
- DevSubscriptionToggle will call `refetch()` after a successful POST

**Flow:**
1. User clicks "Set Plus" in DevSubscriptionToggle
2. POST /api/dev/subscription with `{ subscriptionStatus: "PAID" }`
3. API updates PROFILE.subscriptionStatus via setMySubscriptionStatus
4. On success, DevSubscriptionToggle calls `refetch()`
5. ProfileContext fetches `/api/me` and updates state
6. PlanBadge and UpgradeButton re-render with new status (Plus plan, no Upgrade button)

---

### Step 6: Manual verification

1. Set `NEXT_PUBLIC_FIAPP_DEV_SUBSCRIPTION=true` in `.env.local`
2. Restart dev server (env vars need rebuild)
3. Sign in → dev toggle appears in header
4. Click "Set Plus" → PlanBadge shows Plus plan, Upgrade button hides
5. Click "Set Free" → PlanBadge shows Free plan, Upgrade button appears
6. No full page refresh required

---

## Files to touch

| File | Action |
|------|--------|
| `app/api/dev/subscription/route.ts` | Verify prod gate (no change if already correct) |
| `.env.example` | Add `NEXT_PUBLIC_FIAPP_DEV_SUBSCRIPTION` |
| `components/DevSubscriptionToggle.tsx` | **New** — dev-only toggle UI |
| `components/layout/AppShell.tsx` | Add DevSubscriptionToggle to header |

---

## Estimated effort

~30 minutes
