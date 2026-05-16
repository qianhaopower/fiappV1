import { describe, it, expect } from 'vitest'
import {
  checkNewMilestones,
  makeMilestoneSK,
  getMilestoneDef,
  ALL_MILESTONE_DEFS,
  TOTAL_MILESTONES,
  PRACTICE_MILESTONES,
} from '@/lib/milestones/milestones'

describe('checkNewMilestones', () => {
  it('returns empty array when delta is 0', () => {
    expect(checkNewMilestones({ 'sleep-consistent-bedtime': 5 }, 'sleep-consistent-bedtime', 0)).toEqual([])
  })

  it('returns empty array when delta is negative', () => {
    expect(checkNewMilestones({ 'sleep-consistent-bedtime': 4 }, 'sleep-consistent-bedtime', -1)).toEqual([])
  })

  it('triggers total milestone at 1', () => {
    const counters = { 'sleep-consistent-bedtime': 1 }
    const hits = checkNewMilestones(counters, 'sleep-consistent-bedtime', 1)
    expect(hits).toContainEqual({ type: 'total', threshold: 1 })
  })

  it('triggers total milestone at 7', () => {
    const counters = { 'sleep-consistent-bedtime': 7 }
    const hits = checkNewMilestones(counters, 'sleep-consistent-bedtime', 1)
    expect(hits).toContainEqual({ type: 'total', threshold: 7 })
  })

  it('does not re-trigger total milestone at 7 when total was already 8', () => {
    const counters = { 'sleep-consistent-bedtime': 5, 'sleep-dim-before-bed': 4 }
    // total=9, delta=1, oldTotal=8 — doesn't cross 7
    const hits = checkNewMilestones(counters, 'sleep-consistent-bedtime', 1)
    expect(hits).not.toContainEqual({ type: 'total', threshold: 7 })
  })

  it('triggers total milestone at 30', () => {
    const counters = { 'sleep-consistent-bedtime': 30 }
    const hits = checkNewMilestones(counters, 'sleep-consistent-bedtime', 1)
    expect(hits).toContainEqual({ type: 'total', threshold: 30 })
  })

  it('triggers total milestone at 100', () => {
    const counters = { 'sleep-consistent-bedtime': 100 }
    const hits = checkNewMilestones(counters, 'sleep-consistent-bedtime', 1)
    expect(hits).toContainEqual({ type: 'total', threshold: 100 })
  })

  it('triggers practice milestone at 7 for the specific practice', () => {
    const counters = { 'sleep-consistent-bedtime': 7 }
    const hits = checkNewMilestones(counters, 'sleep-consistent-bedtime', 1)
    expect(hits).toContainEqual({ type: 'practice', threshold: 7, practiceId: 'sleep-consistent-bedtime' })
  })

  it('triggers practice milestone at 30', () => {
    const counters = { 'sleep-consistent-bedtime': 30 }
    const hits = checkNewMilestones(counters, 'sleep-consistent-bedtime', 1)
    expect(hits).toContainEqual({ type: 'practice', threshold: 30, practiceId: 'sleep-consistent-bedtime' })
  })

  it('does not trigger practice milestone for a different practice', () => {
    const counters = { 'sleep-consistent-bedtime': 5, 'sleep-dim-before-bed': 7 }
    // logging sleep-consistent-bedtime, oldCount=4, newCount=5
    const hits = checkNewMilestones(counters, 'sleep-consistent-bedtime', 1)
    expect(hits).not.toContainEqual({ type: 'practice', threshold: 7, practiceId: 'sleep-dim-before-bed' })
  })

  it('can trigger both total and practice milestones simultaneously', () => {
    const counters = { 'sleep-consistent-bedtime': 7 }
    const hits = checkNewMilestones(counters, 'sleep-consistent-bedtime', 1)
    expect(hits).toContainEqual({ type: 'total', threshold: 7 })
    expect(hits).toContainEqual({ type: 'practice', threshold: 7, practiceId: 'sleep-consistent-bedtime' })
  })

  it('triggers total milestone using combined counters across practices', () => {
    const counters = { 'sleep-consistent-bedtime': 4, 'sleep-dim-before-bed': 3 }
    // total=7, delta=1, oldTotal=6 → crosses 7
    const hits = checkNewMilestones(counters, 'sleep-consistent-bedtime', 1)
    expect(hits).toContainEqual({ type: 'total', threshold: 7 })
  })

  it('GAP-M4: delta > 1 still triggers milestones that are crossed', () => {
    // counter jumps from 5 to 8 with delta=3, crossing threshold of 7
    const counters = { 'sleep-consistent-bedtime': 8 }
    const hits = checkNewMilestones(counters, 'sleep-consistent-bedtime', 3)
    expect(hits).toContainEqual({ type: 'total', threshold: 7 })
    expect(hits).toContainEqual({ type: 'practice', threshold: 7, practiceId: 'sleep-consistent-bedtime' })
  })

  it('GAP-M5: practice not yet in counters dict — no practice milestone triggers', () => {
    // new-practice has no entry in counters (treated as 0 new, -1 old — below all thresholds)
    const counters = { 'other-practice': 5, 'new-practice': 1 }
    // newPracticeCount=1, oldPracticeCount=0 — doesn't cross practice threshold of 7
    const hits = checkNewMilestones(counters, 'new-practice', 1)
    expect(hits).not.toContainEqual(expect.objectContaining({ type: 'practice', practiceId: 'new-practice' }))
  })
})

describe('makeMilestoneSK', () => {
  it('GAP-M1a: formats total milestone SK correctly', () => {
    expect(makeMilestoneSK('total', 7)).toBe('MILESTONE#total#7')
    expect(makeMilestoneSK('total', 100)).toBe('MILESTONE#total#100')
  })

  it('GAP-M1b: formats practice milestone SK correctly', () => {
    expect(makeMilestoneSK('practice', 7, 'sleep-consistent-bedtime')).toBe(
      'MILESTONE#practice#sleep-consistent-bedtime#7'
    )
    expect(makeMilestoneSK('practice', 30, 'financial-track-spending')).toBe(
      'MILESTONE#practice#financial-track-spending#30'
    )
  })
})

describe('getMilestoneDef', () => {
  it('GAP-M2a: returns the correct def for a known total milestone', () => {
    const def = getMilestoneDef('total', 7)
    expect(def).toBeDefined()
    expect(def?.type).toBe('total')
    expect(def?.threshold).toBe(7)
  })

  it('GAP-M2b: returns the correct def for a known practice milestone', () => {
    const def = getMilestoneDef('practice', 30)
    expect(def).toBeDefined()
    expect(def?.type).toBe('practice')
    expect(def?.threshold).toBe(30)
  })

  it('GAP-M2c: returns undefined for an unknown threshold', () => {
    expect(getMilestoneDef('total', 999)).toBeUndefined()
  })

  it('GAP-M2d: returns undefined for wrong type', () => {
    // threshold 1 exists for total but not for practice
    expect(getMilestoneDef('practice', 1)).toBeUndefined()
  })
})

describe('ALL_MILESTONE_DEFS', () => {
  it('GAP-M3: contains exactly 6 entries — 4 total + 2 practice', () => {
    expect(TOTAL_MILESTONES).toHaveLength(4)
    expect(PRACTICE_MILESTONES).toHaveLength(2)
    expect(ALL_MILESTONE_DEFS).toHaveLength(6)
  })

  it('GAP-M3: total milestone thresholds are 1, 7, 30, 100', () => {
    const thresholds = TOTAL_MILESTONES.map((d) => d.threshold)
    expect(thresholds).toEqual([1, 7, 30, 100])
  })

  it('GAP-M3: practice milestone thresholds are 7, 30', () => {
    const thresholds = PRACTICE_MILESTONES.map((d) => d.threshold)
    expect(thresholds).toEqual([7, 30])
  })
})
