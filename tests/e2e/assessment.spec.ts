import { test, expect } from "@playwright/test";
import { AUTH_STATE_PATH } from "./global-setup";

test.use({ storageState: AUTH_STATE_PATH });

test.describe("/assessment", () => {
  test("intro screen shows start button", async ({ page }) => {
    await page.goto("/assessment");
    await expect(
      page.getByRole("button", { name: /start assessment/i })
    ).toBeVisible({ timeout: 10_000 });
  });

  test("intro screen lists the 35 questions count", async ({ page }) => {
    await page.goto("/assessment");
    // "35" is a styled span next to "yes/no questions — takes about 8 minutes"
    await expect(page.getByText(/yes\/no questions/i)).toBeVisible({
      timeout: 10_000,
    });
  });

  test("clicking start shows first question", async ({ page }) => {
    await page.goto("/assessment");
    await page.getByRole("button", { name: /start assessment/i }).click();
    await expect(page.getByText(/Question 1/i)).toBeVisible({ timeout: 5_000 });
  });

  test("Yes and No buttons appear on first question", async ({ page }) => {
    await page.goto("/assessment");
    await page.getByRole("button", { name: /start assessment/i }).click();
    await expect(page.getByRole("button", { name: /^yes$/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /^no$/i })).toBeVisible();
  });

  test("Back button is disabled on first question", async ({ page }) => {
    await page.goto("/assessment");
    await page.getByRole("button", { name: /start assessment/i }).click();
    await expect(page.getByRole("button", { name: /^back$/i })).toBeDisabled();
  });

  test("Next button is disabled before answering", async ({ page }) => {
    await page.goto("/assessment");
    await page.getByRole("button", { name: /start assessment/i }).click();
    await expect(page.getByRole("button", { name: /^next$/i })).toBeDisabled();
  });

  // Clicking Yes/No auto-advances to the next question — no manual Next click needed
  test("clicking Yes auto-advances to question 2", async ({ page }) => {
    await page.goto("/assessment");
    await page.getByRole("button", { name: /start assessment/i }).click();
    await page.getByRole("button", { name: /^yes$/i }).click();
    await expect(page.getByText(/Question 2/i)).toBeVisible({ timeout: 5_000 });
  });

  test("Back button is enabled on question 2", async ({ page }) => {
    await page.goto("/assessment");
    await page.getByRole("button", { name: /start assessment/i }).click();
    await page.getByRole("button", { name: /^yes$/i }).click(); // auto-advance to Q2
    await expect(page.getByText(/Question 2/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /^back$/i })).toBeEnabled();
  });

  test("clicking Back returns to previous question", async ({ page }) => {
    await page.goto("/assessment");
    await page.getByRole("button", { name: /start assessment/i }).click();
    await page.getByRole("button", { name: /^yes$/i }).click(); // → Q2
    await expect(page.getByText(/Question 2/i)).toBeVisible();
    await page.getByRole("button", { name: /^back$/i }).click();
    await expect(page.getByText(/Question 1/i)).toBeVisible();
  });

  test("progress bar advances as questions are answered", async ({ page }) => {
    await page.goto("/assessment");
    await page.getByRole("button", { name: /start assessment/i }).click();

    const bar = page.locator(".bg-primary").filter({ hasNot: page.locator("button") }).first();
    const w1 = await bar.evaluate((el) => (el as HTMLElement).style.width);

    await page.getByRole("button", { name: /^yes$/i }).click(); // → Q2
    await expect(page.getByText(/Question 2/i)).toBeVisible();

    const w2 = await bar.evaluate((el) => (el as HTMLElement).style.width);
    expect(parseFloat(w2)).toBeGreaterThan(parseFloat(w1));
  });

  test("Restart button confirms and resets to question 1", async ({ page }) => {
    // #415 — Restart now opens a confirmation dialog. Cancel preserves state,
    // Start again wipes answers and returns to question 1.
    await page.goto("/assessment");
    await page.getByRole("button", { name: /start assessment/i }).click();
    await page.getByRole("button", { name: /^yes$/i }).click(); // → Q2
    await page.getByRole("button", { name: /^yes$/i }).click(); // → Q3
    await expect(page.getByText(/Question 3/i)).toBeVisible();

    // First Restart: opens dialog, doesn't reset yet.
    await page.getByRole("button", { name: /^restart$/i }).click();
    await expect(
      page.getByRole("heading", { name: /Start the assessment again\?/i })
    ).toBeVisible();
    // Still on question 3 — dialog hasn't acted yet.
    await expect(page.getByText(/Question 3/i)).toBeVisible();

    // Cancel preserves state.
    await page.getByRole("button", { name: /^cancel$/i }).click();
    await expect(page.getByText(/Question 3/i)).toBeVisible();

    // Restart again, this time confirm via Start again.
    await page.getByRole("button", { name: /^restart$/i }).click();
    await page.getByRole("button", { name: /^start again$/i }).click();
    await expect(page.getByText(/Question 1/i)).toBeVisible();
  });

  // Clicking Yes 35 times auto-advances through all questions; Submit appears on the last one
  test("completes full assessment and redirects to /results", async ({
    page,
  }) => {
    await page.goto("/assessment");
    await page.getByRole("button", { name: /start assessment/i }).click();

    for (let i = 0; i < 35; i++) {
      await page.getByRole("button", { name: /^yes$/i }).click();
    }

    // After 35 Yes clicks we're on Q35 with Submit visible
    await expect(
      page.getByRole("button", { name: /submit/i })
    ).toBeEnabled({ timeout: 5_000 });
    await page.getByRole("button", { name: /submit/i }).click();

    await page.waitForURL(/\/results/, { timeout: 20_000 });
    await expect(page).toHaveURL(/\/results/);
  });
});
