import { test, expect } from "@playwright/test";
import { AUTH_STATE_PATH } from "./global-setup";

test.use({ storageState: AUTH_STATE_PATH });

test.describe("Sign out", () => {
  test("clicking Sign out ends the session — lands on the landing page", async ({
    page,
  }) => {
    await page.goto("/account");
    await expect(
      page.getByRole("button", { name: /sign out/i })
    ).toBeVisible({ timeout: 10_000 });

    await page.getByRole("button", { name: /sign out/i }).click();

    // handleSignOut calls /api/auth/signout (clears server cookies), then
    // Amplify signOut(), then window.location.href = '/'. Match URLs that
    // end in '/' — `/auth`, `/today`, etc. do not, so this distinguishes
    // the landing page from any protected route.
    await expect(page).toHaveURL(/\/$/, { timeout: 15_000 });

    // Protected pages should still be unreachable — visiting one bounces
    // to /auth (per middleware), not back into the app.
    await page.goto("/today");
    await expect(page).toHaveURL(/\/auth/, { timeout: 15_000 });
  });
});
