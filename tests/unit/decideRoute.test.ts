import { describe, it, expect } from "vitest";
import { decideRoute, type ProfileForRouting } from "@/lib/decideRoute";

describe("decideRoute (v2 — focus-free)", () => {
  it("routes to /onboarding when no assessment", () => {
    const profile: ProfileForRouting = { latestAssessmentId: null };
    expect(decideRoute(profile)).toBe("/onboarding");
  });

  it("routes to /today when assessment exists, regardless of active practice count", () => {
    const profile: ProfileForRouting = { latestAssessmentId: "a1" };
    expect(decideRoute(profile)).toBe("/today");
  });

  it("empty-string latestAssessmentId is treated as no assessment", () => {
    const profile: ProfileForRouting = { latestAssessmentId: "" };
    expect(decideRoute(profile)).toBe("/onboarding");
  });

  it("0 active practices no longer redirects to /results — /today renders its own empty state", () => {
    // ProfileForRouting in v2 doesn't even carry activePracticeIds — routing is
    // a pure function of latestAssessmentId. Verify that even profiles with
    // extra legacy fields route to /today when they have an assessment.
    const profile = {
      latestAssessmentId: "a1",
      activePracticeIds: [],
      activeTrialCount: 0,
      todayFocusPracticeId: null,
    } as ProfileForRouting & {
      activePracticeIds: string[];
      activeTrialCount: number;
      todayFocusPracticeId: null;
    };
    expect(decideRoute(profile)).toBe("/today");
  });

  it("missing todayFocusPracticeId no longer redirects to /practices", () => {
    const profile = {
      latestAssessmentId: "a1",
      activePracticeIds: ["p1"],
      todayFocusPracticeId: null,
    } as ProfileForRouting & {
      activePracticeIds: string[];
      todayFocusPracticeId: null;
    };
    expect(decideRoute(profile)).toBe("/today");
  });
});
