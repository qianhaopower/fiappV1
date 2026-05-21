import { describe, it, expect, beforeEach, vi } from "vitest";

import { trackEvent } from "@/lib/analytics";

// Privacy invariant: trackEvent MUST be a no-op unless the user has accepted
// cookie consent, and MUST NOT throw under any circumstances. Both are
// load-bearing for GDPR posture (we ship GA4 only after explicit consent —
// see docs/operations/analytics-privacy-boundaries.md §Third-party analytics).

function setupWindow(opts: { consent?: string; gtag?: unknown }) {
  const consent = opts.consent;
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (k: string) => (k === "cookie_consent" ? consent ?? null : null),
    },
    gtag: opts.gtag,
  });
}

describe("lib/analytics.trackEvent", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it("does NOT call gtag when consent is missing", () => {
    const gtag = vi.fn();
    setupWindow({ gtag });
    trackEvent("assessment_started", { is_anonymous: true });
    expect(gtag).not.toHaveBeenCalled();
  });

  it("does NOT call gtag when consent is explicitly declined", () => {
    const gtag = vi.fn();
    setupWindow({ consent: "declined", gtag });
    trackEvent("assessment_started", { is_anonymous: true });
    expect(gtag).not.toHaveBeenCalled();
  });

  it("calls gtag with the right shape when consent is accepted", () => {
    const gtag = vi.fn();
    setupWindow({ consent: "accepted", gtag });
    trackEvent("assessment_submitted", { focus_pillar: "sleep", is_anonymous: true });
    expect(gtag).toHaveBeenCalledWith("event", "assessment_submitted", {
      focus_pillar: "sleep",
      is_anonymous: true,
    });
  });

  it("calls gtag with an empty object when params are omitted", () => {
    const gtag = vi.fn();
    setupWindow({ consent: "accepted", gtag });
    trackEvent("signup_completed");
    expect(gtag).toHaveBeenCalledWith("event", "signup_completed", {});
  });

  it("does NOT call gtag if gtag isn't on window (script hasn't loaded)", () => {
    setupWindow({ consent: "accepted", gtag: undefined });
    // Should be a silent no-op, not throw.
    expect(() => trackEvent("page_view")).not.toThrow();
  });

  it("does NOT throw if gtag throws", () => {
    const gtag = vi.fn(() => { throw new Error("network blip"); });
    setupWindow({ consent: "accepted", gtag });
    expect(() => trackEvent("results_viewed")).not.toThrow();
  });

  it("does NOT throw and is a no-op when window is undefined (SSR)", () => {
    vi.stubGlobal("window", undefined);
    expect(() => trackEvent("anything")).not.toThrow();
  });

  it("does NOT throw when localStorage access fails", () => {
    vi.stubGlobal("window", {
      localStorage: {
        getItem: () => { throw new Error("blocked by browser settings"); },
      },
      gtag: vi.fn(),
    });
    expect(() => trackEvent("assessment_started")).not.toThrow();
  });
});
