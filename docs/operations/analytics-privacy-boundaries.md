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
| `pillarFocus_<pillar>` | Count of times each pillar was selected as focus | `METRICS#TOTALS` |
| `DAILY#<date>.*` | Per-day counts of the above events | `METRICS#DAILY#<date>` |

All fields are counters. No user IDs, emails, or identifiers are stored alongside metrics.

---

## Forbidden — never tracked

- Individual user identifiers linked to any metric
- Assessment answers (individual yes/no responses)
- Which specific practice a user chose
- Which user belongs to which pillar focus
- Session data, device fingerprints, IP addresses
- Any field that could re-identify a user

---

## Event model

Events are fired fire-and-forget via `utils/metricsClient.ts`. They never block a request and never throw to the caller. A metrics write failure has zero impact on the user experience.

| Event | Trigger | Fields incremented |
|---|---|---|
| `signup` | New profile created in `GET /api/me` | `totalUsers`, daily `newUsers` |
| `assessment_completed` | `POST /api/assessment` success | `totalAssessments`, daily `assessments`, `pillarFocus_<pillar>` |
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
