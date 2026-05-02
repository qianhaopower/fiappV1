import { describe, it, expect } from 'vitest'
import { getSuggestions } from '@/lib/practices/suggestions'
import { practices } from '@/lib/practices/library'
import { pillarOrder } from '@/lib/assessment/pillars'

describe('getSuggestions', () => {
  it('returns exactly 3 practices for a given focus pillar', () => {
    for (const pillar of pillarOrder) {
      const result = getSuggestions(pillar)
      expect(result).toHaveLength(3)
    }
  })

  it('returns only practices from the focus pillar', () => {
    const result = getSuggestions('sleep')
    expect(result.every((p) => p.pillar === 'sleep')).toBe(true)
  })

  it('returns 3 fallback practices when focusPillar is null', () => {
    const result = getSuggestions(null)
    expect(result).toHaveLength(3)
  })

  it('returns 3 fallback practices when focusPillar is undefined', () => {
    const result = getSuggestions(undefined)
    expect(result).toHaveLength(3)
  })

  it('each practice has all required fields', () => {
    const result = getSuggestions('financial')
    for (const p of result) {
      expect(p).toHaveProperty('id')
      expect(p).toHaveProperty('pillar')
      expect(p).toHaveProperty('title')
      expect(p).toHaveProperty('description')
      expect(p).toHaveProperty('rationale')
      expect(typeof p.id).toBe('string')
      expect(typeof p.title).toBe('string')
      expect(typeof p.description).toBe('string')
      expect(typeof p.rationale).toBe('string')
    }
  })

  it('fallback practices come from different pillars', () => {
    const result = getSuggestions(null)
    const pillars = result.map((p) => p.pillar)
    const unique = new Set(pillars)
    expect(unique.size).toBe(3)
  })

  it('library has exactly 3 practices per pillar', () => {
    for (const pillar of pillarOrder) {
      const count = practices.filter((p) => p.pillar === pillar).length
      expect(count).toBe(3)
    }
  })
})
