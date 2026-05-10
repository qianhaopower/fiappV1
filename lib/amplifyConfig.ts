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

export const amplifyOutputs = withOAuthDomainOverride(outputs);
