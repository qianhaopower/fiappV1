import { test, expect } from "@playwright/test";
import { AUTH_STATE_PATH } from "./global-setup";

test.use({ storageState: AUTH_STATE_PATH });

test.describe("Sign out", () => {
  test("clicking Sign out ends the session — protected pages redirect to /auth", async ({
    page,
  }) => {
    await page.goto("/account");
    await expect(
      page.getByRole("button", { name: /sign out/i })
    ).toBeVisible({ timeout: 10_000 });

    await page.getByRole("button", { name: /sign out/i }).click();

    // handleSignOut calls /api/auth/signout (clears server cookies), then
    // Amplify signOut(), then window.location.href = '/auth'.
    await expect(page).toHaveURL(/\/auth/, { timeout: 15_000 });
  });
});
