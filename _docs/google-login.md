# Google Sign-In — As-Built Reference

This is the operational reference for how Google Sign-In works in FIApp v1, what
was built, why it was built that way, and what to do when it breaks. Written
right after the feature shipped to production on **2026-05-09** so the context
is fresh — read this first if you ever need to touch the auth flow again.

The original planning document is at
[`_docs/plans/google-login.md`](plans/google-login.md). This doc is the as-built
version with all the war stories, fixes, and gotchas folded in.

---

## TL;DR

- Users can sign in with **email/password** OR **Google**.
- If the same email is used for both, the accounts get **linked automatically**
  (one Cognito user, two identity providers, same `sub`, same data).
- Linking is handled by a **Pre-Sign-Up Lambda trigger** (`amplify/auth/pre-sign-up-trigger/handler.ts`).
- The Lambda handles **both directions** of linking, plus blocks duplicate
  account creation when the user tries to sign up with email/password after
  already signing up with Google.
- After Google OAuth callback, the user is sent to `/decideRoute` via a
  defensive `getCurrentUser()` mount-time check + Hub listener (Amplify v6 SSR
  has a known race where `useAuthenticator`'s render-prop `user` value doesn't
  always update after the OAuth code exchange).

---

## Architecture overview

```
┌────────────────────────────────────────────────────────────────────────┐
│  Browser                                                                │
│  ┌─────────────────────┐                                                │
│  │ /auth page          │   ── click "Sign in with Google" ───────┐     │
│  │ <Authenticator>     │                                          │     │
│  │ + getCurrentUser()  │   ◄── redirect after token exchange ─────┤     │
│  │   mount check       │                                          │     │
│  │ + Hub listener      │   ── auto-redirect to /decideRoute ──┐   │     │
│  └─────────────────────┘                                       │   │     │
└──────────────────────────────────────────────┬─────────────────┼───┼─────┘
                                               │                 │   │
                                               │  email/pw       │   │
                                               │  flow           │   │
                                               ▼                 │   │
┌────────────────────────────────────────────────────────────────┼───┼─────┐
│  AWS                                                           │   │     │
│  ┌──────────────────────────┐                                  │   │     │
│  │ Cognito User Pool        │                                  │   │     │
│  │ - email/password users   │ ◄── PreSignUp_SignUp ────┐       │   │     │
│  │ - federated google_<sub> │                          │       │   │     │
│  │   users                  │ ◄── PreSignUp_ExternalProvider   │   │     │
│  │ - linked identities      │                          │       │   │     │
│  └──────────────────────────┘                          │       │   │     │
│                ▲                                       │       │   │     │
│                │ AdminLinkProviderForUser              │       │   │     │
│                │ ListUsers                             │       │   │     │
│                ▼                                       │       │   │     │
│  ┌──────────────────────────┐                          │       │   │     │
│  │ Pre-Sign-Up Lambda       │ ─────────────────────────┘       │   │     │
│  │ handler.ts               │                                  │   │     │
│  │ (links / blocks dup)     │                                  │   │     │
│  └──────────────────────────┘                                  │   │     │
│                                                                │   │     │
│  ┌──────────────────────────┐                                  │   │     │
│  │ Cognito Hosted UI        │ ◄────── OAuth code exchange ─────┘   │     │
│  │ <random>.auth.…          │                                      │     │
│  │ amazoncognito.com        │ ──── /oauth2/idpresponse ◄───────────┘     │
│  └──────────────────────────┘            │                                │
│                ▲                          │                                │
└────────────────┼──────────────────────────┼────────────────────────────────┘
                 │                          │
                 ▼                          ▼
        ┌──────────────────┐       ┌──────────────────────┐
        │ Google OAuth     │ ◄──── │ User clicks "Allow"  │
        │ accounts.google  │       │ on consent screen     │
        │ .com             │       └──────────────────────┘
        └──────────────────┘
```

---

## End-to-end flows

### Flow A — First-time email/password signup

1. User visits `/auth`, fills email + password, clicks "Create Account"
2. Cognito triggers Pre-Sign-Up Lambda with `triggerSource = 'PreSignUp_SignUp'`
3. Lambda calls `ListUsers` filtered by email
4. **No `google_*` user exists** → Lambda returns `event` unchanged
5. Cognito creates the user as UNCONFIRMED, sends verification email
6. User confirms email, signs in normally

### Flow B — First-time Google signup (no native account exists)

1. User clicks "Sign in with Google" → redirected to Google
2. User selects account → Google redirects to Cognito hosted UI
3. Cognito creates a federated user with username `google_<sub>` (UNCONFIRMED)
4. Cognito triggers Pre-Sign-Up Lambda with `triggerSource = 'PreSignUp_ExternalProvider'`
5. Lambda calls `ListUsers` filtered by email
6. **No native (non-`EXTERNAL_PROVIDER`) user exists** → Lambda returns `event` unchanged
7. Cognito auto-confirms the federated user (no email verification needed — Google already verified it)
8. Cognito redirects to `/auth?code=...&state=...`
9. Amplify JS exchanges the code for tokens, stores them in cookies (SSR mode)
10. `AuthenticatorWrapper`'s mount-time `getCurrentUser()` succeeds → redirects to `/decideRoute`

### Flow C — Account linking direction 1 (email/password user signs in with Google)

This was tested in production with `qianhaopower@gmail.com` after the existing
email/password account was created.

1. User has existing native account `qianhaopower@gmail.com` (email/password)
2. User clicks "Sign in with Google", picks the same email's Google account
3. Cognito starts creating a federated user with username `google_<sub>`
4. Cognito triggers Pre-Sign-Up Lambda with `triggerSource = 'PreSignUp_ExternalProvider'`
5. Lambda calls `ListUsers` filtered by email
6. **Finds native user** (`UserStatus !== 'EXTERNAL_PROVIDER'`)
7. Lambda calls `AdminLinkProviderForUser`:
   - `SourceUser`: `{ ProviderName: 'Google', ProviderAttributeName: 'Cognito_Subject', ProviderAttributeValue: <google_sub> }`
   - `DestinationUser`: `{ ProviderName: 'Cognito', ProviderAttributeValue: <native_username> }`
8. Cognito merges the federated identity into the native user — same `sub`, same data preserved
9. From now on, signing in via either path returns the same user
10. **Important**: the user's `username` stays as the original native username; `signInDetails.loginId` is set to the email entered

### Flow D — Account linking direction 2 (BLOCKED) — Google user tries email/password signup

1. User has Google federated user `google_<sub>` (no native account)
2. User goes to `/auth`, types same email + a password, clicks "Create Account"
3. Cognito triggers Pre-Sign-Up Lambda with `triggerSource = 'PreSignUp_SignUp'`
4. Lambda calls `ListUsers` filtered by email
5. **Finds `google_*` user** in results
6. Lambda **throws an error**: `"An account with this email already exists via Google Sign-In. Please use the 'Sign in with Google' button instead."`
7. Cognito surfaces this error in the Authenticator UI as red text
8. User sees the message and uses the Google button instead

This direction is **blocked** rather than linked because:
- Cognito's `forceAliasCreation=false` (the Gen 2 default) prevents the silent
  duplicate, but would still leave an UNCONFIRMED orphan user
- Linking from native → federated is not as clean as the other direction
- Showing a clear error provides better UX than a confusing "account not found" later

---

## File-by-file changes

### `amplify/auth/resource.ts`
Added `externalProviders.google` config + Pre-Sign-Up trigger wiring.

```ts
export const auth = defineAuth({
  loginWith: {
    email: true,
    externalProviders: {
      google: {
        clientId: secret('GOOGLE_CLIENT_ID'),
        clientSecret: secret('GOOGLE_CLIENT_SECRET'),
        scopes: ['email', 'profile', 'openid'],
        attributeMapping: {
          email: 'email',
          givenName: 'given_name',
          familyName: 'family_name',
          fullname: 'name',
        },
      },
      callbackUrls: [
        'http://localhost:3000/auth',
        'https://staging.d3nyg9qvz1tj5n.amplifyapp.com/auth',
        'https://friendsintelligence.net/auth',
      ],
      logoutUrls: [
        'http://localhost:3000/auth',
        'https://staging.d3nyg9qvz1tj5n.amplifyapp.com/auth',
        'https://friendsintelligence.net/auth',
      ],
    },
  },
  triggers: {
    preSignUp: preSignUpTrigger,
  },
});
```

**Important**: the callback/logout URLs end in `/auth`, NOT `/decideRoute`. The
`/auth` page handles the OAuth callback (sees the `?code=...` query) and lets
Amplify exchange it. The redirect to `/decideRoute` happens client-side after
token exchange.

### `amplify/auth/pre-sign-up-trigger/resource.ts`
Defines the Lambda function:
```ts
import { defineFunction } from '@aws-amplify/backend';
export const preSignUpTrigger = defineFunction({
  name: 'pre-sign-up-trigger',
  entry: './handler.ts',
});
```

### `amplify/auth/pre-sign-up-trigger/handler.ts`
The two-direction linker. Key points:
- `triggerSource === 'PreSignUp_ExternalProvider'` → user is signing in via federation; try to link to existing native account
- `triggerSource === 'PreSignUp_SignUp'` → user is signing up with email/password; block if a Google user exists with the same email
- `userName` for federated users has the form `google_<sub>` — we split on `_` to extract the provider and sub
- The provider name in `AdminLinkProviderForUser` must be **capitalized** (`Google`, not `google`)
- We filter native users with `UserStatus !== 'EXTERNAL_PROVIDER'`

### `amplify/backend.ts`
Two important additions:

```ts
import { Aws, aws_dynamodb, aws_iam, RemovalPolicy } from "aws-cdk-lib";

export const backend = defineBackend({
  auth,
  data,
  preSignUpTrigger,  // ← added
});

// ... DynamoDB stuff ...

backend.preSignUpTrigger.resources.lambda.addToRolePolicy(
  new aws_iam.PolicyStatement({
    actions: [
      "cognito-idp:ListUsers",
      "cognito-idp:AdminLinkProviderForUser",
    ],
    resources: [`arn:aws:cognito-idp:${Aws.REGION}:${Aws.ACCOUNT_ID}:userpool/*`],
  })
);
```

**Critical**: the IAM policy uses `Aws.REGION` and `Aws.ACCOUNT_ID` pseudo-parameters
(NOT `backend.auth.resources.userPool.userPoolArn`). See "Issue 2" below for why.

### `components/AuthenticatorWrapper.tsx`
Two additions:
1. `socialProviders={['google']}` on the `<Authenticator>` to render the "Sign in with Google" button
2. Mount-time `getCurrentUser()` check + Hub listener for `signedIn` / `signInWithRedirect` events. This redirects to `/decideRoute` as soon as a session is detected:

```ts
useEffect(() => {
  let cancelled = false;

  getCurrentUser()
    .then(() => {
      if (!cancelled) router.replace("/decideRoute");
    })
    .catch(() => {});

  const unsubscribe = Hub.listen("auth", ({ payload }) => {
    if (payload.event === "signedIn" || payload.event === "signInWithRedirect") {
      router.replace("/decideRoute");
    }
  });

  return () => {
    cancelled = true;
    unsubscribe();
  };
}, [router]);
```

**Why this is necessary**: Amplify v6 SSR mode + Google OAuth has a race where
the `<Authenticator>`'s render-prop `user` value doesn't always update after
the OAuth code exchange completes, even though the tokens are correctly stored
in cookies. Without this defensive code, the user gets stuck on `/auth` with no
visible error.

### `lib/useUserEmail.ts` (new)
Returns the user's display email, with three layers of fallback:

```ts
export function useUserEmail(): string {
  const { user } = useAuthenticator((ctx) => [ctx.user]);
  const [email, setEmail] = useState<string>("");

  useEffect(() => {
    if (!user) { setEmail(""); return; }
    let cancelled = false;

    (async () => {
      // 1st: fetchUserAttributes
      try {
        const attrs = await fetchUserAttributes();
        if (!cancelled && attrs.email) { setEmail(attrs.email); return; }
      } catch {}

      // 2nd: ID token email claim (works after account linking when attrs is empty)
      try {
        const session = await fetchAuthSession();
        const claim = session.tokens?.idToken?.payload?.email;
        if (!cancelled && typeof claim === "string" && claim) {
          setEmail(claim);
        }
      } catch {}
    })();

    return () => { cancelled = true; };
  }, [user]);

  // 3rd: signInDetails.loginId  4th: username (unless it looks federated)
  const loginId = user?.signInDetails?.loginId ?? "";
  const username = user?.username ?? "";
  const isFederatedUsername = /^[a-z]+_[a-zA-Z0-9-]+$/.test(username);
  return email || loginId || (isFederatedUsername ? "" : username);
}
```

**Why three layers**: `fetchUserAttributes()` was returning empty in the
specific case of an email/password sign-in on an already-linked account.
The ID token's `email` claim is always populated, so it's a reliable fallback.

Used by:
- [`components/layout/AppShell.tsx`](../components/layout/AppShell.tsx) — account dropdown
- [`app/account/page.tsx`](../app/account/page.tsx) — account page email field

---

## AWS infrastructure

### Cognito user pool
Created/updated by Amplify Gen 2 from `amplify/auth/resource.ts`. Each branch
gets its own pool (`main`, `staging`, sandbox).

### Cognito hosted UI domain
Each user pool needs a Cognito-hosted domain for the OAuth flow. Amplify Gen 2
creates one automatically when you add `externalProviders`. The format is
`<random>.auth.<region>.amazoncognito.com`. The OAuth redirect URI registered
in Google must be `https://<that-domain>/oauth2/idpresponse`.

**To find the domain**:
- AWS Console → Cognito → User pools → click the pool → **App integration** tab → scroll to **Domain**

**Domains in use**:
- staging: `859e9affd7cfe5c6d721.auth.ap-southeast-2.amazoncognito.com`
- production: `f231c36ec852fd5dd1f2.auth.ap-southeast-2.amazoncognito.com`

### Google sign-in branding/domain text

Google can show the Cognito Hosted UI domain on the account chooser:
`to continue to f231c36ec852fd5dd1f2.auth.ap-southeast-2.amazoncognito.com`.
That text is outside our React UI. It comes from the Google OAuth/Cognito
redirect flow.

Production custom domain setup:

1. Create the certificate:
   - AWS Console -> Certificate Manager
   - Region must be **US East (N. Virginia) / `us-east-1`**
   - Request a public certificate for `auth.friendsintelligence.net`
   - Use DNS validation
   - If DNS is in Route 53, click **Create records in Route 53**
   - Wait until the certificate status is **Issued**
2. Create the Cognito custom domain:
   - AWS Console -> Cognito
   - Region: **Asia Pacific (Sydney) / `ap-southeast-2`**
   - Open the production user pool whose current domain is
     `f231c36ec852fd5dd1f2.auth.ap-southeast-2.amazoncognito.com`
   - Go to **Branding -> Domain** or **App integration -> Domain**
   - Create a custom domain for `auth.friendsintelligence.net`
   - Select the ACM certificate from step 1
   - Wait for Cognito to finish creating the domain. AWS says this can take up
     to 60 minutes.
3. Create the Route 53 app-domain record:
   - Hosted zone: `friendsintelligence.net`
   - Record name: `auth`
   - Record type: `A`
   - Alias: enabled
   - Route traffic to: **Alias to CloudFront distribution**
   - Target: the CloudFront alias target Cognito provides for the custom domain
   - Evaluate target health: `No`
4. Add the Google OAuth redirect URI:
   - Google Cloud Console -> APIs & Services -> Credentials
   - Open the OAuth 2.0 Web Client
   - Add `https://auth.friendsintelligence.net/oauth2/idpresponse`
   - Do **not** add Amplify env vars here; Google only accepts URLs in this list
5. Add the Amplify Hosting env var:
   - AWS Console -> Amplify -> app -> Environment variables
   - Set `FIAPP_PROD_COGNITO_OAUTH_DOMAIN=auth.friendsintelligence.net`
   - It is okay if Amplify applies this to all branches. `amplify.yml` only
     exposes it as `NEXT_PUBLIC_COGNITO_OAUTH_DOMAIN` when
     `AWS_BRANCH=main`, so staging won't accidentally use the production
     Cognito domain.
6. Redeploy the app so `lib/amplifyConfig.ts` swaps the generated
   `amazoncognito.com` OAuth domain for the custom domain.
7. Test in an incognito browser:
   - Open `https://friendsintelligence.net/auth`
   - Click **Sign in with Google**
   - Google should show either `auth.friendsintelligence.net` or, after Google
     branding verification, `Friends Intelligence`.

Also check Google Auth Platform branding:

- App name: `Friends Intelligence`
- Support email: monitored support address
- App logo, privacy policy, terms links
- Authorized domain: `friendsintelligence.net`

Google may still show a domain instead of the app name/logo until OAuth app
branding verification is complete. The custom Cognito domain at least makes the
domain user-facing and recognizable while verification is pending.

### Pre-Sign-Up Lambda
- Created by Amplify Gen 2 from `amplify/auth/pre-sign-up-trigger/resource.ts`
- Runtime: Node.js 18.x (Amplify default)
- Uses `@aws-sdk/client-cognito-identity-provider` (installed as dev dep for types only — provided at runtime by Lambda)
- IAM permissions granted via `addToRolePolicy` in `amplify/backend.ts`
- CloudWatch logs available under `/aws/lambda/amplify-<app>-<branch>-…-pre-sign-up-trigger-…`

### Amplify secrets (per branch)
Set via Amplify console → Hosting → Secrets. Required on each branch that
deploys the auth stack:
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

The same Google OAuth client is shared across all environments (staging, prod).
The values were entered manually by the user via Amplify Secret Manager.

---

## Google Cloud Console config

**OAuth 2.0 Client ID** (Web application) under APIs & Services → Credentials.

### Authorized JavaScript origins
- `http://localhost:3000`
- `https://staging.d3nyg9qvz1tj5n.amplifyapp.com`
- `https://friendsintelligence.net`

### Authorized redirect URIs
**Critical**: must include `/oauth2/idpresponse` (the path that Cognito's
hosted UI listens on for the OAuth callback).
- `https://859e9affd7cfe5c6d721.auth.ap-southeast-2.amazoncognito.com/oauth2/idpresponse` (staging)
- `https://f231c36ec852fd5dd1f2.auth.ap-southeast-2.amazoncognito.com/oauth2/idpresponse` (production)
- `https://auth.friendsintelligence.net/oauth2/idpresponse` (production custom domain)

If a user gets `redirect_uri_mismatch` from Google, this is what's wrong — the
Cognito domain wasn't added to Google.

---

## War stories — issues encountered today and how they were fixed

### Issue 1 — CloudFormation circular dependency

**Symptom**: `npx ampx pipeline-deploy` failed with
`[CloudformationStackCircularDependencyError]` between `[auth, data, function]`
stacks.

**Cause**: The original IAM grant referenced `backend.auth.resources.userPool.userPoolArn`,
which created a CFN cross-stack reference: function stack → auth stack (for
the ARN) AND auth stack → function stack (for the trigger Lambda ARN).

**Fix**: Use CDK pseudo-parameters that resolve at deploy time without cross-stack
references:
```ts
resources: [`arn:aws:cognito-idp:${Aws.REGION}:${Aws.ACCOUNT_ID}:userpool/*`]
```

The wildcard `userpool/*` is acceptable because the Lambda only knows about
its own pool ID via the trigger event payload.

**PR**: #347

### Issue 2 — `forceAliasCreation` and silent duplicate users

**Concern**: Without intervention, Cognito would silently create duplicate
users — one native (`qianhaopower@gmail.com`) and one federated
(`google_<sub>`) — when the same email signs up via both methods.

**Resolution**:
- Amplify Gen 2 sets `forceAliasCreation=false` by default, which prevents the
  silent duplicate **but** leaves an UNCONFIRMED orphan federated user.
- We add the Pre-Sign-Up Lambda to clean this up:
  - **Direction 1** (native → Google): link via `AdminLinkProviderForUser`
  - **Direction 2** (Google → native): block with a clear error message

### Issue 3 — Stuck on `/auth` after Google OAuth callback

**Symptom**: After Google auth, user is redirected back to staging, ends up at
`/auth` with no query params (so the OAuth code exchange DID complete), but
the page stays on `/auth` instead of redirecting to `/decideRoute`. No console
errors. Server-side `/api/me` returns 200 (so cookies/tokens are correctly set).

**Cause**: Amplify v6 SSR mode + Google OAuth has a race where the
`<Authenticator>`'s render-prop `user` value doesn't update after the code
exchange. The render prop `{({ user }) => user ? <AuthRedirect /> : null}`
never sees `user` become truthy.

**Fix**: Add a defensive `getCurrentUser()` mount-time check in
`AuthenticatorWrapper`, plus a `Hub.listen('auth')` for `signedIn` /
`signInWithRedirect` events. Either path fires the redirect.

**PR**: #348

### Issue 4 — Display name showing `google_103586511618624778544`

**Symptom**: After Google sign-in, the account dropdown showed the raw Cognito
username `google_<sub>` instead of the user's email.

**Cause**: The original code did:
```ts
const email = user?.signInDetails?.loginId ?? user?.username ?? ''
```
For Google federated users, `signInDetails.loginId` is undefined and
`user.username` is `google_<sub>`.

**Fix**: New `useUserEmail` hook that reads the `email` attribute via
`fetchUserAttributes()`, with fallbacks. PR #349.

### Issue 5 — Email empty after account linking + email/password sign-in

**Symptom**: After linking, signing in with email/password left the account
section blank.

**Cause**: `fetchUserAttributes()` returned no email in this specific state,
AND `signInDetails.loginId` was undefined, so the hook fell through to the
federated-username check which returned empty.

**Fix**: Added a second async fallback that reads the `email` claim directly
from the ID token via `fetchAuthSession()`. The claim is always populated.
PR #351.

### Issue 6 — `amplify_outputs.json` missing `oauth` section

**Symptom**: After the first deployment that included Google OAuth, the
deployed `amplify_outputs.json` was missing the `oauth` block under `auth`,
which Amplify JS needs to handle the OAuth code exchange client-side.

**Cause**: The first build failed (Issue 1's circular dep), and even though
the auth stack partially deployed, the `amplify_outputs.json` regeneration
didn't happen cleanly.

**Fix**: After the circular-dep hotfix landed, a fresh build regenerated the
file with the `oauth` section. (We never directly verified this — the
existence of working OAuth on staging is the verification.)

### Issue 7 — PR #346 (staging → main) had a merge conflict

**Symptom**: PR #346 became `CONFLICTING` after #347 added the IAM grant on
staging but main hadn't caught up.

**Cause**: Auto-sync workflow hadn't run, or main had drifted from staging in
a way that conflicted with the new IAM block.

**Fix**: Manually merged `origin/main` into `staging` locally, resolved the
conflict by keeping the IAM grant block, force-pushed to staging (with user's
explicit permission to bypass the "no direct push to staging" rule).

---

## Operational notes

### How to add a new environment (e.g., a new feature branch)

1. The branch's amplify config is created automatically when you push to a
   non-`main` branch (because of the `branch !== "main"` check in
   `amplify/backend.ts`).
2. Add the branch's `/auth` URL to the `callbackUrls` and `logoutUrls` in
   `amplify/auth/resource.ts`.
3. Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` secrets for the new branch
   in Amplify Secret Manager.
4. After the first deploy, get the new Cognito hosted UI domain from the
   Cognito console and add `https://<domain>/oauth2/idpresponse` to the
   Google OAuth client's authorized redirect URIs.
5. Add the branch's URL to the Authorized JavaScript origins in Google.

### How to rotate the Google OAuth client secret

1. In Google Cloud Console → Credentials → OAuth 2.0 Client → "Reset Secret"
2. Update `GOOGLE_CLIENT_SECRET` in Amplify Secret Manager for **each branch**
   (main, staging, any active feature branches)
3. Trigger a rebuild for each branch

### How to debug "Google login isn't working"

Triage in this order:

1. **Does email/password still work?** If not, the entire auth stack is broken,
   not just Google.
2. **Does Google redirect to Cognito hosted UI?** If you get
   `redirect_uri_mismatch` on the Google page, the Cognito domain isn't in
   the Google OAuth client's authorized redirect URIs.
3. **Does the user end up at `/auth?code=...&state=...`?** If yes but stuck
   there:
   - Check `amplify_outputs.json` (in the deployed JS bundle) has the `oauth`
     section under `auth`.
   - If yes, the Hub listener / mount check in `AuthenticatorWrapper` should
     handle the redirect.
4. **Does the user end up at `/auth` with NO query params and stuck?** This
   is the Issue 3 case — the OAuth exchange completed but `useAuthenticator`
   didn't pick it up. The mount-check should fix this; if it doesn't, check
   the `getCurrentUser()` call in DevTools.
5. **Account section empty after sign-in?** Check the ID token for an `email`
   claim — Amplify Console → Cognito User Pool → Users → click user → look at
   their attributes.
6. **Lambda errors?** CloudWatch logs:
   `/aws/lambda/amplify-<app>-<branch>-…-pre-sign-up-trigger-…`. Look for
   `AdminLinkProviderForUser` errors (usually IAM permission issues).

---

## Related PRs (chronological, all merged)

| PR | Title | Branch |
|----|-------|--------|
| #340 | feat: structured JSON logging + in-memory rate limiting (T1 + T3) | feat/observability-t1-t3 |
| #342 | feat: Google Sign-In with account linking | feat/google-login |
| #343 | fix: import FIAPP_RETURNS in production to prevent stack recreation | fix/fiapp-returns-import |
| #346 | Promote staging → main (Google Sign-In rollout to prod) | staging |
| #347 | fix: CloudFormation circular dependency in Pre-Sign-Up Lambda IAM | fix/google-login-cfn-circular-dep |
| #348 | fix: redirect after Google OAuth callback when Authenticator state lags | fix/auth-redirect-after-oauth |
| #349 | fix: show real email for Google federated users instead of `google_<sub>` | fix/show-real-email-for-google-users |
| #350 | chore: untrack `amplify_outputs.json` | chore/untrack-amplify-outputs |
| #351 | fix: fall back to ID token email claim when `fetchUserAttributes` is empty | fix/email-fallback-after-account-link |

---

## Future considerations / known gaps

- **No live test of direction 1 on staging**: We tested direction 1 only in
  production with `qianhaopower@gmail.com` (the user's main account). If
  this feature ever needs deeper testing, you'd need a second real Google
  account — Gmail aliases (`+test1@gmail.com`) won't work because Google treats
  them as the same primary account and returns the canonical email in the
  OAuth response.
- **No automated E2E test for Google login**: Layer 3 Playwright tests don't
  cover the OAuth flow (Google's anti-bot measures make it impractical). All
  testing of Google login is manual.
- **Production Cognito domain not in this doc**: After the prod deploy, look
  it up and update the "Domains seen so far" section above. Likewise, update
  the "Authorized redirect URIs" section.
- **No webhook notification for new federations**: If you ever need to notify
  on first-time Google sign-up, add a `PostConfirmation` trigger.
- **No support for Apple/Microsoft federation**: Just Google for now. If
  added, the Pre-Sign-Up Lambda's username-prefix logic (`google_<sub>`) needs
  to be generalized.
