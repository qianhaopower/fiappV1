import { describe, it, expect } from "vitest";
import { assessmentQuestions } from "../../../lib/assessment/questions";
import { pillarOrder } from "../../../lib/assessment/pillars";
import { computeScores, pickFocusPillar } from "../../../lib/assessment/scoring";

describe("assessment scoring", () => {
  it("scores yes/no correctly by pillar", () => {
    const answers: Record<string, boolean> = {};
    for (const question of assessmentQuestions) {
      answers[question.id] = question.pillar === "financial";
    }

    const { scoresByPillar, totalScore } = computeScores(answers);

    expect(scoresByPillar.financial).toBe(5);
    expect(scoresByPillar.relationship).toBe(0);
    expect(scoresByPillar.information).toBe(0);
    expect(scoresByPillar.emotional).toBe(0);
    expect(scoresByPillar.nutrition).toBe(0);
    expect(scoresByPillar.dynamic).toBe(0);
    expect(scoresByPillar.sleep).toBe(0);
    expect(totalScore).toBe(5);
  });

  it("picks the lowest score with tie-break order", () => {
    const scores = pillarOrder.reduce((acc, pillar) => {
      acc[pillar] = 1;
      return acc;
    }, {} as Record<(typeof pillarOrder)[number], number>);

    const focus = pickFocusPillar(scores);
    expect(focus).toBe("financial");
  });

  it("is deterministic for the same answers", () => {
    const answers: Record<string, boolean> = {};
    for (const question of assessmentQuestions) {
      answers[question.id] = question.id.endsWith("1");
    }

    const first = computeScores(answers);
    const second = computeScores(answers);
    const focus = pickFocusPillar(first.scoresByPillar);

    expect(first).toEqual(second);
    expect(focus).toBe(pickFocusPillar(second.scoresByPillar));
  });
});
