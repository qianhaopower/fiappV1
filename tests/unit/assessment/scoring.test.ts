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

  it("GAP-S1: all answers YES → every pillar scores 5, total is 35, focus is first in pillarOrder", () => {
    const answers: Record<string, boolean> = {};
    for (const question of assessmentQuestions) {
      answers[question.id] = true;
    }

    const { scoresByPillar, totalScore } = computeScores(answers);

    for (const pillar of pillarOrder) {
      expect(scoresByPillar[pillar]).toBe(5);
    }
    expect(totalScore).toBe(35);
    expect(pickFocusPillar(scoresByPillar)).toBe(pillarOrder[0]);
  });

  it("GAP-S2: all answers NO → every pillar scores 0, total is 0, focus is first in pillarOrder", () => {
    const answers: Record<string, boolean> = {};
    for (const question of assessmentQuestions) {
      answers[question.id] = false;
    }

    const { scoresByPillar, totalScore } = computeScores(answers);

    for (const pillar of pillarOrder) {
      expect(scoresByPillar[pillar]).toBe(0);
    }
    expect(totalScore).toBe(0);
    expect(pickFocusPillar(scoresByPillar)).toBe(pillarOrder[0]);
  });

  it("GAP-S3: two pillars tied for lowest — picks the one earlier in pillarOrder", () => {
    const scores = pillarOrder.reduce((acc, pillar) => {
      acc[pillar] = 3;
      return acc;
    }, {} as Record<(typeof pillarOrder)[number], number>);

    // Set two specific pillars to the same lowest score
    const [first, , third] = pillarOrder; // financial, (relationship), information
    scores[first] = 1;
    scores[third] = 1;

    const focus = pickFocusPillar(scores);
    // first appears before third in pillarOrder, so it should win the tie
    expect(focus).toBe(first);
  });

  it("GAP-S4: partial answers dict — missing questions treated as false", () => {
    // Only answer the first question; everything else defaults to false (score 0)
    const answers: Record<string, boolean> = {
      [assessmentQuestions[0].id]: true,
    };

    const { scoresByPillar, totalScore } = computeScores(answers);

    expect(totalScore).toBe(1);
    // The pillar of question[0] should have score 1, all others 0
    const answeredPillar = assessmentQuestions[0].pillar;
    expect(scoresByPillar[answeredPillar]).toBe(1);
    for (const pillar of pillarOrder) {
      if (pillar !== answeredPillar) {
        expect(scoresByPillar[pillar]).toBe(0);
      }
    }
  });
});
