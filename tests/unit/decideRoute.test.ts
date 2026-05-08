import { describe, it, expect } from "vitest";
import { decideRoute, type ProfileForRouting } from "@/lib/decideRoute";

describe("decideRoute", () => {
  it("routes to /onboarding when no assessment", () => {
    const profile: ProfileForRouting = {
      latestAssessmentId: null,
      activePracticeIds: ["p1"],
      todayFocusPracticeId: "p1",
    };

    expect(decideRoute(profile)).toBe("/onboarding");
  });

  it("routes to /results when no active practices and no active trials", () => {
    const profile: ProfileForRouting = {
      latestAssessmentId: "a1",
      activePracticeIds: [],
      activeTrialCount: 0,
      todayFocusPracticeId: "p1",
    };

    expect(decideRoute(profile)).toBe("/results");
  });

  it("routes to /practices when no active practices but has active trial and no focus", () => {
    const profile: ProfileForRouting = {
      latestAssessmentId: "a1",
      activePracticeIds: [],
      activeTrialCount: 1,
      todayFocusPracticeId: null,
    };

    expect(decideRoute(profile)).toBe("/practices");
  });

  it("routes to /today when has active trial and focus practice set", () => {
    const profile: ProfileForRouting = {
      latestAssessmentId: "a1",
      activePracticeIds: [],
      activeTrialCount: 1,
      todayFocusPracticeId: "sleep-consistent-bedtime",
    };

    expect(decideRoute(profile)).toBe("/today");
  });

  it("routes to /practices when no focus practice", () => {
    const profile: ProfileForRouting = {
      latestAssessmentId: "a1",
      activePracticeIds: ["p1"],
      todayFocusPracticeId: null,
    };

    expect(decideRoute(profile)).toBe("/practices");
  });

  it("routes to /today when assessment, practices, and focus exist", () => {
    const profile: ProfileForRouting = {
      latestAssessmentId: "a1",
      activePracticeIds: ["p1"],
      todayFocusPracticeId: "p1",
    };

    expect(decideRoute(profile)).toBe("/today");
  });

  it("treats undefined activePracticeIds as empty (no trials → /results)", () => {
    const profile: ProfileForRouting = {
      latestAssessmentId: "a1",
      activePracticeIds: undefined,
      activeTrialCount: 0,
      todayFocusPracticeId: "p1",
    };

    expect(decideRoute(profile)).toBe("/results");
  });

  it("treats null activePracticeIds as empty (no trials → /results)", () => {
    const profile: ProfileForRouting = {
      latestAssessmentId: "a1",
      activePracticeIds: null,
      activeTrialCount: null,
      todayFocusPracticeId: "p1",
    };

    expect(decideRoute(profile)).toBe("/results");
  });

  it("treats omitted activeTrialCount as zero", () => {
    const profile: ProfileForRouting = {
      latestAssessmentId: "a1",
      activePracticeIds: [],
      todayFocusPracticeId: "p1",
    };

    expect(decideRoute(profile)).toBe("/results");
  });

  it("GAP-D1: has both active practices and active trial with focus → /today", () => {
    const profile: ProfileForRouting = {
      latestAssessmentId: "a1",
      activePracticeIds: ["p1"],
      activeTrialCount: 1,
      todayFocusPracticeId: "p1",
    };

    expect(decideRoute(profile)).toBe("/today");
  });

  it("GAP-D2: empty string latestAssessmentId → /onboarding", () => {
    const profile: ProfileForRouting = {
      latestAssessmentId: "",
      activePracticeIds: ["p1"],
      todayFocusPracticeId: "p1",
    };

    expect(decideRoute(profile)).toBe("/onboarding");
  });
});
