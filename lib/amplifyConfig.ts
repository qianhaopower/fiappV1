import rawOutputs from "@/amplify_outputs.json";

type OAuthConfig = {
  domain?: string;
  [key: string]: unknown;
};

type AmplifyOutputsWithOAuth = typeof rawOutputs & {
  auth?: (typeof rawOutputs extends { auth: infer Auth } ? Auth : Record<string, unknown>) & {
    oauth?: OAuthConfig;
  };
};

const outputs = rawOutputs as AmplifyOutputsWithOAuth;

function normalizeOAuthDomain(domain: string | undefined) {
  const trimmed = domain?.trim();
  if (!trimmed) return undefined;

  return trimmed.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
}

export function withOAuthDomainOverride(
  config: AmplifyOutputsWithOAuth,
  domain = process.env.NEXT_PUBLIC_COGNITO_OAUTH_DOMAIN,
): typeof rawOutputs {
  const oauthDomain = normalizeOAuthDomain(domain);

  if (!oauthDomain || !config.auth?.oauth) {
    return config as typeof rawOutputs;
  }

  return {
    ...config,
    auth: {
      ...config.auth,
      oauth: {
        ...config.auth.oauth,
        domain: oauthDomain,
      },
    },
  } as typeof rawOutputs;
}

/**
 * Remove the Cognito Identity Pool from the Amplify config.
 *
 * The app does not use Identity-Pool credentials anywhere (data access goes
 * through the server's IAM keys, not client AWS creds). Leaving the identity
 * pool configured causes `fetchAuthSession()` to call
 * `GetCredentialsForIdentity` whenever it runs — and on production that call
 * fails with 400 "Logins don't match" because the prod Identity Pool ↔ User
 * Pool wiring is broken (casualty of the 2026-05-09 pool recreation). When
 * that throws, `middleware.ts` redirects `/decideRoute → /auth`, AuthGate
 * sees valid cookies and bounces back to `/decideRoute`, and the app hangs
 * in an infinite redirect loop on a perpetual spinner.
 *
 * Stripping the identity pool here makes `fetchAuthSession()` token-only,
 * which eliminates the failing call entirely.
 */
export function withoutIdentityPool(
  config: AmplifyOutputsWithOAuth,
): typeof rawOutputs {
  if (!config.auth) return config as typeof rawOutputs;

  const nextAuth = { ...config.auth } as Record<string, unknown>;
  delete nextAuth.identity_pool_id;
  delete nextAuth.unauthenticated_identities_enabled;

  return { ...config, auth: nextAuth } as typeof rawOutputs;
}

export const amplifyOutputs = withoutIdentityPool(withOAuthDomainOverride(outputs));
