import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  // Bake server-side env vars into the Lambda bundle at build time.
  // Amplify Hosting passes env vars to the build but not the Lambda runtime.
  env: {
    FIAPP_AWS_ACCESS_KEY_ID: process.env.FIAPP_AWS_ACCESS_KEY_ID ?? '',
    FIAPP_AWS_SECRET_ACCESS_KEY: process.env.FIAPP_AWS_SECRET_ACCESS_KEY ?? '',
    FIAPP_AWS_REGION: process.env.FIAPP_AWS_REGION ?? 'ap-southeast-2',
    FIAPP_MAIN_TABLE: process.env.FIAPP_MAIN_TABLE ?? 'FIAPP_MAIN',
    FIAPP_RETURNS_TABLE: process.env.FIAPP_RETURNS_TABLE ?? 'FIAPP_RETURNS',
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
