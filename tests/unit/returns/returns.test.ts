import { describe, it, expect } from 'vitest'
import {
  dateRange,
  computeDelta,
  applyDelta,
  makeReturnPK,
  makeReturnSK,
  todayUTC,
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
