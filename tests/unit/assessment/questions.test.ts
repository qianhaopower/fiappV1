import { describe, it, expect } from "vitest";
import { assessmentQuestions } from "@/lib/assessment/questions";
import { pillarOrder } from "@/lib/assessment/pillars";

describe("assessment question bank", () => {
  it("has exactly 35 questions", () => {
    expect(assessmentQuestions).toHaveLength(35);
  });

  it("has exactly 5 questions per pillar", () => {
    for (const pillar of pillarOrder) {
      const count = assessmentQuestions.filter((q) => q.pillar === pillar).length;
      expect(count).toBe(5);
    }
  });

  it("uses the locked question id scheme", () => {
    const expected = new Set<string>();
    for (const pillar of pillarOrder) {
      for (let i = 1; i <= 5; i += 1) {
        expected.add(`${pillar}-${i}`);
      }
    }

    const ids = new Set(assessmentQuestions.map((q) => q.id));
    expect(ids).toEqual(expected);
  });

  it("has unique ids", () => {
    const ids = assessmentQuestions.map((q) => q.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });
});
