import { describe, it, expect } from 'vitest'
import {
  dateRange,
  computeDelta,
  applyDelta,
  makeReturnPK,
  makeReturnSK,
  todayUTC,
  computeStreaks,
  returnDayForUser,
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

describe('returnDayForUser', () => {
  // UTC — after reset
  it('returns today UTC when local time is after reset', () => {
    const now = new Date('2026-01-15T06:00:00Z') // 6 AM UTC, reset at 4 AM
    expect(returnDayForUser({ now, timezone: 'UTC', resetMinutes: 240 })).toBe('2026-01-15')
  })

  // UTC — before reset
  it('returns yesterday UTC when local time is before reset', () => {
    const now = new Date('2026-01-15T02:00:00Z') // 2 AM UTC, reset at 4 AM
    expect(returnDayForUser({ now, timezone: 'UTC', resetMinutes: 240 })).toBe('2026-01-14')
  })

  it('returns today at exactly the reset minute', () => {
    const now = new Date('2026-01-15T04:00:00Z') // 4:00 AM UTC = 240 min
    expect(returnDayForUser({ now, timezone: 'UTC', resetMinutes: 240 })).toBe('2026-01-15')
  })

  it('returns yesterday one minute before reset', () => {
    const now = new Date('2026-01-15T03:59:00Z') // 3:59 AM UTC
    expect(returnDayForUser({ now, timezone: 'UTC', resetMinutes: 240 })).toBe('2026-01-14')
  })

  // Melbourne (AEDT = UTC+11 in January)
  it('returns Melbourne local date when after reset', () => {
    // 2026-01-15T06:00:00Z = 17:00 AEDT (5 PM) — after 4 AM reset
    const now = new Date('2026-01-15T06:00:00Z')
    expect(returnDayForUser({ now, timezone: 'Australia/Melbourne', resetMinutes: 240 })).toBe('2026-01-15')
  })

  it('returns Melbourne yesterday when before reset', () => {
    // 2026-01-14T15:00:00Z = 02:00 AEDT (2 AM) on Jan 15 — before 4 AM reset
    const now = new Date('2026-01-14T15:00:00Z')
    expect(returnDayForUser({ now, timezone: 'Australia/Melbourne', resetMinutes: 240 })).toBe('2026-01-14')
  })

  // US Eastern (EST = UTC-5 in January)
  it('returns US Eastern local date when after reset', () => {
    // 2026-01-15T10:00:00Z = 05:00 EST — after 4 AM reset
    const now = new Date('2026-01-15T10:00:00Z')
    expect(returnDayForUser({ now, timezone: 'America/New_York', resetMinutes: 240 })).toBe('2026-01-15')
  })

  it('returns US Eastern yesterday when before reset', () => {
    // 2026-01-15T06:00:00Z = 01:00 EST — before 4 AM reset
    const now = new Date('2026-01-15T06:00:00Z')
    expect(returnDayForUser({ now, timezone: 'America/New_York', resetMinutes: 240 })).toBe('2026-01-14')
  })

  // DST: US Eastern spring-forward 2026-03-08 (clocks go 2 AM → 3 AM, EST→EDT UTC-4)
  it('handles DST spring-forward: 3:59 AM EDT is before reset', () => {
    // 2026-03-08T07:59:00Z = 03:59 EDT (UTC-4) — before 4 AM reset
    const now = new Date('2026-03-08T07:59:00Z')
    expect(returnDayForUser({ now, timezone: 'America/New_York', resetMinutes: 240 })).toBe('2026-03-07')
  })

  it('handles DST spring-forward: 4:00 AM EDT is at reset', () => {
    // 2026-03-08T08:00:00Z = 04:00 EDT (UTC-4) — at reset
    const now = new Date('2026-03-08T08:00:00Z')
    expect(returnDayForUser({ now, timezone: 'America/New_York', resetMinutes: 240 })).toBe('2026-03-08')
  })

  // Midnight reset
  it('midnight reset (dayResetTime=0) always returns current local date', () => {
    const now = new Date('2026-01-15T00:30:00Z') // 12:30 AM UTC
    expect(returnDayForUser({ now, timezone: 'UTC', resetMinutes: 0 })).toBe('2026-01-15')
  })

  // Year boundary rollback
  it('rolls back across year boundary correctly', () => {
    // 2026-01-01T02:00:00Z = 2 AM UTC, before 4 AM reset → 2025-12-31
    const now = new Date('2026-01-01T02:00:00Z')
    expect(returnDayForUser({ now, timezone: 'UTC', resetMinutes: 240 })).toBe('2025-12-31')
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
