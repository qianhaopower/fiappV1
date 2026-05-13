import { describe, expect, it } from "vitest";
import { withOAuthDomainOverride, withoutIdentityPool } from "@/lib/amplifyConfig";

const baseConfig = {
  version: "1.4",
  auth: {
    user_pool_id: "ap-southeast-2_pool",
    aws_region: "ap-southeast-2",
    user_pool_client_id: "client",
    oauth: {
      identity_providers: ["GOOGLE"],
      domain: "generated.auth.ap-southeast-2.amazoncognito.com",
      scopes: ["email", "openid", "profile"],
      redirect_sign_in_uri: ["https://friendsintelligence.net/auth"],
      redirect_sign_out_uri: ["https://friendsintelligence.net/auth"],
      response_type: "code",
    },
  },
};

describe("withOAuthDomainOverride", () => {
  it("uses the custom OAuth domain when provided", () => {
    const config = withOAuthDomainOverride(
      baseConfig,
      "https://auth.friendsintelligence.net/oauth2/idpresponse",
    );

    expect(config.auth.oauth.domain).toBe("auth.friendsintelligence.net");
  });

  it("keeps the generated Cognito domain when no custom domain is provided", () => {
    const config = withOAuthDomainOverride(baseConfig, "");

    expect(config.auth.oauth.domain).toBe(
      "generated.auth.ap-southeast-2.amazoncognito.com",
    );
  });
});

describe("withoutIdentityPool", () => {
  it("strips identity_pool_id and unauthenticated_identities_enabled from auth", () => {
    const input = {
      ...baseConfig,
      auth: {
        ...baseConfig.auth,
        identity_pool_id: "ap-southeast-2:abc-123",
        unauthenticated_identities_enabled: true,
      },
    };

    const result = withoutIdentityPool(input);

    expect(result.auth).not.toHaveProperty("identity_pool_id");
    expect(result.auth).not.toHaveProperty("unauthenticated_identities_enabled");
  });

  it("preserves all other auth fields, including oauth", () => {
    const input = {
      ...baseConfig,
      auth: {
        ...baseConfig.auth,
        identity_pool_id: "ap-southeast-2:abc-123",
      },
    };

    const result = withoutIdentityPool(input);

    expect(result.auth.user_pool_id).toBe(baseConfig.auth.user_pool_id);
    expect(result.auth.user_pool_client_id).toBe(baseConfig.auth.user_pool_client_id);
    expect(result.auth.aws_region).toBe(baseConfig.auth.aws_region);
    expect(result.auth.oauth?.domain).toBe(baseConfig.auth.oauth.domain);
  });

  it("is a no-op when the fields are already absent", () => {
    const result = withoutIdentityPool(baseConfig);

    expect(result.auth.user_pool_id).toBe(baseConfig.auth.user_pool_id);
    expect(result.auth.oauth?.domain).toBe(baseConfig.auth.oauth.domain);
  });
});
