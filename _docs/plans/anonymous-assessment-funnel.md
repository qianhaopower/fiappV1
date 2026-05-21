# Anonymous Assessment Funnel — Implementation Plan

**Status:** Drafted, awaiting implementation.
**Drafted:** 2026-05-20
**Owner:** @qianhaopower
**Target:** ship to `staging` first, then `main` before LinkedIn launch.

---

## Why this PR exists

### The data
- Shared `friendsintelligence.net` to ~50-person social group on 2026-05-19.
- Amplify metrics: ~3,900 requests in the share window (≈50–130 visits at typical Next.js request fan-out).
- DynamoDB: 30 users before share → 30 users after. **Zero new signups.**
- Cognito User Pool: zero `UNCONFIRMED` accounts → no one attempted email signup.
- `/api/assessment` server log hits: 2 in 24h (the user themselves testing).
- SES out of sandbox, custom domain, DKIM healthy — email delivery is not the bug.

### The diagnosis
- The middleware-enforced auth gate on `/assessment` ([`middleware.ts:5-15`](../../middleware.ts)) means *"Start free assessment"* on the landing page is a misleading CTA. Clicking it 302-redirects an unauthenticated visitor to `/auth` before any assessment question renders.
- The friends' funnel: **Land → click "Start free assessment" → see signup wall → bounce.** Their Cognito doesn't record an attempt because they never submitted the form.
- The product itself works — 4 friends (within the existing 30) signed up earlier and completed assessments successfully. The bug is in *how the front door opens*, not in what's behind it.

### Industry comparison
Researched 13 commercial assessment/quiz/wellbeing apps. Every conversion-optimized product (16Personalities, Truity, Open Psychometrics, Noom, BetterHelp, BuzzFeed) lets the quiz run **without an account first**. The only products that gate behind signup are non-commercial academic (VIA, Penn Authentic Happiness). The current FIApp flow matches the academic pattern, not the commercial one.

---

## Goals
- Let a first-time visitor complete the 35-question assessment and see their full results (focus pillar + per-pillar scores + 3 suggested practices with descriptions and rationale) without signing up.
- Move the signup ask to immediately *after* results — gated by the "save your results / start a daily practice" payoff.
- After signup, restore the user's anonymous answers as their canonical `ASSESS#` record in DynamoDB, no retake.
- Instrument the new funnel so the LinkedIn launch produces real attribution + drop-off data.
- Update the canonical specs in the same PR so doctrine doesn't drift.

## Non-goals
- Changing the Plus-plan checkout flow (still routes through `/auth`).
- Improving landing-page copy/social proof/screenshots beyond two trivial fixes (no-account microcopy + mobile 8-min badge visibility).
- Server-side anonymous claim model (cookie UUID + `ANON#` rows). Deferred as a v2 enhancement.
- Adding share/viral mechanics ("share your focus pillar"). Deferred.
- Email-capture for "not now" visitors. Deferred.
- Fixing the Google OAuth `email_verified=NO` Cognito quirk. Out of scope; tracked separately.

---

## Design decisions (locked)

| # | Question | Decision |
|---|---|---|
| 1 | What does an anonymous user see on `/results`? | **Full disclosure** — pillar scores, focus pillar, AND the 3 suggested practices with titles, descriptions, rationale. Only the action CTA differs (`Sign up to start` instead of `Start this practice`). |
| 2 | Where does the user land after signup hydration? | **Back to `/results` with unlocked CTAs.** Same page they were just on, now with working `Start this practice` buttons. |
| 3 | Stale localStorage result on return visit | **Keep forever**, show "Your result is N days old — retake?" banner if `takenAt` > 30 days. User decides. |
| 4 | Existing authed user logs in with new localStorage from an anonymous take | **Ignore the localStorage**, preserve their server-side assessment. Drop localStorage silently. |
| 5 | Signup CTA personalization | **Pillar-aware** — "Sign up to start your Sleep practice" using `focusPillar` label. |
| 6 | Launch telemetry | **Both** — server-side structured `console.log` events at funnel boundaries AND GA4 with a cookie consent banner. |
| 7 | Cross-browser scenario (take on phone, sign up on laptop) | **Accept v1 loss.** localStorage is per-browser. Document as known limitation. |
| 8 | Anonymous user clicks a specific practice's "Sign up to start" | **Nothing carried.** After signup → `/results` unlocked → user clicks the same card again. Simpler state. |
| 9 | Cookie consent banner | **Minimal banner in this PR** before GA4 fires. Required by GDPR/UK PECR strict reading; we have a global LinkedIn audience. |
| 10 | Landing page micro-copy tweaks | **Bundle in.** Two one-line edits in the same PR. |
| 11 | localStorage invariant in canon | **Update canon** to allow transient pre-account state. |
| 12 | GA4 vs strict privacy doctrine | **Loosen doctrine** with strict scope: anonymized IPs, no PII custom params, no user-ID merging, behavioral funnel only. Update privacy doc. |

---

## Current flow vs. target flow

### Current

```
[/] -- click "Start free assessment" -->
[middleware.ts: /assessment in PROTECTED_PREFIXES, no Cognito tokens]
[302] --> [/auth] -- sign up + email confirm --> [/decideRoute]
[DecideRouteClient] reads /api/me, no latestAssessmentId --> [/onboarding]
[/onboarding] --> [/assessment]
[/assessment] -- answer 35 Qs, click Submit --> [POST /api/assessment (authed)]
[withAuth wraps everything] --> DynamoDB writes (ASSESS#, ANS#, PROFILE update)
[router.replace('/results')]
[/results] reads /api/assessment/latest + suggestions + active --> renders insights + practice cards
```

### Target

```
[/] -- click "Start free assessment" --> [/assessment]   ← PUBLIC
  - On mount: rehydrate from localStorage.assessment.draft if present
  - On answer change: persist assessment.draft
  - On submit: POST /api/assessment (no auth header) --> server computes scores

[POST /api/assessment, refactored to withOptionalAuth]
  - If session present: existing path — write ASSESS#, ANS#, update PROFILE, return assessmentId + scores
  - If no session: compute scores + focus pillar + suggested practice IDs, return result, NO DynamoDB writes

[client receives response]
  - persist localStorage.assessment.result = { answers, scoresByPillar, focusPillar, lowestPillarId, suggestedPracticeIds, takenAt, version: 1 }
  - clear localStorage.assessment.draft
  - router.replace('/results')

[/results]   ← PUBLIC, dual-mode
  - If authenticated: existing fetch path (assessment/latest, suggestions, active)
  - If anonymous: read localStorage.assessment.result; redirect to /assessment if absent
    - Render same UI; replace per-practice "Start this practice" CTAs with "Sign up to start"
    - Replace bottom CTAs with pillar-aware "Sign up to start your <Pillar> practice"
    - Show 30-day age banner if takenAt > 30 days ago

[anonymous user clicks Sign up CTA]
  → /auth (no query params; nothing carried)
  → sign up + email confirm
  → /decideRoute

[DecideRouteClient]   ← new hydration step
  - If localStorage.assessment.result is present:
      - If profile.latestAssessmentId already exists: clear localStorage, run decideRoute(profile) as today
      - Else: POST /api/assessment authed with { answers }; on 200, clear localStorage, refetch profile
              then one-shot router.replace('/results') (overrides decideRoute's default)
  - If localStorage.assessment.result is absent: existing decideRoute logic
```

`decideRoute` (the pure function in [`lib/decideRoute.ts`](../../lib/decideRoute.ts)) is **not modified**. The one-shot `/results` redirect is logic inside `DecideRouteClient` only, triggered by the presence of a localStorage entry.

---

## Architecture decisions (recap with rationale)

### A. Anonymous result computation lives on the server
- `lib/assessment/scoring.ts` (pure: `computeScores`, `pickFocusPillar`) and `getSuggestedPractices` stay server-side.
- Reasons: single source of truth for scores; algorithm not in client bundle; cheap (35 booleans → small math); one byte-identical compute path for authed and anonymous.

### B. Anonymous hydration via localStorage replay
- localStorage keys: `assessment.draft` (in-progress answers + index) and `assessment.result` (computed result).
- Schema versioned (`version: 1`) so future migrations can no-op stale data.
- On signup, `DecideRouteClient` replays `POST /api/assessment` with the stored answers; the authed branch writes ASSESS# / ANS# / PROFILE.
- Per Decision 11, this localStorage usage is added to the canon as the *one* permitted pre-account exception.

### C. localStorage lifecycle (full table)

| Event | Action |
|---|---|
| Mount `/assessment` | Read `assessment.draft`. If present, restore `answers` + `index` state. |
| Answer change | Persist updated `assessment.draft`. |
| Submit success | Save `assessment.result`. Clear `assessment.draft`. |
| Anonymous visit `/results` | Read `assessment.result`. If absent → `router.replace('/assessment')`. |
| Anonymous click "Sign up" | Keep both keys (auth flow may need to re-render). |
| Post-auth in `DecideRouteClient` | Hydrate via POST. On success clear `assessment.result`. |
| Existing user post-auth with `assessment.result` present | Clear silently, preserve server data (Decision 4). |
| User clicks "Retake" (anonymous) | Clear both keys, `router.replace('/assessment')`. |
| `takenAt` > 30 days when reading | Show banner, do not auto-clear. |

### D. Schema and contract changes

**`POST /api/assessment` becomes dual-mode.**

Anonymous response shape:
```json
{
  "scoresByPillar": { "<pillarId>": number },
  "focusPillar": "<pillarId>",
  "lowestPillarId": "<pillarId>",
  "suggestedPracticeIds": ["...", "...", "..."]
}
```

Authed response shape (unchanged from today):
```json
{
  "assessmentId": "...",
  "scoresByPillar": { "<pillarId>": number },
  "focusPillar": "<pillarId>",
  "lowestPillarId": "<pillarId>",
  "suggestedPracticeIds": ["...", "...", "..."]
}
```

The only delta: anonymous lacks `assessmentId`. Clients must tolerate both shapes.

### E. Routing change minimal-surface

`middleware.ts` removes `/assessment` and `/results` from `PROTECTED_PREFIXES`. All other protected routes (`/today`, `/practices`, `/onboarding`, `/progress`, `/account`, `/admin`, `/decideRoute`) keep their guards exactly as today.

---

## File-by-file changes

### 1. [`middleware.ts`](../../middleware.ts)

Remove `'/assessment'` and `'/results'` from `PROTECTED_PREFIXES` (lines 5–15). No other logic changes. The `hasCognitoSessionCookie` safety net and the redirect-loop protection (per `project_auth_hang_identity_pool` memory) remain intact.

### 2. [`utils/authServer.ts`](../../utils/authServer.ts)

Add a sibling helper `withOptionalAuth(req, handler)`:
- Attempts to resolve the Cognito session the same way `withAuth` does.
- Calls `handler({ user })` where `user` is the user object if authed, or `null` if not.
- Never returns 401 for missing session; only for *malformed/expired* tokens.

Keep `withAuth` unchanged. New helper is additive — same file, same module export.

### 3. [`app/api/assessment/route.ts`](../../app/api/assessment/route.ts)

Convert `POST` from `withAuth` to `withOptionalAuth`. Sketch:

```ts
export async function POST(req: Request) {
  return withOptionalAuth(req, async ({ user }) => {
    const body = (await req.json()) as { answers?: Record<string, boolean> };

    // existing answer validation (unchanged)

    const { scoresByPillar, totalScore } = computeScores(body.answers);
    const focusPillar = pickFocusPillar(scoresByPillar);
    const lowestPillarId = focusPillar;
    const suggestedPracticeIds = getSuggestedPractices(body.answers, lowestPillarId).map(p => p.id);

    // Server-side log line for funnel
    console.log(JSON.stringify({
      funnel_event: user ? 'assessment_submitted_authed' : 'assessment_submitted_anonymous',
      ts: new Date().toISOString(),
      focusPillar,
    }));

    if (!user) {
      // anonymous: compute-only, no DynamoDB writes
      return NextResponse.json(
        { focusPillar, lowestPillarId, scoresByPillar, suggestedPracticeIds },
        { status: 200 }
      );
    }

    // authed: existing persistence path
    const assessmentId = crypto.randomUUID();
    // ... existing putItem(ASSESS#), per-question putItem(ANS#), PROFILE updateItem
    trackEvent('totalAssessments', 'assessments');
    trackPillarFocus(focusPillar);

    return NextResponse.json(
      { assessmentId, focusPillar, lowestPillarId, scoresByPillar, suggestedPracticeIds },
      { status: 200 }
    );
  });
}
```

Anonymous submissions also increment a new `totalAnonymousAssessments` counter (Decision 12; see canon update in §Canon updates).

### 4. [`app/assessment/page.tsx`](../../app/assessment/page.tsx)

Changes:
- New `useEffect` on mount: read `localStorage.getItem('assessment.draft')`. If present and version matches, restore `answers` + `index` from it.
- Wrap `setAnswers`/`setIndex` updates with a helper that also persists to `localStorage` as `assessment.draft`.
- In `handleSubmit` (around lines 80–105):
  - POST as today. The browser will not send Cognito tokens if logged out — server's `withOptionalAuth` handles both cases.
  - On success: parse `{ scoresByPillar, focusPillar, lowestPillarId, suggestedPracticeIds }`.
  - Write `localStorage.assessment.result = { answers, ...computedFields, takenAt: new Date().toISOString(), version: 1 }`.
  - Clear `assessment.draft`.
  - Fire GA4 event `assessment_submitted` with `{ is_anonymous: !authStatus === 'authenticated' }`.
  - `router.replace('/results')`.
- **Remove** the 401/403 → `/auth` redirect on submit (lines 90–93). The API no longer 401s anonymous callers.

### 5. [`app/results/page.tsx`](../../app/results/page.tsx)

Introduce a mode discriminator at the top of `ResultsPage`:
```ts
const { authStatus } = useAuthenticator(c => [c.authStatus]);
const isAnonymous = authStatus !== 'authenticated';
```

Split the existing `load()` into two paths:
- **Authed path**: unchanged. Fetch `/api/assessment/latest`, `/api/practices/suggestions`, `/api/practices/active`.
- **Anonymous path**: read `localStorage.assessment.result` via the new helper module. If absent → `router.replace('/assessment')` and exit. If present, hydrate `assessment` and `suggestions` state directly from localStorage (the full practice objects can be looked up from `lib/practices/library.ts` using the stored `suggestedPracticeIds`). Skip the `/api/practices/active` fetch entirely.

Render adjustments for anonymous mode:
- Focus Pillar card: **unchanged.**
- Radar chart: **unchanged.**
- Per-pillar breakdown: **unchanged.**
- Suggested Practices section: full titles, descriptions, rationale (Decision 1). The per-practice CTA changes from `Start this practice` / `Resume` / `View on Today` to **`Sign up to start →`** (single state, since no UPRACTICE exists for anonymous users). Clicking → `router.push('/auth')`.
- Footer area: replace the existing `Go to Today` + `Retake assessment` buttons with a single pillar-aware primary CTA — `Sign up free to start your <PillarLabel> practice` — and a small `Retake (clears your result)` link that calls the localResult clear helper and navigates to `/assessment`.
- If `takenAt > 30 days ago`: render a soft banner above the focus pillar card — *"Your result is N days old — things may have changed. Retake?"* with a retake link.

GA4 event `results_viewed` fires on mount with `{ is_anonymous, focus_pillar }`.

### 6. [`components/DecideRouteClient.tsx`](../../components/DecideRouteClient.tsx)

Add a hydration step that runs after auth + profile resolve and before the existing `decideRoute(profile)` call. Sketch:

```ts
useEffect(() => {
  if (authStatus === "unauthenticated") {
    router.replace("/auth");
    return;
  }
  if (error?.status === 401 || error?.status === 403) {
    router.replace("/auth");
    return;
  }
  if (loading || !profile) return;
  if (error) return;

  let cancelled = false;

  async function go() {
    const stored = readLocalResult();

    // Existing authed user with new localStorage → silently drop, preserve server data (Decision 4).
    if (stored && profile.latestAssessmentId) {
      clearLocalResult();
      const next = decideRoute(profile as ProfileForRouting);
      if (!cancelled) router.replace(next);
      return;
    }

    // Anonymous-result post-signup hydration
    if (stored && !profile.latestAssessmentId) {
      try {
        const res = await fetch('/api/assessment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ answers: stored.answers }),
        });
        if (res.ok) {
          clearLocalResult();
          await refetch();
          console.log(JSON.stringify({ funnel_event: 'hydration_success', ts: new Date().toISOString() }));
          if (!cancelled) router.replace('/results');   // one-shot override (Decision 2)
          return;
        }
        // hydration failure — leave localStorage intact so user can retry
        console.log(JSON.stringify({ funnel_event: 'hydration_failure', ts: new Date().toISOString(), status: res.status }));
      } catch (e) {
        console.log(JSON.stringify({ funnel_event: 'hydration_error', ts: new Date().toISOString() }));
      }
      // fall through to default routing on failure
    }

    const next = decideRoute(profile as ProfileForRouting);
    if (!cancelled) router.replace(next);
  }

  go();
  return () => { cancelled = true; };
}, [authStatus, loading, profile, error, router, refetch]);
```

### 7. [`app/page.tsx`](../../app/page.tsx)

Two one-line edits:
- Below the primary `Start free assessment` button (around lines 206–211), add a small muted line: `Free · no account needed to start`.
- The `35-question · 7 pillars · about 8 minutes` pill (line 193) currently has `hidden sm:inline-flex` — replace with a layout that shows it on all breakpoints. On mobile, render it above the headline as a small chip.

### 8. New file: `lib/assessment/localResult.ts`

Typed helpers for localStorage access, single source of truth for the schema and version. Sketch:

```ts
import type { Pillar } from '@/lib/assessment/pillars';

const RESULT_KEY = 'assessment.result';
const DRAFT_KEY = 'assessment.draft';
const CURRENT_VERSION = 1;

export type LocalAssessmentResult = {
  version: 1;
  answers: Record<string, boolean>;
  scoresByPillar: Record<Pillar, number>;
  focusPillar: Pillar;
  lowestPillarId: Pillar;
  suggestedPracticeIds: string[];
  takenAt: string;  // ISO
};

export type LocalAssessmentDraft = {
  version: 1;
  answers: Record<string, boolean>;
  index: number;
  startedAt: string;
};

export function readLocalResult(): LocalAssessmentResult | null { /* JSON.parse, version check */ }
export function writeLocalResult(r: LocalAssessmentResult): void { /* serialize */ }
export function clearLocalResult(): void { /* removeItem */ }

export function readLocalDraft(): LocalAssessmentDraft | null { /* ... */ }
export function writeLocalDraft(d: LocalAssessmentDraft): void { /* ... */ }
export function clearLocalDraft(): void { /* ... */ }

export function ageInDays(takenAt: string): number { /* (Date.now() - parsed) / 86400000 */ }
```

All callers (`app/assessment/page.tsx`, `app/results/page.tsx`, `components/DecideRouteClient.tsx`) go through this module — no direct `localStorage.getItem('assessment.…')` anywhere else.

### 9. New file: `components/CookieBanner.tsx`

Minimal client component with three states: not-decided (banner shown), accepted (GA4 fires), declined (GA4 does not fire). State stored in `localStorage` under `cookie_consent: 'accepted' | 'declined'`.

```ts
"use client";
import { useEffect, useState } from "react";

const KEY = 'cookie_consent';

export function useCookieConsent(): 'accepted' | 'declined' | null {
  const [state, setState] = useState<'accepted' | 'declined' | null>(null);
  useEffect(() => {
    const v = localStorage.getItem(KEY);
    if (v === 'accepted' || v === 'declined') setState(v);
  }, []);
  return state;
}

export default function CookieBanner() {
  const consent = useCookieConsent();
  if (consent !== null) return null;
  return (
    /* fixed-bottom banner with Accept / Decline buttons that write to localStorage */
  );
}
```

Copy is short and honest — no dark patterns; both buttons equally prominent.

### 10. [`app/layout.tsx`](../../app/layout.tsx)

- Mount `<CookieBanner />` once.
- Conditionally include `<GoogleAnalytics gaId={GA_ID} />` from `@next/third-parties/google` when `cookie_consent === 'accepted'` (uses a thin client wrapper to read the consent state).
- `GA_ID` is read from `process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID`. Empty/missing = GA4 silently off.

### 11. GA4 event taxonomy

Custom events fired client-side (after consent):

| Event | Trigger | Custom params |
|---|---|---|
| `landing_viewed` | `/` mount | `utm_source`, `utm_medium`, `utm_campaign` (auto from URL) |
| `assessment_started` | `/assessment` mount | `is_anonymous: true|false` |
| `assessment_submitted` | submit success | `is_anonymous`, `focus_pillar` |
| `results_viewed` | `/results` mount | `is_anonymous`, `focus_pillar` |
| `signup_clicked` | click any "Sign up to start" CTA on /results | `focus_pillar` |
| `signup_completed` | first `/decideRoute` mount with a Cognito session that wasn't there before | (none) |
| `hydration_success` | DecideRouteClient successfully persists localStorage | `focus_pillar` |
| `hydration_failure` | DecideRouteClient fails to persist | `error_status` |

**Strict rules** (per the updated privacy doc, see Canon updates):
- No `user_id`, `email`, or any field that could identify a user.
- No raw assessment answers as custom params.
- No specific `practice_id` as custom params (Decision 8 means we don't even need to).
- Anonymized IPs (default in GA4).
- No user-ID merging across sessions.

### 12. Server-side structured log events

`console.log(JSON.stringify({ funnel_event: '...', ts: '...', ...fields }))` lines at:
- `assessment_submitted_anonymous` and `assessment_submitted_authed` (in `app/api/assessment/route.ts`)
- `hydration_success`, `hydration_failure`, `hydration_error` (in `components/DecideRouteClient.tsx`)

CloudWatch Logs Insights query (canned, for the launch retro):
```
fields @timestamp, funnel_event, focusPillar
| filter ispresent(funnel_event)
| stats count(*) as n by funnel_event
| sort n desc
```

### 13. Test plan

#### Layer 1 (unit, vitest)
- `withOptionalAuth` returns `{ user: null }` for an unauth request, `{ user: {...} }` for authed.
- `localResult` round-trip (write → read → clear).
- `localResult.readLocalResult()` returns `null` for a stale `version` field.
- `ageInDays` boundary: 29.9 days, 30.1 days.

#### Layer 2 (integration, dynalite)
- `POST /api/assessment` anonymous: 200 with `{ scoresByPillar, focusPillar, lowestPillarId, suggestedPracticeIds }`. **No** items written to FIAPP_MAIN.
- `POST /api/assessment` anonymous: increments `METRICS#TOTALS.totalAnonymousAssessments`.
- `POST /api/assessment` authed: writes ASSESS#, ANS# (×35), PROFILE update. Existing test must still pass.
- `POST /api/assessment` authed via hydration replay (called from DecideRouteClient simulation): identical outcome to direct authed call.

#### Layer 3 (E2E, Playwright, against staging before merge to main)
- Anonymous happy path: open `/`, click `Start free assessment`, answer 35 questions, see `/results` with focus pillar + 3 practice cards each showing `Sign up to start`. Click signup CTA → `/auth`, sign up + confirm, land on `/results` with `Start this practice` CTAs.
- Anonymous Google OAuth happy path: same as above but signup via Google. **Critical** — verifies localStorage survives the OAuth redirect.
- Draft survival: refresh mid-quiz → answers + position restored.
- Anonymous → existing-account-login: localStorage cleared, existing assessment served, lands on `/today`.
- Anonymous result + clear localStorage manually → `/results` redirects to `/assessment`.
- Existing authed user retake (regression): unchanged from today.

---

## Canon updates (in the same PR)

### [`_docs/canon/business-logic-v2.md`](../canon/business-logic-v2.md)

**§Routing rules — Per-route guards table:** update two rows.

Before:
```
| /assessment | authed | N/A. Always accessible (user can retake anytime). |
| /results    | authed + assessment | Always accessible. Shows latest assessment summary + suggested practices. |
```

After:
```
| /assessment | public | Public. Authed users see the same questions; submission persists for authed, returns compute-only for anonymous. |
| /results    | public | Public. Authed users load from server; anonymous users load from localStorage (set by /assessment). |
```

**§API contract — Conventions:** add an exception clause.

Before:
> All endpoints require an authenticated user; `userId` is resolved server-side from the session.

After:
> All endpoints require an authenticated user; `userId` is resolved server-side from the session. **Exception:** `POST /api/assessment` accepts anonymous submissions and returns compute-only results (no DynamoDB writes). Persistence still requires auth.

**§API contract — `POST /api/assessment`:** document the dual response.

Add a "Response (anonymous)" subsection:
```json
{
  "scoresByPillar": { "<pillarId>": number },
  "focusPillar": "<pillarId>",
  "lowestPillarId": "<pillarId>",
  "suggestedPracticeIds": ["...", "...", "..."]
}
```
And note that the authed response is the existing shape plus `assessmentId`.

**§decideRoute:** add a clarifying note.

> `decideRoute` (the pure function) is unchanged. `DecideRouteClient` may one-shot override the destination to `/results` immediately after successful anonymous-result hydration (see *Anonymous Assessment Funnel* plan). This override does not modify the pure function and only fires once per signup event.

### [`_docs/canon/db-schema.md`](../canon/db-schema.md)

**§Status / Rule:** reword the invariant.

Before:
> **Rule:** DynamoDB is the source of truth (no local-storage persistence logic).

After:
> **Rule:** DynamoDB is the source of truth for all authenticated state. `localStorage` may hold transient pre-account state — specifically `assessment.draft` (in-progress quiz answers) and `assessment.result` (anonymous-computed result). Both are cleared on signup. No other client-side persistence is allowed.

### [`docs/operations/analytics-privacy-boundaries.md`](../../docs/operations/analytics-privacy-boundaries.md)

Add a new section after §Forbidden:

**§Third-party analytics (GA4)**

> FIApp uses Google Analytics 4 for behavioral funnel analysis. GA4 sets first-party cookies and records session IDs and (anonymized) IP addresses. It is **only loaded after explicit cookie consent**.
>
> Strict scope:
> - Anonymized IPs enabled (GA4 default).
> - No PII in custom dimensions or event parameters — no email, no Cognito userId, no assessment answers, no specific practice IDs.
> - No User-ID merging across sessions.
> - Standard 14-month event data retention.
> - Cookie consent is required and gated by [`components/CookieBanner.tsx`](../../components/CookieBanner.tsx); declining keeps GA4 off entirely.
>
> Events tracked (see [`_docs/plans/anonymous-assessment-funnel.md`](../../_docs/plans/anonymous-assessment-funnel.md) §GA4 event taxonomy for the canonical list).

**§Event model — update `assessment_completed` row:**

> | `assessment_completed` | `POST /api/assessment` success (authed OR anonymous) | `totalAssessments`, daily `assessments`, `pillarFocus_<pillar>`. **Authed only** also: `pillarFocus_<pillar>`. Anonymous additionally increments `totalAnonymousAssessments`. |

Add `totalAnonymousAssessments` row to §Allowed:
> | `totalAnonymousAssessments` | Total anonymous assessment submissions (pre-signup) | `METRICS#TOTALS` |

### [`_docs/canon/launch-checklist.md`](../canon/launch-checklist.md)

**§2. Assessment** — add bullets:
- [ ] Logged-out: visit `/assessment` directly, all 35 questions load, no auth redirect
- [ ] Logged-out: refresh mid-quiz — previous answers and position restored from localStorage
- [ ] Logged-out: submit on last question → spinner visible, then redirected to `/results`

**§3. Results / Insights** — add bullets:
- [ ] Logged-out at `/results` with localStorage result: full pillar scores, focus pillar, radar chart, **3 suggested practices with full titles + descriptions + rationale**
- [ ] Logged-out per-practice CTA reads `Sign up to start →` (not `Start this practice`)
- [ ] Logged-out footer CTA is pillar-aware: `Sign up free to start your <Pillar> practice`
- [ ] Logged-out `Retake (clears your result)` link clears localStorage and lands on `/assessment`
- [ ] Logged-out at `/results` with no localStorage: redirected to `/assessment`
- [ ] Logged-out with localStorage `takenAt` > 30 days: age banner visible above focus pillar card
- [ ] After signup via email: localStorage hydrated to DynamoDB, lands on `/results` with working `Start this practice` CTAs
- [ ] After signup via Google OAuth: same — verify localStorage survived the OAuth redirect

**Add a new §13. Anonymous funnel happy path:**
- [ ] End-to-end: open incognito → `/` → click `Start free assessment` → answer all 35 Qs → see `/results` → click `Sign up to start your <Pillar> practice` → sign up → confirm email → lands back at `/results` with unlocked CTAs → click `Start this practice` → lands on `/today` with that practice active
- [ ] Same path but via Google OAuth signup — works identically
- [ ] Cookie banner appears on first visit; Accept loads GA4 (verify via GA4 Realtime); Decline keeps GA4 off

---

## Rollout

1. **Local Layer 1 + Layer 2** (`npm run test:all`) — must be green. Add the new tests in §Test plan.
2. **Update `NEXT_PUBLIC_GA4_MEASUREMENT_ID`** in Amplify env vars (staging and production properties separate).
3. **Open PR to `staging`** with the full file list + canon updates. Self-review.
4. **Manual smoke on staging** per the new launch-checklist items above. Critical: verify Google OAuth + localStorage survival.
5. **Layer 3 E2E against staging** (`BASE_URL=https://staging.d3nyg9qvz1tj5n.amplifyapp.com npm run test:e2e`).
6. **Open PR `staging` → `main`** after staging soak (≥2 hours of passive monitoring).
7. **Post-merge:** verify CloudWatch funnel events firing, GA4 Realtime showing landing/assessment events, no spike in error rate. Tag a release.
8. **LinkedIn launch** with UTM-tagged URL: `https://friendsintelligence.net/?utm_source=linkedin&utm_medium=social&utm_campaign=launch_2026_05`.

---

## Risks & open watches

1. **Google OAuth localStorage survival** (highest-risk unknown). The Cognito hosted UI redirects through `auth.<region>.amazoncognito.com` and back to the same origin. localStorage *should* survive because it's scoped to origin and the round-trip ends on the same origin. **Verify on staging before merging to main.** If broken, fall back to URL-encoded payload in the OAuth state parameter (rejected as gross in v1, but real if needed).
2. **Public POST endpoint surface area.** `/api/assessment` becomes the first unauthenticated POST. No rate limit. Burn rate at 1000 RPS ≈ a few cents/hour in Lambda. Acceptable for launch; add IP-based limit if abuse appears.
3. **Hydration retry idempotency.** If hydration partially fails (writes ASSESS# but not PROFILE update), a refresh + retry produces a *new* `assessmentId` for the same answers — second row is harmless because PROFILE.latestAssessmentId always wins, but it's a phantom. Log it; review in launch retro.
4. **Shared computer privacy.** Anonymous results in localStorage on a shared browser = next person sees the previous person's pillar scores if they hit `/results` directly. Acceptable for v1 — wellbeing scores are not high-sensitivity. Could move to `sessionStorage` later if anyone complains.
5. **Safari ITP / private browsing** caps localStorage at ~7 days or makes it ephemeral. Hydration falls through gracefully (no localStorage → no hydration → user re-takes after signup). Document in FAQ.
6. **GDPR / UK PECR exposure.** With GA4 enabled, the cookie banner is now load-bearing. If we ever ship anything that fires before consent (current plan does not), we're exposed. Manual smoke must confirm GA4 is silent on first visit until Accept is clicked.
7. **Bundle size.** `lib/practices/library.ts` is already a shared module; rendering practice cards anonymously doesn't add anything new to the client bundle. Confirm with `next build` output before/after.
8. **Cross-browser story** (Decision 7). Documented as a v1 accepted limitation. Anyone who takes the quiz on phone and signs up on laptop will retake on laptop.

---

## Effort estimate

| Item | Hours |
|---|---|
| Middleware change | 0.1 |
| `withOptionalAuth` helper + tests | 0.5 |
| `app/api/assessment/route.ts` refactor + tests | 1.0 |
| `app/assessment/page.tsx` (draft + submit) | 1.0 |
| `lib/assessment/localResult.ts` + tests | 0.5 |
| `app/results/page.tsx` anonymous mode | 2.0 |
| `DecideRouteClient.tsx` hydration | 1.0 |
| Landing tweaks (`app/page.tsx`) | 0.2 |
| `CookieBanner.tsx` + consent integration | 1.0 |
| GA4 setup (`@next/third-parties/google`, layout wiring, event hooks) | 2.0 |
| Server-side `console.log` funnel events | 0.3 |
| Canon doc updates (4 files) | 1.0 |
| Layer 3 E2E for anonymous flow | 1.5 |
| Manual smoke + bug-fix buffer | 2.0 |
| **Total** | **~14 hours** |

Realistic: two focused half-days. Aim — staging by end of day 1, main by end of day 2, LinkedIn launch day 3.

---

## Decision log

For traceability when the PR is reviewed or this plan is revisited:

- Decisions 1–10: locked during plan-shaping Q&A on 2026-05-20 (session with @qianhaopower).
- Decisions 11–12: locked after cross-checking the plan against `business-logic-v2.md`, `db-schema.md`, and `analytics-privacy-boundaries.md` — both involved updating canon doctrine, both authorized explicitly.
- Open architectural decisions A–E in §Architecture decisions: all defaulted to the "v1 simple" path; server-side anonymous claim (alternative B) explicitly deferred.

---

## Done = ?

This PR is "done" when:

1. All file changes in §File-by-file changes are merged to `staging`.
2. All four canon docs are updated and reflect the new flow.
3. Layer 1 + Layer 2 tests pass locally (`npm run test:all`).
4. Layer 3 E2E passes against staging (`BASE_URL=https://staging.d3nyg9qvz1tj5n.amplifyapp.com npm run test:e2e`).
5. Staging manual smoke confirms (i) anonymous → email signup → `/results` unlocked, (ii) anonymous → Google OAuth signup → `/results` unlocked, (iii) existing user login is unchanged, (iv) cookie banner gates GA4.
6. Merged to `main` per the branching strategy (`staging → main` only).
7. CloudWatch shows the funnel events firing on the first real visit.
8. GA4 Realtime shows the funnel events firing on the first real visit.

Then we're ready for LinkedIn.
