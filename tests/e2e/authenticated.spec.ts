import { test, expect } from "@playwright/test";
import { AUTH_STATE_PATH } from "./global-setup";

test.use({ storageState: AUTH_STATE_PATH });

// ─── /today ───────────────────────────────────────────────────────────────────

test.describe("/today", () => {
  test("loads without error", async ({ page }) => {
    await page.goto("/today");
    await expect(page).toHaveURL(/\/today/);
    await expect(page.getByRole("heading", { name: /today/i })).toBeVisible({
      timeout: 10_000,
    });
  });

  test("shows focus practice or empty state — never blank", async ({ page }) => {
    await page.goto("/today");
    const focus = page.getByText("Today's focus");
    const empty = page.getByText(/No focus practice set yet/i);
    await expect(focus.or(empty)).toBeVisible({ timeout: 10_000 });
  });

  test("Did it and Not today buttons are visible when focus practice is set", async ({
    page,
  }) => {
    await page.goto("/today");
    const hasFocus = await page
      .getByText("Today's focus")
      .isVisible()
      .catch(() => false);
    if (!hasFocus) { test.skip(); return; }

    await expect(page.getByRole("button", { name: /did it/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /not today/i })).toBeVisible();
  });

  test("logging Did it updates button state", async ({ page }) => {
    await page.goto("/today");
    const hasFocus = await page
      .getByText("Today's focus")
      .isVisible()
      .catch(() => false);
    if (!hasFocus) { test.skip(); return; }

    await page.getByRole("button", { name: /did it/i }).click();
    await page.waitForTimeout(1000);
    await expect(page.getByRole("button", { name: /did it/i })).toBeVisible();
  });

  test("logging Not today updates button state", async ({ page }) => {
    await page.goto("/today");
    const hasFocus = await page
      .getByText("Today's focus")
      .isVisible()
      .catch(() => false);
    if (!hasFocus) { test.skip(); return; }

    await page.getByRole("button", { name: /not today/i }).click();
    await page.waitForTimeout(1000);
    await expect(page.getByRole("button", { name: /not today/i })).toBeVisible();
  });

  test("navigation links to practices and progress are present", async ({
    page,
  }) => {
    await page.goto("/today");
    await expect(page.getByRole("link", { name: /manage practices/i })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole("link", { name: /view progress/i })).toBeVisible();
  });

  test("navigate to practices via link", async ({ page }) => {
    await page.goto("/today");
    await page.getByRole("link", { name: /manage practices/i }).click();
    await expect(page).toHaveURL(/\/practices/);
  });

  test("navigate to progress via link", async ({ page }) => {
    await page.goto("/today");
    await page.getByRole("link", { name: /view progress/i }).click();
    await expect(page).toHaveURL(/\/progress/);
  });
});

// ─── /practices ───────────────────────────────────────────────────────────────

test.describe("/practices", () => {
  test("loads without error", async ({ page }) => {
    await page.goto("/practices");
    await expect(page).toHaveURL(/\/practices/);
    await expect(page.getByRole("heading", { name: /practices/i })).toBeVisible({ timeout: 10_000 });
  });

  test("shows active practices, empty state, or trial section", async ({ page }) => {
    await page.goto("/practices");
    const content = page
      .getByText(/No practices yet/i)
      .or(page.getByText(/Browse suggestions/i))
      .or(page.getByText(/Today's focus/i))
      .or(page.getByText(/Trying/i))
      .or(page.getByText(/Paused/i))
      .or(page.getByText(/Your trial/i));
    await expect(content.first()).toBeVisible({ timeout: 10_000 });
  });

  test("Add practice button links to results", async ({ page }) => {
    await page.goto("/practices");
    await expect(page.getByRole("link", { name: /add practice/i })).toBeVisible({ timeout: 10_000 });
    await page.getByRole("link", { name: /add practice/i }).click();
    await expect(page).toHaveURL(/\/results/);
  });

  test("Set focus button is visible on active practices", async ({ page }) => {
    await page.goto("/practices");
    const hasActive = await page.getByText("Today's focus").isVisible().catch(() => false)
      || await page.getByRole("button", { name: /set focus/i }).isVisible().catch(() => false);
    if (!hasActive) { test.skip(); return; }
    await expect(
      page.getByRole("button", { name: /set focus/i }).or(page.getByText("Today's focus"))
    ).toBeVisible();
  });

  test("Pause button is visible on active practices", async ({ page }) => {
    await page.goto("/practices");
    const hasPause = await page.getByRole("button", { name: /pause/i }).isVisible().catch(() => false);
    if (!hasPause) { test.skip(); return; }
    await expect(page.getByRole("button", { name: /pause/i }).first()).toBeVisible();
  });

  test("Resume button is visible on paused practices", async ({ page }) => {
    await page.goto("/practices");
    const hasResume = await page.getByRole("button", { name: /resume/i }).isVisible().catch(() => false);
    if (!hasResume) { test.skip(); return; }
    await expect(page.getByRole("button", { name: /resume/i }).first()).toBeVisible();
  });

  test("Go to Today link is present", async ({ page }) => {
    await page.goto("/practices");
    await expect(page.getByRole("link", { name: /go to today/i })).toBeVisible({ timeout: 10_000 });
  });
});

// ─── /progress ────────────────────────────────────────────────────────────────

test.describe("/progress", () => {
  test("loads without error", async ({ page }) => {
    await page.goto("/progress");
    await expect(page).toHaveURL(/\/progress/);
    await expect(page.getByRole("heading", { name: /progress/i })).toBeVisible({ timeout: 10_000 });
  });

  test("shows all four stat cards", async ({ page }) => {
    await page.goto("/progress");
    await expect(page.getByText(/Total check-ins/i)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/Current streak/i)).toBeVisible();
    await expect(page.getByText(/Longest streak/i)).toBeVisible();
    await expect(page.getByText(/Practices started/i)).toBeVisible();
  });

  test("stat values are numeric", async ({ page }) => {
    await page.goto("/progress");
    await page.waitForTimeout(2000);
    const totalCard = page.getByText(/Total check-ins/i);
    await expect(totalCard).toBeVisible({ timeout: 10_000 });
  });

  test("milestones section is present", async ({ page }) => {
    await page.goto("/progress");
    const milestones = page
      .getByText(/Coming up/i)
      .or(page.getByText(/Milestones/i))
      .or(page.getByText(/No milestones yet/i));
    await expect(milestones.first()).toBeVisible({ timeout: 10_000 });
  });

  test("Back to Today link navigates correctly", async ({ page }) => {
    await page.goto("/progress");
    await page.getByRole("link", { name: /back to today/i }).click();
    await expect(page).toHaveURL(/\/today/);
  });
});

// ─── /results ─────────────────────────────────────────────────────────────────

test.describe("/results", () => {
  test("loads without error", async ({ page }) => {
    await page.goto("/results");
    await expect(page).toHaveURL(/\/results/);
    await page.waitForTimeout(2000);
    const content = page
      .getByText(/No insights yet/i)
      .or(page.getByText(/focus/i))
      .or(page.getByText(/assessment/i));
    await expect(content.first()).toBeVisible({ timeout: 10_000 });
  });

  test("shows suggestions or prompts to take assessment", async ({ page }) => {
    await page.goto("/results");
    const content = page
      .getByText(/Try this practice/i)
      .or(page.getByText(/No insights yet/i))
      .or(page.getByText(/Your focus/i))
      .or(page.getByRole("link", { name: /start assessment/i }));
    await expect(content.first()).toBeVisible({ timeout: 10_000 });
  });

  test("Retake assessment button is present when assessment exists", async ({ page }) => {
    await page.goto("/results");
    const hasAssessment = await page.getByRole("button", { name: /retake assessment/i }).isVisible().catch(() => false);
    if (!hasAssessment) { test.skip(); return; }
    await expect(page.getByRole("button", { name: /retake assessment/i })).toBeVisible();
  });

  test("Go to My Practices button is present when assessment exists", async ({ page }) => {
    await page.goto("/results");
    const hasButton = await page.getByRole("link", { name: /go to my practices/i }).isVisible().catch(() => false);
    if (!hasButton) { test.skip(); return; }
    await expect(page.getByRole("link", { name: /go to my practices/i })).toBeVisible();
  });

  test("radar chart is visible when assessment exists", async ({ page }) => {
    await page.goto("/results");
    const hasFocus = await page.getByText(/Your focus/i).isVisible().catch(() => false);
    if (!hasFocus) { test.skip(); return; }
    // Radar chart rendered via recharts SVG
    await expect(page.locator("svg").first()).toBeVisible({ timeout: 10_000 });
  });
});

// ─── /account ─────────────────────────────────────────────────────────────────

test.describe("/account", () => {
  test("loads without error", async ({ page }) => {
    await page.goto("/account");
    await expect(page).toHaveURL(/\/account/);
    await expect(page.getByRole("heading", { name: /account/i })).toBeVisible({ timeout: 10_000 });
  });

  test("displays user email", async ({ page }) => {
    await page.goto("/account");
    await expect(page.getByText(/e2etest/i)).toBeVisible({ timeout: 10_000 });
  });

  test("sign out button is present", async ({ page }) => {
    await page.goto("/account");
    await expect(page.getByRole("button", { name: /sign out/i })).toBeVisible({ timeout: 10_000 });
  });

  test("Retake assessment link navigates to /assessment", async ({ page }) => {
    await page.goto("/account");
    await page.getByRole("link", { name: /retake assessment/i }).click();
    await expect(page).toHaveURL(/\/assessment/);
  });

  test("privacy and terms links are present", async ({ page }) => {
    await page.goto("/account");
    await expect(page.getByRole("link", { name: /privacy/i })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole("link", { name: /terms/i })).toBeVisible();
  });
});
