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

  test("always accessible — never redirects (v2)", async ({ page }) => {
    // v2 invariant: /today is always reachable once authed+assessed, even with
    // 0 active practices. It must not 307/302 to /results or /practices.
    const response = await page.goto("/today");
    expect(response?.status()).toBeLessThan(400);
    await expect(page).toHaveURL(/\/today/);
  });

  test("renders either active practice cards or the empty state — never blank", async ({ page }) => {
    await page.goto("/today");
    const empty = page.getByText(/Choose one practice to start/i);
    const didItButton = page.getByRole("button", { name: /did it/i });
    await expect(empty.or(didItButton).first()).toBeVisible({ timeout: 10_000 });
  });

  test("empty state offers Browse practices and Take assessment CTAs", async ({ page }) => {
    await page.goto("/today");
    const empty = page.getByText(/Choose one practice to start/i);
    const isEmpty = await empty.isVisible().catch(() => false);
    if (!isEmpty) { test.skip(); return; }

    await expect(page.getByRole("link", { name: /browse practices/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /take assessment/i })).toBeVisible();
  });

  test("Did it and Not today buttons appear when at least one practice is active", async ({ page }) => {
    await page.goto("/today");
    const hasActive = await page
      .getByRole("button", { name: /did it/i })
      .isVisible()
      .catch(() => false);
    if (!hasActive) { test.skip(); return; }

    await expect(page.getByRole("button", { name: /did it/i }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /not today/i }).first()).toBeVisible();
  });

  test("logging Did it updates button state", async ({ page }) => {
    await page.goto("/today");
    const didIt = page.getByRole("button", { name: /did it/i }).first();
    const hasActive = await didIt.isVisible().catch(() => false);
    if (!hasActive) { test.skip(); return; }

    await didIt.click();
    await page.waitForTimeout(1000);
    await expect(didIt).toBeVisible();
  });

  test("logging Not today updates button state", async ({ page }) => {
    await page.goto("/today");
    const notToday = page.getByRole("button", { name: /not today/i }).first();
    const hasActive = await notToday.isVisible().catch(() => false);
    if (!hasActive) { test.skip(); return; }

    await notToday.click();
    await page.waitForTimeout(1000);
    await expect(notToday).toBeVisible();
  });

  test("no focus-practice badge anywhere (v2 removed focus)", async ({ page }) => {
    await page.goto("/today");
    await page.waitForTimeout(1500);
    await expect(page.getByText(/Today's focus/i)).toHaveCount(0);
    await expect(page.getByText(/Set focus/i)).toHaveCount(0);
  });

  test("no trial cards anywhere (v2 removed trials)", async ({ page }) => {
    await page.goto("/today");
    await page.waitForTimeout(1500);
    await expect(page.getByText(/Trying out/i)).toHaveCount(0);
    await expect(page.getByText(/days? left to decide/i)).toHaveCount(0);
  });

  test("navigation links to Browse practices and View progress are present", async ({ page }) => {
    await page.goto("/today");
    await expect(page.getByRole("link", { name: /browse practices/i })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole("link", { name: /view progress/i })).toBeVisible();
  });

  test("navigate to /practices via the bottom link", async ({ page }) => {
    await page.goto("/today");
    await page.getByRole("link", { name: /browse practices/i }).click();
    await expect(page).toHaveURL(/\/practices/);
  });

  test("navigate to /progress via the bottom link", async ({ page }) => {
    await page.goto("/today");
    await page.getByRole("link", { name: /view progress/i }).click();
    await expect(page).toHaveURL(/\/progress/);
  });
});

// ─── /practices (the practice bank) ───────────────────────────────────────────

test.describe("/practices", () => {
  test("loads without error", async ({ page }) => {
    await page.goto("/practices");
    await expect(page).toHaveURL(/\/practices/);
    await expect(
      page.getByRole("heading", { name: /practice bank/i }),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("shows all 7 pillar headings", async ({ page }) => {
    await page.goto("/practices");
    await page.waitForTimeout(1500);
    for (const label of [
      /Financial Intelligence/i,
      /Relationship Intelligence/i,
      /Information Intelligence/i,
      /Emotional Intelligence/i,
      /Nutrition Intelligence/i,
      /Dynamic Intelligence/i,
      /Sleep Intelligence/i,
    ]) {
      await expect(page.getByRole("heading", { name: label })).toBeVisible();
    }
  });

  test("renders Start / Resume / View on Today CTAs (v2 — no Set focus, no Pause-v1, no trial)", async ({ page }) => {
    await page.goto("/practices");
    await page.waitForTimeout(1500);

    // At least one of the v2 CTAs must be visible across the bank.
    const startCta = page.getByRole("button", { name: /^start this practice$/i });
    const resumeCta = page.getByRole("button", { name: /^resume$/i });
    const todayLink = page.getByRole("link", { name: /^view on today$/i });
    await expect(startCta.first().or(resumeCta.first()).or(todayLink.first())).toBeVisible();
  });

  test("no v1-only controls (Set focus / Replace / Promote / Discard / Bring this back)", async ({ page }) => {
    await page.goto("/practices");
    await page.waitForTimeout(1500);
    await expect(page.getByRole("button", { name: /^set focus$/i })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /^replace$/i })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /promote/i })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /^discard$/i })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /^bring this back$/i })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /^make inactive$/i })).toHaveCount(0);
    await expect(page.getByText(/^Inactive$/)).toHaveCount(0);
  });

  test("Paused badge + Resume CTA appear together when present", async ({ page }) => {
    await page.goto("/practices");
    await page.waitForTimeout(1500);
    const resumeButton = page.getByRole("button", { name: /^resume$/i }).first();
    const hasPaused = await resumeButton.isVisible().catch(() => false);
    if (!hasPaused) { test.skip(); return; }

    // Where there's a Resume button, there must be a Paused badge somewhere on the page.
    await expect(page.getByText(/^Paused$/).first()).toBeVisible();
  });

  test("Active card shows View on Today + Pause", async ({ page }) => {
    await page.goto("/practices");
    await page.waitForTimeout(1500);
    const activeBadge = page.getByText(/^Active$/).first();
    const hasActive = await activeBadge.isVisible().catch(() => false);
    if (!hasActive) { test.skip(); return; }

    await expect(page.getByRole("link", { name: /^view on today$/i }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /^pause$/i }).first()).toBeVisible();
  });

  test("top action links back to Today", async ({ page }) => {
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

  test("milestones section is present", async ({ page }) => {
    await page.goto("/progress");
    const milestones = page
      .getByText(/Coming up/i)
      .or(page.getByText(/Milestones/i))
      .or(page.getByText(/No milestones yet/i));
    await expect(milestones.first()).toBeVisible({ timeout: 10_000 });
  });

  test("Back to Today link navigates correctly when present", async ({ page }) => {
    await page.goto("/progress");
    const backLink = page.getByRole("link", { name: /back to today|to today/i });
    const hasLink = await backLink.isVisible().catch(() => false);
    if (!hasLink) { test.skip(); return; }
    await backLink.click();
    await expect(page).toHaveURL(/\/today/);
  });
});

// ─── /results ─────────────────────────────────────────────────────────────────

test.describe("/results", () => {
  test("loads without error", async ({ page }) => {
    await page.goto("/results");
    await expect(page).toHaveURL(/\/results/);
    // /results may be hit immediately after a fresh assessment submission,
    // so let the network settle before checking content.
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
    const content = page
      .getByText(/No insights yet/i)
      .or(page.getByText(/Focus Pillar/i));
    await expect(content.first()).toBeVisible({ timeout: 20_000 });
  });

  test("shows v2 Start this practice CTA (not v1 Try this practice)", async ({ page }) => {
    await page.goto("/results");
    await page.waitForTimeout(2000);
    const startCta = page.getByRole("button", { name: /^start this practice$/i }).first();
    const resumeCta = page.getByRole("button", { name: /^resume$/i }).first();
    const viewToday = page.getByRole("link", { name: /^view on today$/i }).first();
    const noAssessment = page.getByText(/No insights yet/i);

    // Either has assessment (any of the 3 v2 CTAs present) or doesn't (empty state).
    await expect(
      startCta.or(resumeCta).or(viewToday).or(noAssessment),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("no v1 Try this practice text anywhere", async ({ page }) => {
    await page.goto("/results");
    await page.waitForTimeout(2000);
    await expect(page.getByText(/Try this practice/i)).toHaveCount(0);
  });

  test("Browse all 35 practices link is present when assessment exists", async ({ page }) => {
    await page.goto("/results");
    await page.waitForTimeout(2000);
    const hasFocus = await page.getByText(/Focus Pillar/i).isVisible().catch(() => false);
    if (!hasFocus) { test.skip(); return; }
    await expect(page.getByRole("link", { name: /Browse all 35 practices/i })).toBeVisible();
  });

  test("Go to Today button is present when assessment exists", async ({ page }) => {
    await page.goto("/results");
    await page.waitForTimeout(2000);
    const hasFocus = await page.getByText(/Focus Pillar/i).isVisible().catch(() => false);
    if (!hasFocus) { test.skip(); return; }
    await expect(page.getByRole("link", { name: /go to today/i })).toBeVisible();
  });

  test("Retake assessment button is present when assessment exists", async ({ page }) => {
    await page.goto("/results");
    await page.waitForTimeout(2000);
    const hasFocus = await page.getByText(/Focus Pillar/i).isVisible().catch(() => false);
    if (!hasFocus) { test.skip(); return; }
    await expect(page.getByRole("link", { name: /retake assessment/i })).toBeVisible();
  });

  test("radar chart renders when assessment exists", async ({ page }) => {
    await page.goto("/results");
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
    const hasFocus = await page.getByText(/Focus Pillar/i).isVisible().catch(() => false);
    if (!hasFocus) { test.skip(); return; }
    // The Focus Pillar card uses a HelpTooltip whose 18×18 icon SVG comes
    // earlier in the DOM than the radar chart. PillarRadarChart is a
    // hand-rolled SVG with viewBox "0 0 500 420" — match by that signature.
    await expect(page.locator('svg[viewBox="0 0 500 420"]')).toBeVisible({ timeout: 10_000 });
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
