import { describe, expect, it } from "vitest";
import { withOAuthDomainOverride } from "@/lib/amplifyConfig";

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
