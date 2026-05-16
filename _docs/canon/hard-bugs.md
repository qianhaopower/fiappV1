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

### 2026-05-17 — "Choose a practice" + `CAP_REACHED`: UPRACTICE vs PROFILE divergence

**Symptom (what users / monitoring saw):**
On the today page, the UI showed "Choose one practice to start." (meaning
no practice was active). Clicking to pick one returned `409 CAP_REACHED`
on the FREE plan (cap = 1). UI and backend disagreed about whether the
user already had an active practice.

**Why it was hard to diagnose:**
- Both endpoints individually looked correct. `/api/practices/active`
  read UPRACTICE rows and reported "none active" — correct given the
  data it saw. `/api/practice` read PROFILE and reported "cap reached" —
  correct given the data *it* saw. The bug was in the *disagreement*,
  not in either path alone.
- The denormalization was historical and easy to overlook: PROFILE
  carried `activePracticeIds` as a precomputed array, while UPRACTICE#
  rows carried the authoritative `status` field. Nothing in the schema
  flagged one as canonical.
- The user's data had been in this state for some indeterminate amount
  of time, so there was no recent code change to suspect.

**Root cause:** Two sources of truth maintained by parallel writes.
Every start / inactive / switch operation updated both the
`UPRACTICE#<id>.status` field and the `PROFILE.activePracticeIds` array
via `Promise.all` of two separate DynamoDB writes — no transaction, no
rollback. If either write failed (throttle, Lambda mid-flight kill,
network blip) the two items drifted. The cap check read PROFILE (the
stale cache); the UI read UPRACTICE (truth). They contradicted each
other and the user was locked out: PROFILE said "full," UPRACTICE said
"empty," and there was no way for the user to break the deadlock
because every "start practice" attempt got rejected by the cap check
before it could rewrite PROFILE.

**Fix:** PR [#390](https://github.com/qianhaopower/fiappV1/pull/390).
All three handlers in `app/api/practice/route.ts`
(`startPractice`/`reactivatePractice`, `makePracticeInactive`,
`switchToPractice`) now query `UPRACTICE#*` once and derive *both* the
active count (for the cap) and the new `activePracticeIds` value from
that snapshot. PROFILE is rewritten from UPRACTICE truth on every
successful write — so it's now a cache that self-heals on the next
practice action, not an enforcement source that can lock the user out.

No data backfill was required: the affected user's next "Start
practice" click counts 0 active UPRACTICEs (reality), allows the
write, and reconciles PROFILE in the same transaction-of-writes.

**Lessons / what to check next time:**
- **Never enforce a business rule against a denormalized cache.** If
  the cap check had read UPRACTICE (the same source the UI used), the
  divergence would have been invisible to the user — at worst PROFILE
  stays slightly wrong for the admin count. The dangerous thing wasn't
  the drift itself; it was *gating user actions on the side that could
  drift*.
- **`Promise.all` of two writes is not atomic.** It's two independent
  DynamoDB calls. Either can fail. If both writes must agree, use
  `TransactWriteItems` — or design so one side is derived from the
  other and never written independently.
- **Two readers of "the same thing" reading from two different items
  is a smell.** Grep for every reader before adding a denormalized
  cache. If readers disagree on the source, they will eventually
  disagree on the answer.
- **Self-healing beats backfill.** When you discover a class of drift,
  prefer a fix that reconciles on the next write over a one-off cleanup
  script. The script is one-time; the fix protects every future
  incident of the same shape.

**Residual risk (acknowledged, not yet fixed):** `PROFILE.activePracticeIds`
is still updated via non-atomic `Promise.all` and is still read as a
cache by `app/api/return/route.ts`, `app/api/progress/route.ts`, and
`app/api/admin/users/route.ts`. A future partial-write failure can
still cause those three to briefly see stale data (e.g. return
submission blocked for a practice that's actually active) until the
user's next practice mutation reconciles things. The cap check — the
loud, lock-the-user-out path — is now safe. Smaller seams remain.
If drift recurs, the cheapest fix is wrapping the two writes in
`TransactWriteItems`; the structurally correct fix is dropping
`PROFILE.activePracticeIds` and having all three readers query
UPRACTICE.

**Follow-up (same day, second PR):** The #390 fix alone was insufficient
for users with `UPRACTICE#<id>` rows left over from the 2026-05-16
practice-ID rename ([`094fa55`](https://github.com/qianhaopower/fiappV1/commit/094fa55)).
Those rows still carried `status='active'` but their `practiceId` was no
longer in the library. The UI's `enrich()` filtered them out — the new
cap check did not, so the user still hit `CAP_REACHED`. Fixed by tightening
`isActiveUPractice` to require `practicesById.has(up.practiceId)`, matching
the UI's behavior exactly. Lesson reinforced: "match the UI's source of
truth" means matching its *filter rules* too, not just its source item.

**References:**
- PR [#390](https://github.com/qianhaopower/fiappV1/pull/390) — initial fix (PROFILE → UPRACTICE)
- PR [#393](https://github.com/qianhaopower/fiappV1/pull/393) — follow-up (skip ghost renamed IDs)
- Diverging readers (still cache-trusting):
  [`app/api/return/route.ts`](../../app/api/return/route.ts),
  [`app/api/progress/route.ts`](../../app/api/progress/route.ts),
  [`app/api/admin/users/route.ts`](../../app/api/admin/users/route.ts)

---

### 2026-05-16 — Cognito verification emails silently lost to Gmail spam, plus the `amplify-backend#3134` deploy trap

**Symptom (what users / monitoring saw):**
New users signing up on `friendsintelligence.net` never received their
verification code email. Cognito User Pool logs showed the signup
attempt succeeded and the email was "sent." No error anywhere; users
just disappeared between hitting Submit on the signup form and never
returning. Discovered when the developer tested their own signup flow
and noticed the email arriving in Gmail spam — meaning earlier testers
had likely missed the verification email entirely.

**Why it was hard to diagnose:**
- Two stacked issues that looked like one. The visible problem (no
  email) had a mundane cause (Cognito's default sender from
  `no-reply@verificationemail.com` lands in Gmail spam). But the
  obvious fix — switch to SES via `senders.email` in `defineAuth` —
  hit a second, much weirder problem: an open Amplify Gen 2 bug
  ([#3134](https://github.com/aws-amplify/amplify-backend/issues/3134))
  with a misleading error message.
- The #3134 error reads:
  > Email address is not verified. The following identities failed
  > the check in region AP-SOUTHEAST-2:
  > arn:aws:ses:ap-southeast-2:...:identity/no-reply@friendsintelligence.net
  …which is wrong in a specific way: the *domain*
  `friendsintelligence.net` *was* verified in SES, just not the
  email-address-form identity that Amplify Gen 2 silently builds the
  `SourceArn` for at synth time.
- The plan looked clean on paper: verify SES domain, configure
  `senders.email`, deploy. We caught #3134 only by doing deliberate
  web research on the plan before executing — the official Amplify
  docs do not mention the bug.

**Root cause (two layers):**
1. **Surface-level:** Cognito's default email sender
   (`no-reply@verificationemail.com`) is aggressively spam-filtered
   by Gmail. The domain has no DKIM keys aligned with the recipient
   inbox provider's expectations, SPF is broken on it, and the
   sender has no reputation history with the recipient. Result: spam
   folder or silent drop.
2. **Hidden trap:** Amplify Gen 2's `senders.email` block in
   `defineAuth` constructs the SES `SourceArn` from `fromEmail` as
   an *email-level* identity ARN
   (`arn:aws:ses:...:identity/no-reply@friendsintelligence.net`).
   If only the *domain* is verified in SES (which gives you a
   *domain-level* ARN of `...:identity/friendsintelligence.net`),
   the deploy fails because the email-level ARN does not exist as
   a verified identity. The error sounds like "you didn't verify
   your email," but you did — just not in the form Amplify
   expected.

**Fix:** Shipped via PRs #379 + #382 (promoted to main as #380).
- Verified the SES *domain* `friendsintelligence.net` (Easy DKIM,
  RSA_2048_BIT) for actual mail signing.
- Verified the SES *email address* `no-reply@friendsintelligence.net`
  purely to satisfy the ARN that Amplify generates at deploy time.
  DKIM signing still comes from the domain identity (SES picks the
  most specific verified identity when signing).
- Added DNS records on `friendsintelligence.net` (Route 53): 3 DKIM
  CNAMEs (SES auto-published), merged SPF TXT
  (`v=spf1 include:amazonses.com include:spf.improvmx.com ~all` —
  one record, two includes), DMARC TXT (`p=none`).
- Set up ImprovMX free-tier catch-all forwarding
  `*@friendsintelligence.net → qianhaopower@gmail.com` so the
  `no-reply@` mailbox can receive the SES verification link
  required for the email-identity verification step.
- Submitted and got granted SES production access for
  `ap-southeast-2` (per-region — separate from sandbox status in
  any other region).
- While we were touching Cognito, also dropped the password
  `requireSymbols` policy via CDK escape hatch in
  `amplify/backend.ts` (Amplify Gen 2's `defineAuth` doesn't expose
  `passwordPolicy` as a public option), because Chrome-suggested
  passwords often omit symbols, causing rejected-after-autofill
  confusion.

**Lessons / what to check next time:**
- **`senders.email` + domain-only verification is a deploy trap.**
  When configuring Cognito to send via SES in Amplify Gen 2, always
  verify *both* the domain (for DKIM) AND the specific email
  address used in `fromEmail` (for the ARN Amplify generates).
  Until AWS fixes #3134, both identities are mandatory.
- **CFN error messages can be precisely wrong.** "Email address is
  not verified" sounds like a user error; it was actually a library
  bug. Be ready to read the ARN in the error carefully and ask "is
  this the ARN I think it is?"
- **Gmail wants DKIM + SPF + DMARC, not just one.** SES
  auto-publishes DKIM CNAMEs and DMARC to Route 53 (if you check
  "Publish DNS records to Route 53" at identity creation); SPF
  must be added manually. Don't ship until all three are in DNS.
- **Single SPF record per domain.** If something else (ImprovMX,
  Google Workspace) already published one, edit it to merge
  includes rather than creating a second TXT. Multiple SPF records
  is a protocol violation.
- **SES sandbox is per-region.** Production access in `us-east-1`
  does not grant it in `ap-southeast-2`. Submit separately.
- **Do web research on Amplify Gen 2 changes before executing.**
  The official Amplify docs do not surface open bugs; GitHub
  issues do. 20 minutes of search can save hours of failed deploys
  plus the context-switch cost of debugging a misleading error.
- **`defineAuth` doesn't expose `passwordPolicy`.** Use the CDK
  escape hatch (`cfnUserPool.addPropertyOverride(...)`). Same
  pattern applies to any Cognito property Amplify Gen 2's public
  API hides.
- **Client-side and server-side password policy must agree.**
  `passwordSettings` in `AuthenticatorWrapper.tsx` and the CDK
  override in `backend.ts` must say the same thing, otherwise the
  UI accepts a password Cognito will reject.

**References:**
- PRs [#379](https://github.com/qianhaopower/fiappV1/pull/379),
  [#380](https://github.com/qianhaopower/fiappV1/pull/380),
  [#382](https://github.com/qianhaopower/fiappV1/pull/382),
  [#384](https://github.com/qianhaopower/fiappV1/pull/384) (this doc)
- Full setup reference:
  [`cognito-and-environments.md` §11](./cognito-and-environments.md)
- Amplify bug:
  [aws-amplify/amplify-backend#3134](https://github.com/aws-amplify/amplify-backend/issues/3134)
  (open, no fix yet as of 2026-05-16)
- Memory:
  `~/.claude/projects/-Users-haoqian-Documents-fiappv1/memory/project_cognito_ses_migration.md`

---

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
