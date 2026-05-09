# FIApp v1 — Claude Code Instructions

## Branching strategy — HARD RULES

**NEVER merge a PR.** The user merges all PRs manually from the GitHub web UI. Do not run
`gh pr merge`, `git merge`, or any equivalent. If the user asks you to merge, remind them
to do it from the GitHub UI.

**NEVER push directly to `main` or `staging`.** All changes go through a PR.

**Only `staging` may merge into `main`.** Feature branches merge to `staging` first.
This is enforced by the `Branch policy` CI check — do not attempt to bypass it.

**Branching flow:**
```
feat/* branch  →  PR to staging  →  test on staging URL  →  PR to main  →  production
```

After merging a feature to `main`, sync staging back up:
```
git checkout staging && git merge main && git push origin staging
```

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

| Command | What it runs | When |
|---|---|---|
| `npm run test` | Layer 1: unit tests (vitest) | CI + local |
| `npm run test:integration` | Layer 2: integration tests (vitest + dynalite) | CI + **run locally before any PR** |
| `npm run test:all` | Layer 1 + Layer 2 | Quick full local check |
| `npm run test:e2e` | Layer 3: E2E tests (Playwright, manual only) | **Run against staging before merging to main** |

**Reminder — always run before opening a PR:**
```sh
npm run test:all        # Layer 1 + Layer 2 locally
```

**Reminder — always run before merging staging → main:**
```sh
BASE_URL=https://<staging-url> npm run test:e2e   # Layer 3 against staging
```
