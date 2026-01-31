# FIApp v1 — FRIENDS Intelligence App

Science-based wellbeing assessment + coaching product using the F.R.I.E.N.D.S Intelligence framework.

**Frontend + Backend:** Next.js (App Router)  
**Hosting:** AWS Amplify  
**Database:** DynamoDB (FIAPP_MAIN, FIAPP_RETURNS)

---

## What this app does (v1)
- Run a 7-pillar assessment (35 yes/no questions)
- Compute pillar scores + choose focus pillar
- Suggest small “practices” based on results
- Let users activate practices (free vs paid caps)
- Track daily returns (did it / not today)
- Show progress via counters + milestones

---

## Tech stack
- Next.js (TypeScript, App Router)
- AWS Amplify (build + hosting)
- DynamoDB (single-table pattern + returns time-series)
- (Optional later) Observability: CloudWatch dashboards, structured logs

---

## Local development

### 1) Install
```bash
npm install
