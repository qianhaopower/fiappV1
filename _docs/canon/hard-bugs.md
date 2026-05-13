# Hard Bugs Registry

A short list of bugs that were genuinely hard — meaning they were unintuitive,
intermittent, broke production, or burned a lot of time to diagnose. The
purpose is **next time something looks weird, scan this first**; one of these
patterns has probably bitten us before.

This is intentionally selective. Routine bugs that were fixed in a few
minutes don't belong here. The bar is roughly: "would I want past-me to have
written this down so future-me doesn't waste a day re-deriving it?"

If a new bug clears that bar, add an entry using the template below.

---

## Template

```
### YYYY-MM-DD — One-line summary

**Symptom (what users / monitoring saw):**

**Why it was hard to diagnose:**

**Root cause:**

**Fix:**

**Lessons / what to check next time:**

**References:** (PR numbers, commits, related docs, memory files)
```

Keep entries short and specific. Reproduction steps and the smoking-gun
evidence matter more than narrative.

---

## Bugs

### 2026-05-13 — New users stuck on `/auth` (Cognito Identity Pool credential exchange failing)

**Symptom:** Brand-new users signing up on `friendsintelligence.net` got
stuck on the `/auth` page after submitting the verification code — the
loading spinner never went away. Refreshing kept spinning. Affected wife
and friend on first-ever signup, and reproducible on a phone after
clearing all Safari website data.

**Why it was hard to diagnose:**
- **Heisenbug.** Worked on every device the developer owned (because they
  were warm/cached). Only failed on truly cold/fresh visits. Cleared
  website data alone didn't always reproduce it.
- The hang was silent — no console errors, no failed requests at first
  glance, no redirect anomalies visible without inspecting carefully.
- `/api/me` worked correctly with the same cookies, which (incorrectly)
  made it look like auth was fine.
- Initial theories (browser too old, cold Lambda start, Amplify
  Authenticator race) all *fit the pattern* but were wrong.

**Root cause:** [middleware.ts](../../middleware.ts) called
`fetchAuthSession()` server-side on protected pages.
`fetchAuthSession()` resolves *both* tokens *and* AWS credentials —
and the credential leg calls Cognito Identity Pool's
`GetCredentialsForIdentity`, which on production returned:

```
400 NotAuthorizedException: "Logins don't match.
Please include at least one valid login for this identity or identity pool."
```

…because the prod Identity Pool ↔ User Pool wiring is broken (likely a
casualty of the 2026-05-09 pool-recreation incident — see entry below).
When the call threw, middleware's `catch` redirected `/decideRoute → /auth`;
on `/auth`, `AuthGate.getCurrentUser()` saw the valid Cognito cookies and
redirected back to `/decideRoute` → middleware threw again → **infinite
`/auth` ↔ `/decideRoute` redirect loop = eternal spinner.**

The smoking gun was a single captured network trace showing:
- `GET /decideRoute` → `307 Location: /auth` with valid unexpired tokens in cookies
- `POST cognito-identity.../GetCredentialsForIdentity` → `400 NotAuthorizedException`
- `GET /api/me` → `200` with the same cookies (uses `getCurrentUser()`, token-only — so not affected)

**Fix:** PR #366. Two changes:
1. `lib/amplifyConfig.ts` — added `withoutIdentityPool()` and applied it
   to the exported `amplifyOutputs`, stripping `identity_pool_id` and
   `unauthenticated_identities_enabled`. The app uses zero Identity-Pool
   credentials anywhere on the client (only `useUserEmail` and
   `middleware` call `fetchAuthSession`, both read only `.tokens`), so
   removing the Identity Pool from the config is functionally a no-op
   except it stops `fetchAuthSession()` from trying the failing call.
2. `middleware.ts` — hardened: only redirect to `/auth` when Cognito
   session cookies are *also* absent. A `fetchAuthSession()` failure on a
   request carrying valid cookies can no longer cause the redirect loop,
   even if some future config issue makes it throw again.

**Lessons / what to check next time:**
- "Stuck on a spinner with no error" on a protected page is almost always
  a redirect loop. Look at the Network tab for `30x` responses bouncing
  between the same two paths.
- `fetchAuthSession()` does more than token validation. If
  `identity_pool_id` is configured, it tries to resolve AWS credentials
  too — and that can throw even when tokens are perfectly fine.
- Always test with cleared website data on a phone that has *never*
  visited prod. "Works on my devices" is a trap when devices accumulate
  warm caches and good identity IDs.
- Server-side `getCurrentUser()` and `fetchAuthSession()` are not
  interchangeable; `getCurrentUser()` is token-only and safer in
  middleware.
- "Don't bounce a user who is presenting valid session cookies" should
  be a structural invariant of the middleware, not a behavior we hope
  for. Hence the cookie-presence check now lives there.

**References:**
- PR [#366](https://github.com/qianhaopower/fiappV1/pull/366)
- Memory: `~/.claude/projects/-Users-haoqian-Documents-fiappv1/memory/project_auth_hang_identity_pool.md`
- AWS-side residual: prod Cognito Identity Pool's auth-provider
  registration for User Pool `ap-southeast-2_9gN7w8sUy` is still
  misconfigured (the app no longer cares, but it's the underlying issue
  that started this).

---

### 2026-05-09 — Production User Pool accidentally deleted (CloudFormation drift)

**Symptom:** Every sign-in / sign-up attempt on
`friendsintelligence.net` returned:

```
User pool ap-southeast-2_jiS8CiQ2d does not exist.
```

Production auth was completely broken; nobody could log in.

**Why it was hard to diagnose:**
- Re-running `npx ampx pipeline-deploy` did **not** fix it. CDK sees no
  template change and skips the deploy, so the stale (deleted) pool ID
  kept getting written into `amplify_outputs.json`.
- Adding a comment to `amplify/auth/resource.ts` didn't help either —
  comments don't change the synthesized CDK template.
- Recovering required understanding "CloudFormation drift": the stack
  still believes a deleted resource exists.

**Root cause:** The Cognito user pool (`jiS8CiQ2d`) was deleted by hand
from the AWS console the previous day. CloudFormation still had it in
the deployed stack template, so subsequent builds happily wrote
`amplify_outputs.json` with the deleted pool's ID. The frontend
correctly pointed at it and AWS correctly said it didn't exist.

**Fix:**
1. Deleted the root CloudFormation stack for the main branch backend
   (`amplify-d3nyg9qvz1tj5n-main-branch-211a16f161`).
2. Triggered a fresh Amplify build for `main`. `ampx pipeline-deploy`
   saw no existing stack and provisioned everything from scratch — new
   Cognito user pool, new identity pool, fresh AppSync.
3. Secondary fix: the new stack tried to create `FIAPP_RETURNS` but the
   table already existed (preserved by `RemovalPolicy.RETAIN` from the
   deleted stack). Manual workaround at the time: delete the orphan
   table. Long-term fix in PR #343: import `FIAPP_RETURNS` in production
   like `FIAPP_MAIN`, so the data table outlives any stack lifecycle
   event.

**Lessons / what to check next time:**
- **Never delete CloudFormation-managed resources directly from the AWS
  console.** Use CloudFormation/Amplify so the stack stays in sync.
- `RemovalPolicy.RETAIN` is a trap on stack recreation. Either don't use
  it, or import the resource so CloudFormation never tries to create it
  again.
- Production data resources (DynamoDB tables) should be **imported**,
  not managed by the stack. They should outlive any stack lifecycle
  event.
- CDK skips no-op changes. To force a redeploy you need a real template
  change, or destroy + recreate the stack.
- If you see "resource X does not exist" after a CFN-managed resource
  was deleted manually, the cure is almost always: delete the stack and
  redeploy clean, not poke at CDK files.

**References:**
- PRs [#338](https://github.com/qianhaopower/fiappV1/pull/338),
  [#343](https://github.com/qianhaopower/fiappV1/pull/343),
  [#350](https://github.com/qianhaopower/fiappV1/pull/350)
- Full write-up in [`cognito-and-environments.md`](./cognito-and-environments.md) §7
- This incident is the suspected root cause of the 2026-05-13 Identity
  Pool misconfig above — the prod Identity Pool was recreated on
  2026-05-09 and its wiring to the new User Pool ended up off.

---

## Smaller dev-time gotchas

Not full incidents, but documented elsewhere — worth knowing about:

- **Google Sign-In integration sharp edges** — CloudFormation circular
  dependency in IAM grants, silent duplicate users from `forceAliasCreation`,
  `<Authenticator>` render-prop user-update race after OAuth redirect,
  display name showing `google_<sub>` instead of email, empty email after
  account linking. All written up in
  [`_docs/google-login.md`](../google-login.md) under "War stories".
