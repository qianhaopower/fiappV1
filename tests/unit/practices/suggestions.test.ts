import { describe, it, expect } from 'vitest'
import { getSuggestedPractices, getFallbackSuggestions } from '@/lib/practices/suggestions'
import { practices } from '@/lib/practices/library'
import { assessmentQuestions } from '@/lib/assessment/questions'
import { pillarOrder } from '@/lib/assessment/pillars'

function allAnswers(value: boolean): Record<string, boolean> {
  return Object.fromEntries(assessmentQuestions.map((q) => [q.id, value]))
}

describe('getSuggestedPractices', () => {
  it('returns 3 practices for the given lowest pillar', () => {
    const result = getSuggestedPractices(allAnswers(true), 'sleep')
    expect(result).toHaveLength(3)
    expect(result.every((p) => p.pillar === 'sleep')).toBe(true)
  })

  it('ranks "no" answers before "yes" answers within the pillar', () => {
    const answers = allAnswers(true)
    answers['sleep-3'] = false
    const result = getSuggestedPractices(answers, 'sleep')
    expect(result[0].mappedQuestionId).toBe('sleep-3')
  })

  it('breaks ties (all-yes) by question order ascending', () => {
    const result = getSuggestedPractices(allAnswers(true), 'sleep')
    expect(result.map((p) => p.mappedQuestionId)).toEqual(['sleep-1', 'sleep-2', 'sleep-3'])
  })

  it('pads with yes-answers when fewer than 3 no-answers exist', () => {
    const answers = allAnswers(true)
    answers['sleep-4'] = false
    const result = getSuggestedPractices(answers, 'sleep')
    expect(result).toHaveLength(3)
    expect(result[0].mappedQuestionId).toBe('sleep-4')
    expect(result.slice(1).map((p) => p.mappedQuestionId)).toEqual(['sleep-1', 'sleep-2'])
  })

  it('orders multiple no-answers by question order within pillar', () => {
    const answers = allAnswers(true)
    answers['nutrition-5'] = false
    answers['nutrition-2'] = false
    answers['nutrition-4'] = false
    const result = getSuggestedPractices(answers, 'nutrition')
    expect(result.map((p) => p.mappedQuestionId)).toEqual([
      'nutrition-2',
      'nutrition-4',
      'nutrition-5',
    ])
  })

  it('is deterministic across repeated calls', () => {
    const answers = allAnswers(true)
    answers['nutrition-2'] = false
    answers['nutrition-5'] = false
    const a = getSuggestedPractices(answers, 'nutrition')
    const b = getSuggestedPractices(answers, 'nutrition')
    expect(a.map((p) => p.id)).toEqual(b.map((p) => p.id))
  })

  it('each returned practice has the expected shape', () => {
    const result = getSuggestedPractices(allAnswers(false), 'financial')
    for (const p of result) {
      expect(p).toHaveProperty('id')
      expect(p).toHaveProperty('pillar', 'financial')
      expect(p).toHaveProperty('title')
      expect(p).toHaveProperty('description')
      expect(p).toHaveProperty('rationale')
      expect(p).toHaveProperty('order')
      expect(p).toHaveProperty('mappedQuestionId')
    }
  })
})

describe('getFallbackSuggestions', () => {
  it('returns 3 practices', () => {
    expect(getFallbackSuggestions()).toHaveLength(3)
  })

  it('practices come from distinct pillars', () => {
    const pillars = getFallbackSuggestions().map((p) => p.pillar)
    expect(new Set(pillars).size).toBe(3)
  })
})

describe('library invariants (sanity)', () => {
  it('has exactly 5 practices per pillar', () => {
    for (const pillar of pillarOrder) {
      const count = practices.filter((p) => p.pillar === pillar).length
      expect(count).toBe(5)
    }
  })
})
