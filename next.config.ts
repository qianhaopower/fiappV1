import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

// API responses carry per-user data. Forbid any cache (browser, CDN, proxy)
// from storing them, and vary by Cookie so even if a downstream cache ignores
// no-store it never shares an entry across sessions. Belt-and-suspenders with
// withAuth (which also sets these headers) and customHttp.yml (Amplify CDN).
const apiNoStoreHeaders = [
  { key: "Cache-Control", value: "no-store, private" },
  { key: "Vary", value: "Cookie" },
];

const nextConfig: NextConfig = {
  typescript: { ignoreBuildErrors: false },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
      {
        source: "/api/:path*",
        headers: apiNoStoreHeaders,
      },
    ];
  },
};

export default nextConfig;
