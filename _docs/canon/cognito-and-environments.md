# Cognito User Pools, Environments & Local Dev — Reference

This document captures how authentication, data, and environment configuration
work across local / staging / production, plus the lessons learned from the
2026-05-09 incident where the production Cognito user pool was accidentally
deleted. Read this before making changes to anything in `amplify/` or before
deleting AWS resources directly.

**For a short "how do I get `npm run dev` running on a fresh checkout" recipe,
see [local-dev.md](./local-dev.md).** This doc is the deep reference; that one
is the quickstart.

---

## 1. The mental model

### One Amplify app, three environments

The single Next.js app at `friendsintelligence.net` runs on **three different
backends**:

| Environment | Where the frontend runs | Which backend it talks to |
|---|---|---|
| **Local** (`npm run dev`) | `localhost:3000` on your machine | Whatever `amplify_outputs.json` + `.env.local` point at (we point at staging) |
| **Staging** | `https://staging.d3nyg9qvz1tj5n.amplifyapp.com` (Amplify hosting) | Staging-specific Cognito + DynamoDB + AppSync |
| **Production** | `https://friendsintelligence.net` (Amplify hosting) | Production Cognito + DynamoDB + AppSync |

The **same code** runs in all three — only the config differs.

### Each environment owns its own AWS resources

Amplify Gen 2 provisions a complete backend per branch via
`npx ampx pipeline-deploy`. That includes:

- 1 Cognito **user pool** (where users + passwords live)
- 1 Cognito **identity pool** (for AWS IAM credential brokering)
- 1 AppSync GraphQL API
- 1 set of Lambda function handlers
- DynamoDB tables (sometimes — see § 4)

Staging and production have **completely separate** Cognito pools. A user who
signs up on staging does **not** exist on production, and vice versa.

### user pool ≈ DynamoDB table = "a collection"

A Cognito user pool is essentially a collection of user records. Think of it
like a DynamoDB table whose rows are users. Each row has an email, a hashed
password, sub (user ID), maybe federated identity links, etc.

When you "delete a user pool" you delete the whole collection — every user
in it is gone forever (Cognito has no recovery mechanism).

---

## 2. The config file: `amplify_outputs.json`

This file is the **bridge between the running app and the AWS resources**.
It contains:

- `auth.user_pool_id` — which Cognito pool to authenticate against
- `auth.user_pool_client_id` — the OAuth client ID
- `auth.identity_pool_id` — the Cognito identity pool
- `data.url` — the AppSync GraphQL endpoint
- `data.model_introspection` — schema metadata used by the Amplify client

The frontend reads it at boot. Different environments have different copies:

| Where | Source of `amplify_outputs.json` |
|---|---|
| Production build (Amplify Hosting, `main` branch) | Generated at build time by `npx ampx pipeline-deploy --branch main` |
| Staging build (Amplify Hosting, `staging` branch) | Generated at build time by `npx ampx pipeline-deploy --branch staging` |
| Local dev | Whatever you put in `amplify_outputs.json` in your repo (currently set to staging values manually — see § 5) |

### As of 2026-05-09: the file is gitignored and untracked

PR #350 removed `amplify_outputs.json` from git tracking (`.gitignore` already
had `amplify_outputs*`, but the file was committed before that rule was
added). Production / staging still get the file — Amplify Hosting builds
generate it via `ampx pipeline-deploy` before `npm run build` runs. CI gets
a stub via [scripts/create-amplify-stub.mjs](../../scripts/create-amplify-stub.mjs)
so tests/typecheck can resolve the import.

This means:
- Your local edits to the file no longer get reverted on branch switch ✅
- Your local edits never accidentally get committed ✅
- New devs need to run something to populate the file (see § 5)

---

## 3. The two data paths

The app has **two ways** to talk to data, and this matters for local dev.

### Direct DynamoDB SDK (95% of the app)

Most data flows through [utils/dynamoClient.ts](../../utils/dynamoClient.ts),
which uses the AWS SDK directly:

```
your code → AWS SDK → DynamoDB
```

This path needs **explicit AWS IAM credentials** (`FIAPP_AWS_ACCESS_KEY_ID`
and `FIAPP_AWS_SECRET_ACCESS_KEY`). On Amplify Hosting these come from
Amplify env variables. Locally they need to be in `.env.local`.

Used for: practice data, returns, streaks, counters, trials, suggestions —
basically everything user-facing.

### AppSync GraphQL (5% of the app)

Only 3 operations defined in [amplify/data/resource.ts](../../amplify/data/resource.ts):
- `getMyProfile`
- `createMyProfile`
- `setMySubscriptionStatus`

These flow through:

```
your code → AppSync → Lambda handler → DynamoDB
```

AppSync auth happens via the Cognito user pool token in
`amplify_outputs.json`. There is **no local AppSync** — even when running
locally, AppSync calls hit AWS.

Currently the only caller is [app/api/dev/subscription/route.ts](../../app/api/dev/subscription/route.ts)
(the dev-only subscription toggle).

---

## 4. DynamoDB tables — production vs branch

Look at [amplify/backend.ts](../../amplify/backend.ts) for the source of truth.

### Production (`main` branch)

Both production tables are **imported**, not created by CloudFormation:

```ts
isProduction
  ? aws_dynamodb.Table.fromTableName(stack, "FIAPP_MAIN", "FIAPP_MAIN")
  : new aws_dynamodb.Table(...)
```

This was made consistent in PR #343 — previously `FIAPP_RETURNS` was created
by CloudFormation with `RemovalPolicy.RETAIN`, which caused a "table already
exists" error when the backend stack was deleted and redeployed during the
incident.

**Why imported is better for production:** the table outlives the
CloudFormation stack. You can delete and recreate the entire backend without
risking the production data, and stack recreation never collides with the
existing table.

### Staging and other branches

Branch-scoped tables are **created** by CloudFormation:

- `FIAPP_MAIN_STAGING`
- `FIAPP_RETURNS_STAGING`
- (For other branches: `FIAPP_MAIN_<BRANCH>` etc.)

These have `RemovalPolicy.RETAIN` so the data survives stack tear-down.

---

## 5. Local dev setup

### How to set up `.env.local`

```env
NODE_ENV=development

AWS_PROFILE=amplify-policy-636704810558
AWS_REGION=ap-southeast-2

# Point local at staging tables
FIAPP_MAIN_TABLE=FIAPP_MAIN_STAGING
FIAPP_RETURNS_TABLE=FIAPP_RETURNS_STAGING

# Direct-DynamoDB credentials. Get these from IAM → Users → fiapp-server.
# Do NOT use SSO credentials — fiapp-server has the right permissions for
# both prod and staging tables; the SSO admin role does not.
FIAPP_AWS_ACCESS_KEY_ID=...
FIAPP_AWS_SECRET_ACCESS_KEY=...
FIAPP_AWS_REGION=ap-southeast-2

# Stripe / etc. (see the full file for the rest)
```

### How to set up `amplify_outputs.json` (after PR #350)

Since the file is no longer tracked, you need to generate or copy it
locally. **Do not commit it.**

> Quickstart recipe lives in [local-dev.md](./local-dev.md). The options
> below are kept here for the deeper context on tradeoffs.

Once you have a real file in place, run `npm run backup:amplify` to stash a
copy at `~/.fiapp-amplify-outputs-backup.json`. If the file ever goes
missing or gets stubbed, `npm run restore:amplify` puts it back. A `predev`
guard refuses to start `npm run dev` if the file is missing or contains
stub values, so the failure mode is now loud instead of silent.

**Option A — Point local at staging (recommended for solo dev)**

Create `amplify_outputs.json` in repo root with values from the staging
backend. Easiest source: download the latest staging deployment artifacts
from Amplify Hosting → staging branch → "Deployment artifacts", then extract
the four key values from the bundled JS (or look them up in Cognito /
AppSync consoles):

- User pool ID — Cognito console → User pools
- User pool client ID — Cognito → that pool → "App integration" tab
- Identity pool ID — Cognito → Identity pools
- AppSync URL — AppSync console → APIs → Settings

Or run this **if you have admin AWS creds locally**:

```sh
npx ampx generate outputs --branch staging --app-id d3nyg9qvz1tj5n --profile <admin-profile>
```

(The `fiapp-server` IAM user does **not** have CloudFormation read
permissions, so it can't run this command.)

**Option B — Run your own sandbox**

```sh
npx ampx sandbox
```

Spins up isolated Cognito + DynamoDB resources just for you. Slower setup,
but you can break/change anything without affecting staging. Use
`npx ampx sandbox delete` when done.

### Why we point local at staging instead of running a sandbox

For a solo dev with no team:

**Pros of shared local↔staging:**
- One set of test users, one set of test data
- No sandbox teardown/cleanup
- Match what's tested on the staging URL

**Cons (be aware of these):**
- GraphQL schema or auth changes (`amplify/**/*.ts`) only take effect after
  deploying to staging — your local frontend will hit a stale staging API
  until you push and Amplify redeploys.
- Running E2E tests on staging while doing local dev can collide.

---

## 6. Account linking (Google + email/password)

See [amplify/auth/pre-sign-up-trigger/handler.ts](../../amplify/auth/pre-sign-up-trigger/handler.ts).

**Direction 1: native user exists, then signs in with Google**
- Pre-sign-up trigger runs `AdminLinkProviderForUser`
- Source = the new Google identity, Destination = the existing native user
- After linking, BOTH email/password AND Google sign-in work
- All data tied to the native user's `sub` is preserved

**Direction 2: Google user exists, then tries email/password sign-up**
- Pre-sign-up trigger throws an error: "An account with this email already
  exists via Google Sign-In..."
- Prevents orphan duplicate users

### Limitation: forgot-password doesn't work for Google-only users

If a user only has a federated (Google) identity in Cognito, "Forgot
password" silently fails — Cognito has no password to reset, since no
native user exists. There's no built-in "set a password for my Google-linked
account" flow; the federated and native paths are separate by design.

### Gmail "+aliases" tip for testing

`qianhaopower+test1@gmail.com` is a *different* user in Cognito (string
match on email) but the **same** Google account in Google's eyes. Useful for
spinning up multiple email/password test accounts without managing real
inboxes — but you can't "Sign in with Google" as the alias, only as
`qianhaopower@gmail.com`.

---

## 7. The 2026-05-09 incident — what happened, why, and the lesson

### Symptoms

User clicks "Sign up" or "Sign in" on `friendsintelligence.net` and gets:

> User pool ap-southeast-2_jiS8CiQ2d does not exist.

### Root cause

The user manually deleted the production Cognito pool (`jiS8CiQ2d`) from
the AWS console the previous day. CloudFormation, however, still believed
that pool existed — its stack template had it as a managed resource. Any
subsequent `ampx pipeline-deploy` run produced an `amplify_outputs.json`
pointing to the deleted pool, so the production frontend was permanently
broken until CloudFormation was reconciled with reality.

This is called **CloudFormation drift**: the stack thinks resource X exists,
but X was changed/deleted outside of CloudFormation.

### Why simply re-running `ampx pipeline-deploy` didn't fix it

CDK only deploys when the synthesized template differs from the deployed
template. Since `amplify/auth/resource.ts` hadn't changed, CDK saw "no
changes" and outputted the existing (stale) pool ID from the stack outputs.

We tried adding a comment to `resource.ts` to force a deploy, but a comment
isn't a CDK-level change — the synthesized template is identical, so CDK
still skipped the deploy.

### The fix that worked

1. Delete the **root** CloudFormation stack for the main branch backend
   (`amplify-d3nyg9qvz1tj5n-main-branch-211a16f161`)
2. Trigger a fresh Amplify build for `main`
3. `ampx pipeline-deploy` saw no existing stack and provisioned everything
   from scratch — new Cognito pool, new identity pool, fresh AppSync, etc.

### Secondary issue: `FIAPP_RETURNS` already exists

When the new stack tried to create `FIAPP_RETURNS`, it found the table
already existed (preserved by `RemovalPolicy.RETAIN` from the deleted
stack). Manual fix: delete the now-orphaned `FIAPP_RETURNS` table from
DynamoDB console, then redeploy.

**Long-term fix (PR #343):** import `FIAPP_RETURNS` in production rather
than letting CloudFormation create it. Same model as `FIAPP_MAIN`. The
table now outlives the stack permanently.

### Lessons

1. **Never delete CloudFormation-managed resources directly.** Use
   CloudFormation (or Amplify) to delete them so the stack stays in sync.
2. **`RemovalPolicy.RETAIN` is a trap on stack recreation.** Either don't
   use it, or import the resource so CloudFormation never tries to create
   it again.
3. **Production data resources should be imported, not managed.** They
   should outlive any stack lifecycle event.
4. **CDK skips no-op changes.** Forcing a redeploy by editing a comment
   doesn't work — you need a real template change, or destroy + recreate.

---

## 8. Quick reference: AWS resources as of 2026-05-09

### Cognito user pools

| Pool ID | Purpose | Created | Notes |
|---|---|---|---|
| `ap-southeast-2_9gN7w8sUy` | **Production** (active) | 2026-05-09 | Created when prod stack was redeployed during the incident |
| `ap-southeast-2_Q8OGCkp4L` | **Staging** | 2026-05-09 | Created when staging branch was set up |
| ~~`ap-southeast-2_jiS8CiQ2d`~~ | (deleted) | — | The one whose deletion caused the incident |
| ~~`ap-southeast-2_YF99bxLx0`~~ | (deleted) | 3 months ago | Orphan from a long-ago `ampx sandbox` run |

### Identity pools

Each Cognito user pool has a paired identity pool created in the same
deployment. The currently-active ones are linked to `9gN7w8sUy` (prod) and
`Q8OGCkp4L` (staging).

### Amplify app ID

`d3nyg9qvz1tj5n` — used in URLs and `ampx` commands.

### CloudFormation stacks per branch

Pattern: `amplify-d3nyg9qvz1tj5n-<branch>-branch-<suffix>` plus nested
stacks for `auth`, `data`, and `FIAppExternalDataSources`.

### IAM user for direct-DynamoDB access

`fiapp-server` — has read/write permissions on production AND staging
tables. Access keys live in:
- Local: `.env.local` (FIAPP_AWS_ACCESS_KEY_ID / FIAPP_AWS_SECRET_ACCESS_KEY)
- Production: Amplify Hosting env variables (set for "All branches")

The user has at most 2 active access keys at a time; rotate by deactivating
old + creating new.

---

## 9. Common gotchas

### "User pool X does not exist" on production after manual changes

→ Same as the incident. Check the CloudFormation stack for the main branch
backend; if it references a pool that no longer exists, you need to either
recreate the pool via CloudFormation or destroy + redeploy the stack.

### `amplify_outputs.json` keeps reverting on branch switch

→ Was happening before PR #350. Should not happen anymore since the file
isn't tracked. If it returns, check whether the file got re-tracked
somewhere.

### `npm run dev` fails with "amplify_outputs.json is not usable for local dev"

→ The `predev` guard caught a missing or stubbed file. Run
`npm run restore:amplify` (uses your backup at
`~/.fiapp-amplify-outputs-backup.json`). If you have no backup, follow the
"Populating `amplify_outputs.json`" recipe in
[local-dev.md](./local-dev.md). To bypass the guard once (not recommended),
run `next dev` directly.

### "Token is expired" / "AccessDeniedException" running locally

→ The dynamo client is falling back to AWS SDK default credential chain
(your SSO session) because `FIAPP_AWS_ACCESS_KEY_ID` /
`FIAPP_AWS_SECRET_ACCESS_KEY` aren't set in `.env.local`. Add them.

### Local sign-up fails with "User pool does not exist"

→ Your `amplify_outputs.json` points at a deleted pool (probably an old
sandbox or staging). Regenerate by either pointing at staging again or
running `npx ampx sandbox`.

### Forgot password doesn't send a code

→ The user only has a federated (Google) identity. Cognito can't reset a
password that doesn't exist. They need to use Google sign-in, or you need
to add a "set password" flow.

### Integration tests fail with "Cannot find module amplify_outputs.json"

→ CI needs to run `node scripts/create-amplify-stub.mjs` before tests. The
CI workflow should already do this; if it doesn't, the workflow file got
out of sync.

---

## 10. Related PRs and where to look

- **PR #338** — initial trigger fix attempt (no-op comment change)
- **PR #343** — import `FIAPP_RETURNS` in production
- **PR #350** — untrack `amplify_outputs.json` + add CI stub script
- **PR #353** — staging → main sync (after #350 caused conflict)

Source of truth files:
- [amplify/backend.ts](../../amplify/backend.ts) — table imports vs creates
- [amplify/auth/resource.ts](../../amplify/auth/resource.ts) — Cognito config
- [amplify/auth/pre-sign-up-trigger/handler.ts](../../amplify/auth/pre-sign-up-trigger/handler.ts) — account linking logic
- [utils/dynamoClient.ts](../../utils/dynamoClient.ts) — direct DynamoDB SDK
- [utils/amplifyServerUtils.ts](../../utils/amplifyServerUtils.ts) — AppSync server runner
- [scripts/create-amplify-stub.mjs](../../scripts/create-amplify-stub.mjs) — CI stub generator
- [scripts/check-amplify-outputs.mjs](../../scripts/check-amplify-outputs.mjs) — `predev` guard
- [scripts/backup-amplify-outputs.mjs](../../scripts/backup-amplify-outputs.mjs) — `npm run backup:amplify`
- [scripts/restore-amplify-outputs.mjs](../../scripts/restore-amplify-outputs.mjs) — `npm run restore:amplify`
- [amplify.yml](../../amplify.yml) — Amplify Hosting build pipeline
