import { describe, it, expect } from "vitest";
import { decideRoute, type ProfileForRouting } from "@/lib/decideRoute";

describe("decideRoute", () => {
  it("routes to /assessment when no assessment", () => {
    const profile: ProfileForRouting = {
      latestAssessmentId: null,
      activePracticeIds: ["p1"],
      todayFocusPracticeId: "p1",
    };

    expect(decideRoute(profile)).toBe("/assessment");
  });

  it("routes to /results when no active practices", () => {
    const profile: ProfileForRouting = {
      latestAssessmentId: "a1",
      activePracticeIds: [],
      todayFocusPracticeId: "p1",
    };

    expect(decideRoute(profile)).toBe("/results");
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

  it("treats undefined activePracticeIds as empty", () => {
    const profile: ProfileForRouting = {
      latestAssessmentId: "a1",
      activePracticeIds: undefined,
      todayFocusPracticeId: "p1",
    };

    expect(decideRoute(profile)).toBe("/results");
  });

  it("treats null activePracticeIds as empty", () => {
    const profile: ProfileForRouting = {
      latestAssessmentId: "a1",
      activePracticeIds: null,
      todayFocusPracticeId: "p1",
    };

    expect(decideRoute(profile)).toBe("/results");
  });
});
