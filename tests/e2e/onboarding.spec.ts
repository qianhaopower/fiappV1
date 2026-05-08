import { test, expect } from "@playwright/test";
import { AUTH_STATE_PATH } from "./global-setup";

test.use({ storageState: AUTH_STATE_PATH });

test.describe("/onboarding", () => {
  test("step 0 shows Welcome heading and Continue button", async ({ page }) => {
    await page.goto("/onboarding");
    await expect(page.getByText(/Welcome/i)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole("button", { name: /continue/i })).toBeVisible();
  });

  test("Back button is not visible on step 0", async ({ page }) => {
    await page.goto("/onboarding");
    await expect(page.getByRole("button", { name: /back/i })).not.toBeVisible();
  });

  test("step dots are visible", async ({ page }) => {
    await page.goto("/onboarding");
    // Step indicator dots rendered as spans
    await expect(page.locator("span.rounded-full").first()).toBeVisible({ timeout: 10_000 });
  });

  test("Continue advances to step 1 — 7 pillars", async ({ page }) => {
    await page.goto("/onboarding");
    await page.getByRole("button", { name: /continue/i }).click();
    await expect(page.getByText(/financial/i).first()).toBeVisible({ timeout: 5_000 });
  });

  test("Back button appears on step 1", async ({ page }) => {
    await page.goto("/onboarding");
    await page.getByRole("button", { name: /continue/i }).click();
    await expect(page.getByRole("button", { name: /back/i })).toBeVisible();
  });

  test("Back on step 1 returns to step 0", async ({ page }) => {
    await page.goto("/onboarding");
    await page.getByRole("button", { name: /continue/i }).click();
    await page.getByRole("button", { name: /back/i }).click();
    await expect(page.getByText(/Welcome/i)).toBeVisible();
  });

  test("step 2 shows Take your first assessment button", async ({ page }) => {
    await page.goto("/onboarding");
    await page.getByRole("button", { name: /continue/i }).click();
    await page.getByRole("button", { name: /continue/i }).click();
    await expect(
      page.getByRole("button", { name: /take your first assessment/i })
    ).toBeVisible({ timeout: 5_000 });
  });

  test("Take first assessment navigates to /assessment", async ({ page }) => {
    await page.goto("/onboarding");
    await page.getByRole("button", { name: /continue/i }).click();
    await page.getByRole("button", { name: /continue/i }).click();
    await page.getByRole("button", { name: /take your first assessment/i }).click();
    await expect(page).toHaveURL(/\/assessment/);
  });
});
