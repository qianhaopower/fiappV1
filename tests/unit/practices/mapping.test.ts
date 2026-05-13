import { describe, it, expect } from 'vitest'
import { pillarOrder } from '@/lib/assessment/pillars'
import {
  practices,
  practicesById,
  practiceByQuestionId,
  practicesByPillar,
} from '@/lib/practices/library'
import {
  QUESTIONS,
  assessmentQuestionsById,
  questionByPracticeId,
} from '@/lib/assessment/questions'

describe('Practice ↔ Question 1:1 mapping', () => {
  it('has exactly 35 practices and 35 questions', () => {
    expect(practices).toHaveLength(35)
    expect(QUESTIONS).toHaveLength(35)
  })

  it('has exactly 5 practices and 5 questions per pillar', () => {
    for (const pillar of pillarOrder) {
      const ps = practices.filter((p) => p.pillar === pillar)
      const qs = QUESTIONS.filter((q) => q.pillar === pillar)
      expect(ps, `practices in ${pillar}`).toHaveLength(5)
      expect(qs, `questions in ${pillar}`).toHaveLength(5)
    }
  })

  it('every practice points to a real question, and the question points back', () => {
    for (const p of practices) {
      const q = assessmentQuestionsById.get(p.mappedQuestionId)
      expect(q, `practice ${p.id} → question ${p.mappedQuestionId}`).toBeDefined()
      expect(q!.mappedPracticeId, `round-trip from ${p.id}`).toBe(p.id)
    }
  })

  it('every question points to a real practice, and the practice points back', () => {
    for (const q of QUESTIONS) {
      const p = practicesById.get(q.mappedPracticeId)
      expect(p, `question ${q.id} → practice ${q.mappedPracticeId}`).toBeDefined()
      expect(p!.mappedQuestionId, `round-trip from ${q.id}`).toBe(q.id)
    }
  })

  it('mapping is 1-to-1 (no two practices map to the same question)', () => {
    const seen = new Set<string>()
    for (const p of practices) {
      expect(seen.has(p.mappedQuestionId), `duplicate mapping to ${p.mappedQuestionId}`).toBe(false)
      seen.add(p.mappedQuestionId)
    }
    expect(seen.size).toBe(35)
  })

  it('mapping is 1-to-1 (no two questions map to the same practice)', () => {
    const seen = new Set<string>()
    for (const q of QUESTIONS) {
      expect(seen.has(q.mappedPracticeId), `duplicate mapping to ${q.mappedPracticeId}`).toBe(false)
      seen.add(q.mappedPracticeId)
    }
    expect(seen.size).toBe(35)
  })

  it('mapped pairs share the same pillar', () => {
    for (const p of practices) {
      const q = assessmentQuestionsById.get(p.mappedQuestionId)!
      expect(q.pillar, `${p.id} ↔ ${q.id} pillar mismatch`).toBe(p.pillar)
    }
  })

  it('order field is 1..5 within each pillar, with no gaps or duplicates', () => {
    for (const pillar of pillarOrder) {
      const pOrders = practices.filter((p) => p.pillar === pillar).map((p) => p.order).sort()
      const qOrders = QUESTIONS.filter((q) => q.pillar === pillar).map((q) => q.order).sort()
      expect(pOrders).toEqual([1, 2, 3, 4, 5])
      expect(qOrders).toEqual([1, 2, 3, 4, 5])
    }
  })

  it('practicesByPillar returns 5 entries per pillar, sorted by order', () => {
    for (const pillar of pillarOrder) {
      const ps = practicesByPillar[pillar]
      expect(ps).toHaveLength(5)
      expect(ps.map((p) => p.order)).toEqual([1, 2, 3, 4, 5])
    }
  })

  it('practiceByQuestionId / questionByPracticeId both have 35 entries', () => {
    expect(practiceByQuestionId.size).toBe(35)
    expect(questionByPracticeId.size).toBe(35)
  })
})
