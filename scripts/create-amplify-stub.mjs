// Creates a placeholder amplify_outputs.json for CI / first-time setup.
// In Amplify Hosting, ampx pipeline-deploy generates this file at build time.
// In CI test jobs we don't deploy, so we write a stub that satisfies the import
// in utils/amplifyServerUtils.ts. Tests mock the actual auth, so values don't
// need to be real.
import { existsSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const target = resolve(process.cwd(), "amplify_outputs.json");

if (existsSync(target)) {
  console.log("amplify_outputs.json already exists, skipping stub creation.");
  process.exit(0);
}

const stub = {
  auth: {
    user_pool_id: "ap-southeast-2_stubpool",
    aws_region: "ap-southeast-2",
    user_pool_client_id: "stubclient",
    identity_pool_id: "ap-southeast-2:00000000-0000-0000-0000-000000000000",
    mfa_methods: [],
    standard_required_attributes: ["email"],
    username_attributes: ["email"],
    user_verification_types: ["email"],
    groups: [],
    mfa_configuration: "NONE",
    password_policy: {
      min_length: 8,
      require_lowercase: true,
      require_numbers: true,
      require_symbols: true,
      require_uppercase: true,
    },
    unauthenticated_identities_enabled: true,
  },
  data: {
    url: "https://stub.appsync-api.ap-southeast-2.amazonaws.com/graphql",
    aws_region: "ap-southeast-2",
    default_authorization_type: "AMAZON_COGNITO_USER_POOLS",
    authorization_types: ["AWS_IAM"],
    model_introspection: {
      version: 1,
      models: {},
      enums: {},
      nonModels: {},
      queries: {},
      mutations: {},
    },
  },
  version: "1.4",
};

writeFileSync(target, JSON.stringify(stub, null, 2));

const banner = [
  "",
  "========================================================================",
  "  WROTE STUB amplify_outputs.json",
  "",
  "  Placeholder values for CI / build only. Local dev will NOT work with",
  "  these — auth will fail with:",
  "    \"User pool client stubclient does not exist\"",
  "",
  "  If you intended to run locally, restore the real file:",
  "    npm run restore:amplify",
  "  Or re-download from AWS Amplify Console (staging branch artifacts),",
  "  then: npm run backup:amplify",
  "========================================================================",
  "",
].join("\n");
console.warn(banner);
