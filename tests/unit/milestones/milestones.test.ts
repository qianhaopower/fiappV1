import { describe, it, expect } from 'vitest'
import { checkNewMilestones } from '@/lib/milestones/milestones'

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
    const counters = { 'sleep-consistent-bedtime': 5, 'sleep-screen-off': 4 }
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
    const counters = { 'sleep-consistent-bedtime': 5, 'sleep-screen-off': 7 }
    // logging sleep-consistent-bedtime, oldCount=4, newCount=5
    const hits = checkNewMilestones(counters, 'sleep-consistent-bedtime', 1)
    expect(hits).not.toContainEqual({ type: 'practice', threshold: 7, practiceId: 'sleep-screen-off' })
  })

  it('can trigger both total and practice milestones simultaneously', () => {
    const counters = { 'sleep-consistent-bedtime': 7 }
    const hits = checkNewMilestones(counters, 'sleep-consistent-bedtime', 1)
    expect(hits).toContainEqual({ type: 'total', threshold: 7 })
    expect(hits).toContainEqual({ type: 'practice', threshold: 7, practiceId: 'sleep-consistent-bedtime' })
  })

  it('triggers total milestone using combined counters across practices', () => {
    const counters = { 'sleep-consistent-bedtime': 4, 'sleep-screen-off': 3 }
    // total=7, delta=1, oldTotal=6 → crosses 7
    const hits = checkNewMilestones(counters, 'sleep-consistent-bedtime', 1)
    expect(hits).toContainEqual({ type: 'total', threshold: 7 })
  })
})
