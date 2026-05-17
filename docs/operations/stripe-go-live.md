# Stripe — Test → Live Cutover Playbook

Goal: take payments from real users on production while keeping staging on Stripe test mode.

After this is done:
- `friendsintelligence.net` → Stripe **live** mode → real cards → real money
- `staging.d3nyg9qvz1tj5n.amplifyapp.com` → Stripe **test** mode → test cards only
- `localhost:3000` → Stripe test mode (unchanged)

---

## Verified current state (as of 2026-05-16)

Audit performed by reading source + Stripe docs. Findings:

- Integration is **3 files + 3 env vars**:
  - [utils/stripeClient.ts](../../utils/stripeClient.ts) — SDK singleton, reads `FIAPP_STRIPE_SECRET_KEY`. API version pinned to `2026-04-22.dahlia` (current).
  - [app/api/payment/checkout/route.ts](../../app/api/payment/checkout/route.ts) — Creates Checkout Session, reads `FIAPP_STRIPE_PRICE_ID`.
  - [app/api/payment/webhook/route.ts](../../app/api/payment/webhook/route.ts) — Handles `checkout.session.completed`, reads `FIAPP_STRIPE_WEBHOOK_SECRET`.
- Stripe SDK: `stripe@^22.1.0`.
- Mode: `payment` (one-time), A$19 lifetime — not a subscription.
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is in `.env.local` but **zero code references**. Dead config — ignore for go-live.
- Webhook only listens for `checkout.session.completed`. No event-ID idempotency, no refund handler.
- `/api/payment/checkout` does **not** check current `subscriptionStatus` → a PAID user can be charged a second time. Real bug.
- `AuthUser` exposes `{ userId, username }` only — no email. Stripe Checkout collects email on its hosted page anyway.

---

## Phase 0 — Start the slowest dependency today

- [ ] Begin Stripe AU account activation: Dashboard → "Activate payments." Submit ABN/ACN, business address, AUD bank account, photo ID, selfie, beneficial owners >25%. Typical KYC turnaround: same-day to 48h, occasionally longer.

---

## Phase 1 — Code hardening (PR against `staging`, then `main`)

All three are launch blockers. Run on test keys; merge before flipping live.

- [ ] **1.1 Re-purchase guard** — In [app/api/payment/checkout/route.ts](../../app/api/payment/checkout/route.ts), read the user's profile from DynamoDB before creating the session. If `subscriptionStatus === "PAID"`, return 409 `{ code: "ALREADY_PAID" }`.
- [ ] **1.2 Event-ID idempotency** — In [app/api/payment/webhook/route.ts](../../app/api/payment/webhook/route.ts), before processing each event, conditionally write `{ PK: "STRIPE_EVENT#<event.id>", SK: "META", createdAt }` with "if not exists." If the write fails (duplicate), short-circuit with `{ received: true }`.
- [ ] **1.3 Refund + dispute handlers** — Add branches for `charge.refunded` and `charge.dispute.created` that flip `subscriptionStatus` back to `FREE`. To map event → userId: simplest path is to also stamp `metadata: { userId }` onto `payment_intent_data` when creating the Checkout Session, so refund events carry userId directly.
- [ ] **1.4 Update runbook** — Note in [docs/operations/runbook.md](runbook.md) that live keys live in the `main`-branch override (not "All branches"), and add the `STRIPE_EVENT#*` item shape under the Payments section.
- [ ] **1.5 Staging end-to-end test (test mode)**:
  - [ ] Checkout with test card `4242 4242 4242 4242` → confirm `subscriptionStatus = "PAID"`.
  - [ ] POST a second time → confirm 409.
  - [ ] Resend the same webhook event from Stripe Dashboard → confirm second delivery is a no-op.
  - [ ] Refund the test charge → confirm `subscriptionStatus = "FREE"`.
  - [ ] Open a test dispute → confirm `subscriptionStatus = "FREE"`.

---

## Phase 2 — Stripe Dashboard (after activation completes)

All steps below in **Live mode** (toggle in Dashboard).

- [ ] **2.1 Account settings**
  - [ ] Support email: `hello@friendsintelligence.net`
  - [ ] Business URL: `https://friendsintelligence.net`
  - [ ] Statement descriptor (≤22 chars, shows on cardholder statements): e.g. `FRIENDS INTEL`
  - [ ] Settings → Emails: enable "Successful payments" and "Refunds" so customers auto-receive receipts.
- [ ] **2.2 Create live Product + Price**
  - [ ] Product: "Plus plan"
  - [ ] Price: A$19.00 AUD, **one-time** (recurring off)
  - [ ] Copy the `price_…` ID → record here: `_______________________`
- [ ] **2.3 Create restricted API key**
  - [ ] Developers → API keys → Create restricted key
  - [ ] Permission: **Checkout Sessions: write** (only thing code uses)
  - [ ] Copy `rk_live_…` → record here: `_______________________`
- [ ] **2.4 Register live webhook**
  - [ ] URL: `https://friendsintelligence.net/api/payment/webhook`
  - [ ] Events: `checkout.session.completed`, `charge.refunded`, `charge.dispute.created`
  - [ ] Copy the new `whsec_…` → record here: `_______________________`

---

## Phase 3 — Cutover

- [ ] **3.1 Amplify Console env var overrides on `main` only**
  Amplify Console → app → Hosting → Environment variables. For each var below, click Actions → "Add variable override" for branch `main`. **Leave the "All branches" default as the test value** so staging stays on test mode.
  - [ ] `FIAPP_STRIPE_SECRET_KEY` → `rk_live_…` (or `sk_live_…`) from 2.3
  - [ ] `FIAPP_STRIPE_WEBHOOK_SECRET` → `whsec_…` from 2.4
  - [ ] `FIAPP_STRIPE_PRICE_ID` → `price_…` from 2.2
- [ ] **3.2 Trigger a `main` rebuild** so the new env vars flow into `.env.production` via [amplify.yml:27](../../amplify.yml#L27). Push a no-op commit or use "Redeploy this version" in Amplify Hosting.
- [ ] **3.3 Live smoke test on `friendsintelligence.net`**
  - [ ] Charge yourself A$19 with a real card.
  - [ ] Stripe Dashboard (Live) → Payments shows the charge.
  - [ ] Dashboard → Webhooks → recent events shows 200 for `checkout.session.completed`.
  - [ ] DynamoDB `FIAPP_MAIN`: your user PROFILE has `subscriptionStatus = "PAID"`.
  - [ ] App UI shows "Plus plan" and 10-practice cap.
  - [ ] Refund yourself in the Dashboard → webhook delivers 200 for `charge.refunded` → DynamoDB shows `subscriptionStatus = "FREE"` again.
- [ ] **3.4 Confirm staging is still test-mode**
  - [ ] Open `https://staging.d3nyg9qvz1tj5n.amplifyapp.com`, run the upgrade flow, confirm the Stripe-hosted Checkout page shows "Test mode."
- [ ] **3.5 Close out**
  - [ ] Mark Stripe TODO done in [TODO.md:34](../../TODO.md#L34).
  - [ ] Monitor Stripe webhook delivery dashboard for 24h after first real customer.

---

## Pre-flight conditions (verify before Phase 3)

For "staging=test, prod=live" to actually hold, three things must be true. Confirm each before flipping:

1. **Current Amplify env vars are "All branches"-scoped.** Open the Amplify Console env vars page and confirm the three `FIAPP_STRIPE_*` rows show no per-branch overrides today. If they do, the override pattern in 3.1 still works but check current values first to avoid surprises.
2. **A Stripe test-mode webhook is registered for the staging URL.** In Stripe Dashboard → Test mode → Webhooks, confirm one endpoint exists pointing at `https://staging.d3nyg9qvz1tj5n.amplifyapp.com/api/payment/webhook` and that its signing secret matches the current value of `FIAPP_STRIPE_WEBHOOK_SECRET` in Amplify. If not, register/repoint it before cutover or staging will silently stop granting Plus.
3. **Live mode is fully activated** (not "Limited" or "Activation pending"). Dashboard top bar shows "Live mode" toggle enabled without warnings.

---

## Rollback / failure modes

| Symptom | Likely cause | Recovery |
|---|---|---|
| Live charge succeeds, user stays FREE | `FIAPP_STRIPE_WEBHOOK_SECRET` on `main` is wrong (test value, or stale) | Update Amplify env, redeploy. Manually set `subscriptionStatus = "PAID"` in DynamoDB or replay the event from Stripe Dashboard. |
| Staging starts taking real money | Live key landed on "All branches" instead of `main` override | Move the live value into a `main`-only override; restore test value on "All branches." |
| First user gets charged twice | Phase 1.1 (re-purchase guard) wasn't merged before cutover | Refund manually; ship 1.1 immediately. |
| Webhook delivers twice → state ping-pong | Phase 1.2 (event-ID idempotency) wasn't merged | Ship 1.2 before enabling refund handler in production. |
| Stripe activation stuck | Missing doc, bank rejection | Dashboard → Activate payments → "Tasks remaining." |
| Customer reports paid but no Plus | Webhook delivery failed (404, 500, signature mismatch) | Dashboard → Webhooks → recent events → inspect; click "Resend" after fixing root cause. |

---

## Reference

- Stripe go-live checklist: https://docs.stripe.com/get-started/checklist/go-live
- Stripe fulfill orders (webhook idempotency): https://docs.stripe.com/payments/checkout/fulfill-orders
- Stripe event types: https://docs.stripe.com/api/events/types
- Stripe AU business verification: https://support.stripe.com/questions/business-information-requirements-to-use-stripe
- Amplify Hosting env vars (branch overrides): https://docs.aws.amazon.com/amplify/latest/userguide/environment-variables.html
