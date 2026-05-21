import { test, expect } from "@playwright/test";

// Anonymous funnel — explicitly NO storageState. These tests cover the new
// behaviour where /assessment and /results are public, and signup is asked
// at the results gate. See _docs/plans/anonymous-assessment-funnel.md.
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("Anonymous funnel", () => {
  test("landing → 'Free · no account needed' microcopy + 8-min badge are visible", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText(/Free · no account needed to start/i)).toBeVisible({
      timeout: 10_000,
    });
    // The 35-question pill that used to be sm:inline-flex only — now always visible.
    await expect(page.getByText(/35-question assessment.*7 pillars.*8 minutes/i)).toBeVisible();
  });

  test("cookie banner appears on first visit, can be accepted, hides afterwards", async ({ page }) => {
    await page.goto("/");
    const banner = page.getByRole("dialog", { name: /cookie preferences/i });
    await expect(banner).toBeVisible({ timeout: 10_000 });
    await banner.getByRole("button", { name: /accept/i }).click();
    await expect(banner).not.toBeVisible({ timeout: 5_000 });

    // Consent state persisted to localStorage.
    const consent = await page.evaluate(() => localStorage.getItem("cookie_consent"));
    expect(consent).toBe("accepted");
  });

  test("Start free assessment from / loads /assessment intro WITHOUT auth redirect", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /Start free assessment/i }).first().click();
    // Must land on /assessment, not get bounced to /auth.
    await page.waitForURL(/\/assessment$/, { timeout: 10_000 });
    await expect(
      page.getByRole("button", { name: /start assessment/i })
    ).toBeVisible({ timeout: 5_000 });
  });

  test("/results with empty localStorage redirects to /assessment", async ({ page }) => {
    // Start on a page that's known anonymous-accessible so we have an origin
    // to evaluate against, then navigate.
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.goto("/results");
    await page.waitForURL(/\/assessment$/, { timeout: 10_000 });
  });

  test("draft survives mid-quiz refresh", async ({ page }) => {
    await page.goto("/assessment");
    await page.getByRole("button", { name: /start assessment/i }).click();

    // Answer 3 questions.
    for (let i = 0; i < 3; i += 1) {
      await page.getByRole("button", { name: /^yes$/i }).click();
    }
    await expect(page.getByText(/Question\s*4\s*\/\s*35/i)).toBeVisible({ timeout: 5_000 });

    await page.reload();
    // After reload, the page restores from localStorage.assessment.draft and skips
    // the intro screen entirely.
    await expect(page.getByText(/Question\s*4\s*\/\s*35/i)).toBeVisible({ timeout: 10_000 });
  });

  test("full anonymous run: 35 answers → /results shows pillar-aware Sign up CTA", async ({ page }) => {
    await page.goto("/assessment");
    await page.getByRole("button", { name: /start assessment/i }).click();

    // Answer all 35 with Yes. Auto-advances. The submit button replaces Next
    // on the final question.
    for (let i = 0; i < 34; i += 1) {
      await page.getByRole("button", { name: /^yes$/i }).click();
    }
    // Final question — answering doesn't auto-advance (since there's no next);
    // click Yes then Submit.
    await page.getByRole("button", { name: /^yes$/i }).click();
    await page.getByRole("button", { name: /^submit$/i }).click();

    await page.waitForURL(/\/results$/, { timeout: 15_000 });

    // Pillar-aware bottom CTA — proves dual-mode anonymous render path fired.
    await expect(page.getByText(/Sign up free to start your .+ practice/i)).toBeVisible({
      timeout: 10_000,
    });

    // Per-card CTAs read "Sign up to start", not "Start this practice".
    await expect(page.getByRole("link", { name: /Sign up to start/i }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Start this practice" })).not.toBeVisible();

    // localStorage state landed correctly.
    const stored = await page.evaluate(() => {
      const raw = localStorage.getItem("assessment.result");
      return raw ? JSON.parse(raw) : null;
    });
    expect(stored).not.toBeNull();
    expect(stored.focusPillar).toBeTruthy();
    expect(stored.suggestedPracticeIds).toHaveLength(3);
    // Draft cleared.
    expect(await page.evaluate(() => localStorage.getItem("assessment.draft"))).toBeNull();
  });

  test("cookie banner gates GA4 — no google.com requests until Accept", async ({ page }) => {
    const googleRequests: string[] = [];
    page.on("request", (req) => {
      const url = req.url();
      if (/(googletagmanager|google-analytics|googleadservices|doubleclick)\.com/.test(url)) {
        googleRequests.push(url);
      }
    });

    await page.goto("/");
    // Give the page a beat for any unwanted scripts to fire.
    await page.waitForTimeout(1500);
    expect(googleRequests, "no google requests should fire before consent").toEqual([]);

    // Banner present and we haven't accepted yet.
    const banner = page.getByRole("dialog", { name: /cookie preferences/i });
    await expect(banner).toBeVisible();

    // Accept — GA4 should load.
    await banner.getByRole("button", { name: /accept/i }).click();
    await page.waitForTimeout(1500);
    expect(googleRequests.length, "google requests should appear after Accept").toBeGreaterThan(0);
  });

  test("stale localStorage (>30 days takenAt) shows the age banner", async ({ page }) => {
    await page.goto("/");
    const stale = new Date(Date.now() - 45 * 86_400_000).toISOString();
    await page.evaluate((takenAt) => {
      localStorage.setItem(
        "assessment.result",
        JSON.stringify({
          version: 1,
          answers: {},
          scoresByPillar: {
            financial: 5, relationship: 5, information: 5,
            emotional: 5, nutrition: 5, dynamic: 5, sleep: 0,
          },
          focusPillar: "sleep",
          lowestPillarId: "sleep",
          suggestedPracticeIds: [
            "sleep-consistent-bedtime",
            "sleep-morning-light",
            "sleep-dim-before-bed",
          ],
          takenAt,
        }),
      );
    }, stale);

    await page.goto("/results");
    await expect(page.getByText(/Your result is 45 days old/i)).toBeVisible({
      timeout: 10_000,
    });
  });

  test("AppShell is bypassed on anonymous /assessment and /results (no top nav)", async ({ page }) => {
    await page.goto("/assessment");
    await expect(page.getByRole("button", { name: /start assessment/i })).toBeVisible({
      timeout: 10_000,
    });
    // The AppShell renders a nav with Today/Practices/Insights/Progress links.
    // Anonymous visitors should NOT see it — those links would all 302 to /auth.
    await expect(page.getByRole("link", { name: /^Today$/i })).not.toBeVisible();
    await expect(page.getByRole("link", { name: /^Practices$/i })).not.toBeVisible();
    await expect(page.getByRole("link", { name: /^Insights$/i })).not.toBeVisible();
    await expect(page.getByRole("link", { name: /^Progress$/i })).not.toBeVisible();
  });

  test("Retake (clears your result) wipes localStorage and routes to /assessment", async ({ page }) => {
    // Seed a result + dismiss the cookie banner (otherwise it overlays the
    // bottom-of-page Retake link and intercepts the click).
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.setItem("cookie_consent", "declined");
      localStorage.setItem(
        "assessment.result",
        JSON.stringify({
          version: 1,
          answers: {},
          scoresByPillar: {
            financial: 5, relationship: 5, information: 5,
            emotional: 5, nutrition: 5, dynamic: 5, sleep: 0,
          },
          focusPillar: "sleep",
          lowestPillarId: "sleep",
          suggestedPracticeIds: [
            "sleep-consistent-bedtime",
            "sleep-morning-light",
            "sleep-dim-before-bed",
          ],
          takenAt: new Date().toISOString(),
        })
      );
    });

    await page.goto("/results");
    await page.getByText(/Retake \(clears your result\)/i).click();
    await page.waitForURL(/\/assessment$/, { timeout: 10_000 });

    const stored = await page.evaluate(() => localStorage.getItem("assessment.result"));
    expect(stored).toBeNull();
  });
});
