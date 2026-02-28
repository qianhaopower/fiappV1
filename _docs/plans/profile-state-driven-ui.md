# Profile State-Driven UI

**Status:** Implemented

**Purpose:** Make UI state-driven from backend profile response.

**Success criteria:**
- App fetches /api/me after auth ✓
- Stores profile in client state ✓
- Handles loading/error cleanly ✓
- Renders subscription status + basic info ✓

---

## Implementation

### ProfileContext (`contexts/ProfileContext.tsx`)
- Fetches `GET /api/me` when `authStatus === "authenticated"`
- Stores `profile`, `loading`, `error`, `refetch` in React context
- Provides `useProfile()` hook for consumers
- Handles 401/403 by setting error (consumers redirect to /auth)

### ProfileProvider
- Wraps app content in `AppChrome`
- Runs fetch on mount when authenticated
- Profile persists across navigation (single fetch)

### Consumers
- **PlanBadge** – reads `profile.subscriptionStatus` from context, no direct fetch
- **DecideRouteClient** – uses profile for routing; shows Loading/Error states appropriately

### Loading/Error handling
- **Loading:** `FullPageSpinner` with "Loading..." or "Redirecting..."
- **Error (401/403):** Redirect to /auth
- **Error (5xx/network):** Error card with Retry button
