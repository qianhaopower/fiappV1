import { describe, it, expect } from "vitest";
import { pillarOrder } from "../../lib/assessment/pillars";
import { assessmentQuestions } from "../../lib/assessment/questions";
import { computeScores, pickFocusPillar } from "../../lib/assessment/scoring";

describe("assessment scoring", () => {
  it("computes scores by pillar and total", () => {
    const answers: Record<string, boolean> = {};
    for (const question of assessmentQuestions) {
      answers[question.id] = question.pillar === "financial";
    }

    const { scoresByPillar, totalScore } = computeScores(answers);

    expect(scoresByPillar.financial).toBe(5);
    expect(totalScore).toBe(5);
  });

  it("picks lowest score with tie-breaking order", () => {
    const scores = pillarOrder.reduce((acc, pillar, index) => {
      acc[pillar] = index % 2 === 0 ? 1 : 1;
      return acc;
    }, {} as Record<(typeof pillarOrder)[number], number>);

    const focus = pickFocusPillar(scores);
    expect(focus).toBe("financial");
  });
});
