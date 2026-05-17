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
1. Identify which environment: `friendsintelligence.net` (live) vs `staging.d3nyg9qvz1tj5n.amplifyapp.com` (Sandbox/test).
2. Stripe Dashboard → switch to **Live mode** for prod issues, **Sandbox** for staging issues.
3. Workbench → Webhooks → click the relevant endpoint → "Event deliveries" tab. Look for failed deliveries (non-2xx).
4. Common failure modes:
   - **400 "Invalid signature"** → `FIAPP_STRIPE_WEBHOOK_SECRET` mismatch. Verify the value in Amplify Console (live secret on `main` override, test secret on All branches) matches the secret in the Stripe Dashboard webhook detail page. Redeploy after editing.
   - **400 "Missing userId"** → Checkout Session was created without `metadata.userId`. Inspect the event payload; should not happen with current code.
   - **500 "DB update failed"** → DynamoDB issue. Check IAM permissions + CloudWatch logs.
5. Manual replay: in the webhook event detail in Stripe Dashboard, click "Resend." If the event ID was already claimed by an earlier delivery, you may need to first delete the `STRIPE_EVENT#<event.id>` row from DynamoDB so the claim can be re-acquired.
6. To manually flip a user: AWS Console → DynamoDB → FIAPP_MAIN → query `PK=USER#<userId>, SK=PROFILE` → set `subscriptionStatus` to `PAID` or `FREE`.

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
| `FIAPP_STRIPE_SECRET_KEY` | Stripe secret/restricted key. **All branches** = test (`sk_test_…`); **`main` override** = live (`rk_live_…`). |
| `FIAPP_STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret. **All branches** = Sandbox webhook secret; **`main` override** = live webhook secret. |
| `FIAPP_STRIPE_PRICE_ID` | Stripe price ID for Plus plan. **All branches** = test price; **`main` override** = live price (A$19 AUD one-time). |
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

---

## Stripe configuration reference

Live mode went online 2026-05-17. Two environments are wired up:

| Env | URL | Stripe environment | Webhook subscribes to |
|---|---|---|---|
| Production | `https://friendsintelligence.net` | **Live mode** | `checkout.session.completed`, `charge.refunded`, `charge.dispute.created` |
| Staging | `https://staging.d3nyg9qvz1tj5n.amplifyapp.com` | **Sandbox** (legacy test mode) | Same three events |

Both webhooks deliver to `/api/payment/webhook` on their respective host.

**Restricted key permissions** (live `rk_live_…` key, named `fiapp-server`):
- Checkout Sessions: Write
- PaymentIntents: Read
- All other resources: None

**Refund/dispute downgrade**: refunds (full only — partial refunds keep access) and disputes flip `subscriptionStatus` back to `FREE`. Webhook is idempotent via `STRIPE_EVENT#<event.id>` rows in DynamoDB.

**Re-purchase guard**: `POST /api/payment/checkout` returns 409 `ALREADY_PAID` for users already on Plus.

Full go-live playbook (with rollback): [stripe-go-live.md](./stripe-go-live.md).
