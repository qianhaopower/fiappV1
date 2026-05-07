# FIApp v1 Operations Runbook

---

## Production smoke routine

Run after every deploy to verify the app is working.

### 1. Health check
```
GET https://app.friendsintelligence.net/api/health
```
Expected: `{ "ok": true, "checks": { "dynamodb": "ok" } }` with HTTP 200.
If `ok: false` or HTTP 503 — DynamoDB is unreachable. Check AWS Console → DynamoDB → Tables.

### 2. Landing page
- Open `https://friendsintelligence.net`
- Page loads, hero text visible, CTA buttons present

### 3. Auth flow
- Open `/auth`
- Sign in with a test account
- Should redirect to `/today` or `/assessment` depending on account state

### 4. Assessment
- Navigate to `/assessment`
- Answer a few questions, confirm progress bar advances
- Submit — should redirect to `/results`

### 5. Today page
- Navigate to `/today`
- Focus practice card visible
- Tap "Did it" — button fills, count increments

### 6. Admin dashboard
- Navigate to `/admin`
- Funnel numbers visible, charts render
- If 403 — `FIAPP_ADMIN_USER_ID` env var not set or wrong userId

---

## Incident response checklist

### App is down / health check fails
1. Check `GET /api/health` — note which check failed
2. AWS Console → Amplify → your app → check latest deployment status
3. AWS Console → DynamoDB → FIAPP_MAIN → check table status
4. AWS Console → CloudWatch → Log groups → `/aws/amplify/` → scan for errors
5. If recent deploy — roll back via Amplify Console → Deployments → Redeploy previous

### Users can't sign in
1. AWS Console → Cognito → User Pools → check pool status
2. Check Amplify env vars: `NEXT_PUBLIC_AMPLIFY_*` configured correctly
3. Check CloudWatch logs for `[withAuth]` errors

### Payments not working
1. Check Stripe Dashboard → Webhooks → recent events — look for failed deliveries
2. Verify `FIAPP_STRIPE_WEBHOOK_SECRET` env var in Amplify matches Stripe webhook secret
3. Verify `FIAPP_STRIPE_PRICE_ID` matches the active price in Stripe
4. CloudWatch logs for `/api/payment/webhook` errors

### DynamoDB errors in logs
1. Check IAM role attached to Amplify Lambda has `dynamodb:GetItem`, `PutItem`, `UpdateItem`, `Query` on both tables
2. Check table names match env vars `FIAPP_MAIN_TABLE`, `FIAPP_RETURNS_TABLE`

---

## Rollback procedure

1. AWS Console → Amplify → your app → Hosting → Deployments
2. Find the last known-good deployment
3. Click "Redeploy this version"
4. Run smoke routine to verify

---

## Environment variables (Amplify)

| Variable | Purpose |
|---|---|
| `FIAPP_MAIN_TABLE` | DynamoDB main table name |
| `FIAPP_RETURNS_TABLE` | DynamoDB returns table name |
| `FIAPP_AWS_ACCESS_KEY_ID` | AWS credentials for DynamoDB |
| `FIAPP_AWS_SECRET_ACCESS_KEY` | AWS credentials for DynamoDB |
| `FIAPP_AWS_REGION` | AWS region |
| `FIAPP_STRIPE_SECRET_KEY` | Stripe secret key |
| `FIAPP_STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `FIAPP_STRIPE_PRICE_ID` | Stripe price ID for Plus plan |
| `FIAPP_ADMIN_USER_ID` | Cognito userId of the operator (for /admin access) |
| `NEXT_PUBLIC_FIAPP_APP_URL` | Public app URL |

---

## CloudWatch log access

1. AWS Console → CloudWatch → Log groups
2. Look for `/aws/amplify/<app-id>` or `/aws/lambda/`
3. Key patterns to search:
   - `[withAuth] handler error` — unhandled API errors
   - `[metrics]` — metrics write failures (non-critical)
   - `[GET /api/me]` — profile creation errors
   - `ERROR` — any Lambda error

---

## Post-launch feedback

Users can email `hello@friendsintelligence.net` for support or feedback.  
Monitor inbox after launch. First 48 hours are highest signal — respond to every email.
