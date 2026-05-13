import { test, expect } from "@playwright/test";
import { AUTH_STATE_PATH } from "./global-setup";

test.use({ storageState: AUTH_STATE_PATH });

test.describe("/onboarding", () => {
  test("shows welcome label and pillar heading", async ({ page }) => {
    await page.goto("/onboarding");
    await expect(page.getByText(/Welcome/i)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole("heading", { name: /7 areas of your life/i })).toBeVisible();
  });

  test("renders all 7 pillar chips", async ({ page }) => {
    await page.goto("/onboarding");
    await expect(page.getByText(/financial/i).first()).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText(/relationship/i).first()).toBeVisible();
    await expect(page.getByText(/sleep/i).first()).toBeVisible();
  });

  test("shows primary CTA to start the assessment", async ({ page }) => {
    await page.goto("/onboarding");
    await expect(
      page.getByRole("button", { name: /take your first assessment/i })
    ).toBeVisible({ timeout: 5_000 });
  });

  test("Skip intro link is visible", async ({ page }) => {
    await page.goto("/onboarding");
    await expect(page.getByRole("button", { name: /skip intro/i })).toBeVisible();
  });

  test("Take first assessment navigates to /assessment", async ({ page }) => {
    await page.goto("/onboarding");
    await page.getByRole("button", { name: /take your first assessment/i }).click();
    await expect(page).toHaveURL(/\/assessment/);
  });

  test("Skip intro navigates to /assessment", async ({ page }) => {
    await page.goto("/onboarding");
    await page.getByRole("button", { name: /skip intro/i }).click();
    await expect(page).toHaveURL(/\/assessment/);
  });
});
