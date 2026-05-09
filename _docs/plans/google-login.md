# Google Login Implementation Plan — FIApp v1

## Stack context

Next.js App Router (TypeScript), AWS Amplify Gen 2, Amazon Cognito (email/password today).
Auth config: `amplify/auth/resource.ts`
Auth UI: `components/AuthenticatorWrapper.tsx` using `<Authenticator>` from `@aws-amplify/ui-react`

No new packages required for the app itself. The Pre-Sign-Up Lambda imports `@aws-sdk/client-cognito-identity-provider` — available in the Lambda Node.js runtime without bundling, but verify after deploy that esbuild treats it as external. If not, add it as a dev dependency.

---

## Step 1 — Google Cloud Console (partial first pass)

Go to **APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID**

- Application type: **Web application**
- Authorized JavaScript origins:
  - `http://localhost:3000`
  - Your staging app URL
  - Your production app URL
- Authorized redirect URIs — point to Cognito, not the app:
  - `https://<cognito-domain-staging>.auth.ap-southeast-2.amazoncognito.com/oauth2/idpresponse`
  - `https://<cognito-domain-prod>.auth.ap-southeast-2.amazoncognito.com/oauth2/idpresponse`

> The Cognito domain values are only known after Step 4 deploy. Leave redirect URIs blank for now and come back to fill them in after Step 4.

Copy the **Client ID** and **Client Secret**.

---

## Step 2 — Store secrets in Amplify (per branch)

```bash
# Production (main branch)
npx ampx secret set GOOGLE_CLIENT_ID --branch main
npx ampx secret set GOOGLE_CLIENT_SECRET --branch main

# Staging
npx ampx secret set GOOGLE_CLIENT_ID --branch staging
npx ampx secret set GOOGLE_CLIENT_SECRET --branch staging
```

---

## Step 3 — Update `amplify/auth/resource.ts`

```ts
import { defineAuth, secret } from '@aws-amplify/backend';
import { preSignUpTrigger } from './pre-sign-up-trigger/resource';

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
        'http://localhost:3000/decideRoute',
        'https://<staging-domain>/decideRoute',
        'https://<prod-domain>/decideRoute',
      ],
      logoutUrls: [
        'http://localhost:3000/',
        'https://<staging-domain>/',
        'https://<prod-domain>/',
      ],
    },
  },
  triggers: {
    preSignUp: preSignUpTrigger,
  },
});
```

---

## Step 4 — Deploy backend

```bash
# Dev/sandbox
npx ampx sandbox

# Staging/prod (via CI pipeline)
npx ampx pipeline-deploy --branch staging
```

After deploy, `amplify_outputs.json` is regenerated with the Cognito hosted UI domain. Go back to **Step 1** and add the actual Cognito redirect URIs now that you have them.

---

## Step 5 — Add "Sign in with Google" button

One prop change in `components/AuthenticatorWrapper.tsx`:

```tsx
<Authenticator socialProviders={['google']}>
  {/* existing children unchanged */}
</Authenticator>
```

Renders a "Sign in with Google" button above the email/password form, styled to match the Amplify UI theme.

---

## Step 6 — Account linking Lambda

Two directions must be handled. Without this Lambda, both produce broken states:

| Direction | Without Lambda | With Lambda |
|---|---|---|
| Has email/password account → clicks Google login | Cognito creates a second account; user sees empty app, old data orphaned | Google identity linked to existing account; data intact |
| Has Google account → tries email/password sign-up | `SignUp` succeeds (orphan UNCONFIRMED user created in pool), `ConfirmSignUp` throws `AliasExistsException`; user stuck with no clear error | Sign-up blocked immediately with a clear "use Google instead" message; no orphan user |

### `amplify/auth/pre-sign-up-trigger/handler.ts`

```ts
import type { PreSignUpTriggerHandler } from 'aws-lambda';
import {
  CognitoIdentityProviderClient,
  ListUsersCommand,
  AdminLinkProviderForUserCommand,
} from '@aws-sdk/client-cognito-identity-provider';

const client = new CognitoIdentityProviderClient({});

export const handler: PreSignUpTriggerHandler = async (event) => {
  const { userPoolId, request: { userAttributes }, userName, triggerSource } = event;
  const email = userAttributes.email;

  // Direction 1: existing email/password user → signs in with Google
  // Link the Google identity to the existing native account so their data is preserved.
  if (triggerSource === 'PreSignUp_ExternalProvider') {
    const underscoreIdx = userName.indexOf('_');
    const providerName = userName.slice(0, underscoreIdx);    // "google"
    const providerUserId = userName.slice(underscoreIdx + 1); // Google sub

    const { Users } = await client.send(new ListUsersCommand({
      UserPoolId: userPoolId,
      Filter: `email = "${email}"`,
    }));

    const nativeUser = Users?.find(u => u.UserStatus !== 'EXTERNAL_PROVIDER');
    if (!nativeUser?.Username) return event;

    await client.send(new AdminLinkProviderForUserCommand({
      UserPoolId: userPoolId,
      SourceUser: {
        ProviderName: providerName.charAt(0).toUpperCase() + providerName.slice(1), // "Google"
        ProviderAttributeName: 'Cognito_Subject',
        ProviderAttributeValue: providerUserId,
      },
      DestinationUser: {
        ProviderName: 'Cognito',
        ProviderAttributeValue: nativeUser.Username,
      },
    }));

    return event;
  }

  // Direction 2: existing Google user → tries to create email/password account
  // Block sign-up immediately before an UNCONFIRMED orphan user is created.
  if (triggerSource === 'PreSignUp_SignUp') {
    const { Users } = await client.send(new ListUsersCommand({
      UserPoolId: userPoolId,
      Filter: `email = "${email}"`,
    }));

    const googleUser = Users?.find(u => u.Username?.startsWith('google_'));
    if (googleUser) {
      throw new Error(
        'An account with this email already exists via Google Sign-In. ' +
        'Please use the "Sign in with Google" button instead.'
      );
    }
  }

  return event;
};
```

### `amplify/auth/pre-sign-up-trigger/resource.ts`

```ts
import { defineFunction } from '@aws-amplify/backend';

export const preSignUpTrigger = defineFunction({
  name: 'pre-sign-up-trigger',
  entry: './handler.ts',
});
```

### Step 6b — Grant IAM permissions in `amplify/backend.ts` (critical)

The Lambda needs explicit permission to call Cognito admin APIs. Without this it silently gets `AccessDeniedException` at runtime — Cognito proceeds to create a duplicate user with no error surfaced to the UI.

```ts
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';

backend.preSignUpTrigger.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    actions: [
      'cognito-idp:ListUsers',
      'cognito-idp:AdminLinkProviderForUser',
    ],
    resources: [backend.auth.resources.userPool.userPoolArn],
  })
);
```

---

## Step 7 — Verify nothing else needs changing

The following require zero changes because Google-federated Cognito users get a `sub` UUID identical in shape to email/password users:

- `utils/amplifyServerUtils.ts` — `runWithAmplifyServerContext` unchanged
- `middleware.ts` — session check unchanged
- All API routes using `withAuth()` — unchanged
- All DynamoDB queries using `USER#<userId>` — unchanged
- `app/api/auth/signout/route.ts` — unchanged

---

## Implementation order

1. Step 1 (Google Cloud Console — partial, no Cognito URIs yet)
2. Step 2 (store secrets)
3. Step 3 (update `resource.ts` — auth + trigger wired together)
4. Step 4 (deploy → get Cognito domain → finish Step 1)
5. Step 5 (UI button — one line)
6. Step 6 + 6b (account linking Lambda + IAM grant — do before any user tries Google login)
7. Step 7 (smoke test: sign in with Google on localhost, verify `/decideRoute` works, verify `USER#<userId>` record is created in DynamoDB)

---

## What can go wrong

| Risk | Mitigation |
|---|---|
| Cognito hosted UI domain not known until after deploy | Deploy first (Step 4), then finish Google Cloud Console redirect URIs (Step 1) |
| `callbackUrls` mismatch causes OAuth error | Must exactly match what's registered in both Cognito and Google Cloud Console |
| Lambda silently fails with `AccessDeniedException` → duplicate users created | Step 6b IAM grant in `amplify/backend.ts` is mandatory, not optional |
| Google user tries email/password sign-up → UNCONFIRMED orphan user stuck in pool | Direction 2 branch in Lambda blocks this before sign-up completes |
| Amplify v5 bug: `forceAliasCreation` defaulted to `true`, silently creating two active accounts | Amplify Gen 2 (v6+) defaults to `false` — duplicate active accounts won't happen, but Lambda still needed to prevent confused UX |
| Google logout doesn't clear Google session — silent re-auth on next login | Known limitation; acceptable for v1 |
| Apple requirement if shipping iOS later | Add Apple Sign-In at that point; no action needed now |
