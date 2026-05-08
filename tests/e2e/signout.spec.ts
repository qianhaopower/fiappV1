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

    // Amplify clears tokens but doesn't auto-navigate.
    // Navigate to a protected page — middleware should redirect to /auth.
    await page.waitForTimeout(1500);
    await page.goto("/today");
    await expect(page).toHaveURL(/\/auth/, { timeout: 15_000 });
  });
});
