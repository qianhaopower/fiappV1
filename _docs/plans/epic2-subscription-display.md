# Epic #2 — Subscription / Plan Display

**Status:** Implemented

**Purpose:** Enable free vs paid gating and UI behavior.

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
- `POST /api/dev/subscription` allows dev override to PAID

### Front-end
- **PlanBadge** (`components/PlanBadge.tsx`): shows "Free" or "Premium" pill in header (from profile context)
- **UpgradeButton** (`components/UpgradeButton.tsx`): stubbed Upgrade CTA, shown only when `subscriptionStatus === "FREE"`; click → toast "Upgrade coming soon"
- **AppShell**: renders PlanBadge + UpgradeButton in header
- Free = muted pill, Paid = primary-tinted pill; no Upgrade button for Premium

### Manual test
1. Sign in → header shows "Free" badge + Upgrade button
2. Click Upgrade → toast "Upgrade coming soon"
3. `POST /api/dev/subscription` with `{ subscriptionStatus: "PAID" }` → refresh → header shows "Premium", Upgrade button hidden
