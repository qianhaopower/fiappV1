import { chromium, type FullConfig } from "@playwright/test";
import fs from "fs";
import path from "path";

export const AUTH_STATE_PATH = path.resolve(
  __dirname,
  ".auth.json"
);

const E2E_TEST_EMAIL = "qianhaopower+e2etest@gmail.com";

export default async function globalSetup(config: FullConfig) {
  // In auth-mock mode (CI smoke tests), write an empty storage state and skip
  // real login — the app bypasses Cognito so no real session is needed.
  if (process.env.NEXT_PUBLIC_E2E_AUTH_MOCK === "1") {
    fs.mkdirSync(path.dirname(AUTH_STATE_PATH), { recursive: true });
    fs.writeFileSync(AUTH_STATE_PATH, JSON.stringify({ cookies: [], origins: [] }));
    return;
  }

  const baseURL =
    config.projects[0]?.use?.baseURL ?? "http://localhost:3000";
  const isLocal = baseURL.includes("localhost");
  const email = process.env.E2E_EMAIL;
  const password = process.env.E2E_PASSWORD;

  // Safety guard: refuse to run against non-local environments unless
  // E2E_EMAIL is the designated test account. This prevents accidentally
  // running write-producing tests against production with a real user account.
  if (!isLocal && email !== E2E_TEST_EMAIL) {
    throw new Error(
      `\nE2E SAFETY GUARD\n` +
        `Target: ${baseURL}\n` +
        `E2E_EMAIL must be "${E2E_TEST_EMAIL}" when running against non-local environments.\n` +
        `Currently: ${email ?? "(not set)"}\n` +
        `Set E2E_EMAIL and E2E_PASSWORD in .env.test.local and try again.`
    );
  }

  if (!email || !password) {
    // Skip auth setup — authenticated tests will be skipped or fail gracefully
    return;
  }

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto(`${baseURL}/auth`);

  // Amplify Authenticator form — username field is the email input
  await page.locator('[name="username"]').fill(email);
  await page.locator('[name="password"]').fill(password);
  await page.locator('[type="submit"]').click();

  // Wait for post-login redirect (decideRoute → today/onboarding)
  await page.waitForURL(/\/(today|onboarding|practices|progress|results|account)/, {
    timeout: 30_000,
  });

  await context.storageState({ path: AUTH_STATE_PATH });
  // Clear cookies from the browser profile before closing so persistent Amplify
  // auth cookies don't bleed into unauthenticated test contexts in subsequent runs.
  await context.clearCookies();
  await browser.close();
}
