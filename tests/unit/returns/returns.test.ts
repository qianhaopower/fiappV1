import { describe, it, expect } from 'vitest'
import {
  dateRange,
  computeDelta,
  applyDelta,
  makeReturnPK,
  makeReturnSK,
  todayUTC,
  computeStreaks,
} from '@/lib/returns/returns'

describe('todayUTC', () => {
  it('returns a YYYY-MM-DD string', () => {
    expect(todayUTC()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

describe('dateRange', () => {
  it('returns exactly N dates', () => {
    expect(dateRange(14)).toHaveLength(14)
    expect(dateRange(7)).toHaveLength(7)
    expect(dateRange(30)).toHaveLength(30)
  })

  it('last entry is the end date', () => {
    const range = dateRange(7, '2026-01-10')
    expect(range[range.length - 1]).toBe('2026-01-10')
  })

  it('first entry is N-1 days before end', () => {
    const range = dateRange(7, '2026-01-10')
    expect(range[0]).toBe('2026-01-04')
  })

  it('is ordered oldest → newest', () => {
    const range = dateRange(5, '2026-01-05')
    expect(range).toEqual(['2026-01-01', '2026-01-02', '2026-01-03', '2026-01-04', '2026-01-05'])
  })
})

describe('computeDelta', () => {
  it('new record didIt=true → +1', () => expect(computeDelta(undefined, true)).toBe(1))
  it('new record didIt=false → 0', () => expect(computeDelta(undefined, false)).toBe(0))
  it('toggle true→false → -1', () => expect(computeDelta(true, false)).toBe(-1))
  it('toggle false→true → +1', () => expect(computeDelta(false, true)).toBe(1))
  it('same value true→true → 0', () => expect(computeDelta(true, true)).toBe(0))
  it('same value false→false → 0', () => expect(computeDelta(false, false)).toBe(0))
})

describe('applyDelta', () => {
  it('increments counter', () => {
    expect(applyDelta({ 'p1': 3 }, 'p1', 1)).toEqual({ 'p1': 4 })
  })

  it('decrements counter', () => {
    expect(applyDelta({ 'p1': 3 }, 'p1', -1)).toEqual({ 'p1': 2 })
  })

  it('initialises missing key at 0 + delta', () => {
    expect(applyDelta({}, 'p1', 1)).toEqual({ 'p1': 1 })
  })

  it('guards against negative counters', () => {
    expect(applyDelta({ 'p1': 0 }, 'p1', -1)).toEqual({ 'p1': 0 })
  })

  it('no-op when delta is 0', () => {
    const counters = { 'p1': 5 }
    expect(applyDelta(counters, 'p1', 0)).toBe(counters)
  })
})

describe('computeStreaks', () => {
  const today = '2026-05-03'

  it('returns 0/0 for empty active dates', () => {
    expect(computeStreaks(new Set(), today)).toEqual({ currentStreak: 0, longestStreak: 0 })
  })

  it('currentStreak=1 when only today is active', () => {
    expect(computeStreaks(new Set([today]), today)).toMatchObject({ currentStreak: 1 })
  })

  it('currentStreak counts consecutive days ending today', () => {
    const dates = new Set(['2026-05-01', '2026-05-02', '2026-05-03'])
    expect(computeStreaks(dates, today)).toMatchObject({ currentStreak: 3 })
  })

  it('currentStreak breaks on a gap', () => {
    const dates = new Set(['2026-04-30', '2026-05-02', '2026-05-03'])
    expect(computeStreaks(dates, today)).toMatchObject({ currentStreak: 2 })
  })

  it('uses yesterday as anchor when today not logged', () => {
    // today = 2026-05-03, not logged; yesterday = 2026-05-02 logged
    const dates = new Set(['2026-05-01', '2026-05-02'])
    expect(computeStreaks(dates, today)).toMatchObject({ currentStreak: 2 })
  })

  it('currentStreak=0 when yesterday not logged either', () => {
    const dates = new Set(['2026-04-30'])
    expect(computeStreaks(dates, today)).toMatchObject({ currentStreak: 0 })
  })

  it('longestStreak finds the longest run', () => {
    // run of 3, gap, run of 5
    const dates = new Set([
      '2026-04-01', '2026-04-02', '2026-04-03',
      '2026-04-10', '2026-04-11', '2026-04-12', '2026-04-13', '2026-04-14',
    ])
    expect(computeStreaks(dates, today)).toMatchObject({ longestStreak: 5 })
  })

  it('longestStreak >= currentStreak', () => {
    const dates = new Set(['2026-04-01', '2026-04-02', '2026-04-03', '2026-05-03'])
    const { currentStreak, longestStreak } = computeStreaks(dates, today)
    expect(longestStreak).toBeGreaterThanOrEqual(currentStreak)
  })
})

describe('SK helpers', () => {
  it('makeReturnPK', () => {
    expect(makeReturnPK('u1', 'sleep-consistent-bedtime')).toBe(
      'USER#u1#PRACTICE#sleep-consistent-bedtime'
    )
  })
  it('makeReturnSK', () => {
    expect(makeReturnSK('2026-01-15')).toBe('DATE#2026-01-15')
  })
})
