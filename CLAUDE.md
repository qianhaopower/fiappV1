# FIApp v1 — Claude Code Instructions

## E2E tests (Layer 3) — SAFETY RULES

**NEVER run `npm run test:e2e` or `npx playwright test` unless one of these is true:**

1. The app is running locally (`BASE_URL` is localhost or not set), OR
2. `E2E_EMAIL` is set to `qianhaopower+e2etest@gmail.com` (the dedicated test account)

The tests write real data to DynamoDB (logging returns, etc.). Running them against
production with a real user account will corrupt that user's data.

The global setup enforces this with a hard error, but do not attempt to bypass it.

### How to run E2E tests

1. Copy `.env.test.local.example` → `.env.test.local` and fill in the test account password
2. Make sure the local dev server is running (`npm run dev`)
3. Run: `npm run test:e2e`

To target staging or production (test account only):
```
BASE_URL=https://your-staging-url.com npm run test:e2e
BASE_URL=https://your-production-url.com npm run test:e2e
```

## Test commands

| Command | What it runs |
|---|---|
| `npm run test` | Layer 1: unit tests (vitest) |
| `npm run test:integration` | Layer 2: integration tests (vitest + dynalite) |
| `npm run test:all` | Layer 1 + Layer 2 |
| `npm run test:e2e` | Layer 3: E2E tests (Playwright, manual only) |
