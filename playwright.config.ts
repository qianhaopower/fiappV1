import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";

dotenv.config({ path: ".env.test.local" });

const isCI = !!process.env.CI;

// BASE_URL can point at local dev, staging, or production.
// When set, no local server is started.
const baseURL =
  process.env.BASE_URL ??
  `http://localhost:${isCI ? 3005 : 3000}`;

const isLocal = baseURL.includes("localhost");

export default defineConfig({
  testDir: "./tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  timeout: 60_000,
  retries: isCI ? 1 : 0,

  use: {
    baseURL,
    trace: "on-first-retry",
  },

  // Only spin up a local server when targeting localhost
  webServer: isLocal
    ? {
        command: isCI
          ? `npx next start -p ${new URL(baseURL).port}`
          : `npm run dev -- -p ${new URL(baseURL).port}`,
        url: baseURL,
        reuseExistingServer: !isCI,
        timeout: 120_000,
      }
    : undefined,

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
