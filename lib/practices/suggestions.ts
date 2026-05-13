import type { Pillar } from '@/lib/assessment/pillars'
import {
  type Practice,
  practiceByQuestionId,
  practicesByPillar,
} from './library'
import { assessmentQuestions } from '@/lib/assessment/questions'

const FALLBACK_PILLARS: Pillar[] = ['sleep', 'emotional', 'financial']

export function getFallbackSuggestions(): Practice[] {
  return FALLBACK_PILLARS
    .map((p) => practicesByPillar[p]?.[0])
    .filter((p): p is Practice => Boolean(p))
}

export function getSuggestedPractices(
  answers: Record<string, boolean>,
  lowestPillar: Pillar,
): Practice[] {
  const pillarQuestions = assessmentQuestions.filter(
    (q) => q.pillar === lowestPillar,
  )

  const ranked = pillarQuestions.slice().sort((a, b) => {
    const aWeak = answers[a.id] === false ? 0 : 1
    const bWeak = answers[b.id] === false ? 0 : 1
    if (aWeak !== bWeak) return aWeak - bWeak
    return a.order - b.order
  })

  const out: Practice[] = []
  for (const q of ranked) {
    const p = practiceByQuestionId.get(q.id)
    if (p) out.push(p)
    if (out.length === 3) break
  }
  return out
}
