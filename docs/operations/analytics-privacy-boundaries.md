# Analytics Privacy Boundaries

FIApp v1 collects only aggregate, non-personal metrics. This document defines exactly what is and is not tracked.

---

## Allowed — aggregate counters only

| Field | What it counts | Where stored |
|---|---|---|
| `totalUsers` | Total profiles ever created | `METRICS#TOTALS` |
| `totalAssessments` | Total assessments submitted | `METRICS#TOTALS` |
| `totalTrials` | Total trial practices started | `METRICS#TOTALS` |
| `totalPromotions` | Total trials promoted to active | `METRICS#TOTALS` |
| `totalReturns` | Total `didIt=true` returns logged | `METRICS#TOTALS` |
| `totalAnonymousAssessments` | Total anonymous (pre-signup) assessment submissions | `METRICS#TOTALS` |
| `pillarFocus_<pillar>` | Count of times each pillar was selected as focus | `METRICS#TOTALS` |
| `DAILY#<date>.*` | Per-day counts of the above events | `METRICS#DAILY#<date>` |

All fields are counters. No user IDs, emails, or identifiers are stored alongside metrics.

---

## Forbidden — never tracked

The rules below apply to the FIAPP-owned metrics system. GA4 has its own scoped allowances; see §Third-party analytics (GA4) below.

- Individual user identifiers linked to any FIAPP metric
- Assessment answers (individual yes/no responses) — anywhere, including GA4
- Which specific practice a user chose — anywhere, including GA4
- A specific user's pillar focus tied to an identifier — anywhere, including GA4
- Session data, device fingerprints, or IPs in our own metrics (GA4 receives a GA-generated client ID + anonymized IP under the §Third-party analytics scope)
- Any field that could re-identify a user

---

## Event model

Events are fired fire-and-forget via `utils/metricsClient.ts`. They never block a request and never throw to the caller. A metrics write failure has zero impact on the user experience.

| Event | Trigger | Fields incremented |
|---|---|---|
| `signup` | New profile created in `GET /api/me` | `totalUsers`, daily `newUsers` |
| `assessment_completed` | `POST /api/assessment` success (authed) | `totalAssessments`, daily `assessments`, `pillarFocus_<pillar>` |
| `assessment_completed_anonymous` | `POST /api/assessment` success (anonymous, pre-signup) | `totalAnonymousAssessments`, daily `anonymousAssessments` |
| `trial_started` | `POST /api/practice` mode=startTrial success | `totalTrials`, daily `trials` |
| `trial_promoted` | `POST /api/practice` mode=promoteTrial success | `totalPromotions` |
| `return_logged` | `POST /api/return` with `didIt=true` and `delta > 0` | `totalReturns`, daily `returns` |

---

## Data retention

- `METRICS#TOTALS` — no expiry, permanent running totals
- `METRICS#DAILY#<date>` — TTL of 90 days set on write

---

## Access

Metrics are only accessible via `GET /api/admin/metrics`, which requires the caller's Cognito `userId` to match the `FIAPP_ADMIN_USER_ID` environment variable. No metrics data is exposed to regular authenticated users.

---

## Third-party analytics (GA4)

FIApp v1 uses Google Analytics 4 (GA4) for behavioral funnel analysis around the anonymous assessment funnel and signup conversion. GA4 sets first-party cookies and records (anonymized) IP addresses and a GA-generated client ID. This is a deliberate trade — the strict aggregate-counter posture above does not give source/medium attribution or drop-off insight, both of which are load-bearing for the LinkedIn launch ([anonymous-assessment-funnel](../../_docs/plans/anonymous-assessment-funnel.md)).

### Strict scope

- **Cookie consent is required.** GA4 is gated by [`components/CookieBanner.tsx`](../../components/CookieBanner.tsx). On first visit the banner shows and GA4 is not loaded. Decline keeps GA4 entirely off. Accept loads GA4 via [`components/GA4Loader.tsx`](../../components/GA4Loader.tsx) using `@next/third-parties/google`.
- **Anonymized IPs enabled.** Default in GA4; verify in Admin → Property Settings.
- **Google Signals OFF.** This would merge identities across devices via Google account — explicit privacy violation here.
- **No User-ID feature.** We never call `gtag('config', id, { user_id: ... })`. The Cognito `userId` never reaches GA4.
- **No PII in custom dimensions or event params.** No email, no Cognito userId, no raw assessment answers, no specific practice IDs.
- **Standard 14-month event data retention.** Set explicitly in Admin → Data Settings → Data Retention.

### Allowed event params

Only these are permitted on custom events fired through [`lib/analytics.ts`](../../lib/analytics.ts):

- `is_anonymous: boolean` — authed vs. anonymous caller
- `focus_pillar: <pillarId>` — the seven canonical pillar IDs only (`financial`, `relationship`, etc.); never a user-readable label
- `source: "practice_card" | "results_bottom"` — which CTA fired a signup click
- `error_status: number` — HTTP status code on hydration failure

Any new custom param must be added to this list. Adding raw answers, identifiers, or freeform user text is forbidden — that's the line.

### Event taxonomy (client-side GA4)

| Event | Fires from | Params |
|---|---|---|
| `assessment_started` | `/assessment` mount | `is_anonymous` |
| `assessment_submitted` | submit success | `is_anonymous`, `focus_pillar` |
| `results_viewed` | `/results` mount with data loaded | `is_anonymous`, `focus_pillar` |
| `signup_clicked` | "Sign up to start" CTA click on `/results` | `focus_pillar`, `source` |
| `signup_completed` | first `/decideRoute` pass after hydration success | (none) |
| `hydration_success` | post-signup persistence success | `focus_pillar` |
| `hydration_failure` | post-signup persistence failure | `error_status` |

GA4's built-in `page_view` covers landing/visit counting — we don't fire a custom `landing_viewed`.

### Server-side funnel events (CloudWatch)

Parallel to GA4, the server emits structured `console.log(JSON.stringify({ funnel_event, ts, ... }))` lines from `POST /api/assessment` and `DecideRouteClient`. These are anonymous by design (no userId field set for anonymous submissions). Use them as a non-cookie-gated funnel signal in CloudWatch Logs Insights:

```
fields @timestamp, funnel_event, focusPillar
| filter ispresent(funnel_event)
| stats count(*) as n by funnel_event
| sort n desc
```
