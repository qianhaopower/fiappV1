# Epic #2 — Subscription / Plan Display

**Status:** Implemented

**Purpose:** Enable Free plan vs Plus plan gating and UI behavior.

**Success criteria:**
- PROFILE contains subscriptionStatus ✓ (from profile-defaults)
- Defaults to FREE ✓
- Returned by /api/me ✓
- Front-end displays plan state somewhere simple ✓
- Upgrade CTA exists but stubbed ✓

---

## Implementation

### Backend (already done)
- `createMyProfile` sets `subscriptionStatus: "FREE"`
- `/api/me` returns full profile including `subscriptionStatus`
- `POST /api/dev/subscription` allows dev override to internal `PAID` status

### Front-end
- **PlanBadge** (`components/PlanBadge.tsx`): shows "Free plan" or "Plus plan" pill in header (from profile context)
- **UpgradeButton** (`components/UpgradeButton.tsx`): stubbed Upgrade CTA, shown only when `subscriptionStatus === "FREE"`; click → toast "Plus plan is coming soon"
- **AppShell**: renders PlanBadge + UpgradeButton in header
- Free plan = muted pill, Plus plan = primary-tinted pill; no Upgrade button for Plus plan

### Naming rule
- Internal/database values remain `FREE | PAID`.
- User-facing labels are **Free plan** and **Plus plan**.
- `PAID` means "Plus plan capabilities" in code and tests.

### Manual test
1. Sign in → header shows "Free plan" badge + "Upgrade to Plus" button
2. Click Upgrade → toast "Plus plan is coming soon"
3. `POST /api/dev/subscription` with `{ subscriptionStatus: "PAID" }` → refresh → header shows "Plus plan", Upgrade button hidden
