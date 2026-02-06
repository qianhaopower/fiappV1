import { pillarOrder, type Pillar } from "@/lib/assessment/pillars";
import { assessmentQuestions } from "@/lib/assessment/questions";

export type ScoresByPillar = Record<Pillar, number>;

export function computeScores(answers: Record<string, boolean>): {
  scoresByPillar: ScoresByPillar;
  totalScore: number;
} {
  const scoresByPillar = pillarOrder.reduce((acc, pillar) => {
    acc[pillar] = 0;
    return acc;
  }, {} as ScoresByPillar);

  for (const question of assessmentQuestions) {
    const value = answers[question.id] ? 1 : 0;
    scoresByPillar[question.pillar] += value;
  }

  const totalScore = pillarOrder.reduce(
    (sum, pillar) => sum + scoresByPillar[pillar],
    0
  );

  return { scoresByPillar, totalScore };
}

export function pickFocusPillar(scoresByPillar: ScoresByPillar): Pillar {
  let best: Pillar = pillarOrder[0];
  let minScore = scoresByPillar[best];

  for (const pillar of pillarOrder) {
    const score = scoresByPillar[pillar];
    if (score < minScore) {
      minScore = score;
      best = pillar;
    }
  }

  return best;
}
