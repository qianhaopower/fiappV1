import { test, expect } from "@playwright/test";

test.describe("/auth", () => {
  test("signed out user sees auth screen", async ({ page }) => {
    await page.addInitScript(() => {
      (window as Window & { __FIAPP_AUTH__?: boolean }).__FIAPP_AUTH__ = false;
    });

    await page.goto("/auth");

    await expect(page.getByText("FRIENDS Intelligence")).toBeVisible();
    await expect(page.getByRole("tab", { name: /sign in/i })).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
  });

  test("signed in user redirects to /decideRoute with no auth UI flicker", async ({ page }) => {
    await page.addInitScript(() => {
      (window as Window & { __FIAPP_AUTH__?: boolean }).__FIAPP_AUTH__ = true;
    });

    await page.goto("/auth");
    await expect(page).toHaveURL(/\/decideRoute$/);
    await expect(page.getByText("FRIENDS Intelligence")).toHaveCount(0);
    await expect(page.getByLabel(/email/i)).toHaveCount(0);
  });
});
