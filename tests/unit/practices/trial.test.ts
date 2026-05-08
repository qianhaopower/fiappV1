import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import {
  isTrialActive,
  isTrialExpired,
  getTrialDaysRemaining,
  checkActiveCap,
  makeTrialSK,
  makeUPracticeSK,
  FREE_CAP,
  PAID_CAP,
  PAID_WARN_HIGH,
  PAID_WARN_LOW,
  TRIAL_DURATION_DAYS,
  MAX_CONCURRENT_TRIALS,
  type TrialItem,
} from '@/lib/practices/trial'

function makeTrial(overrides: Partial<TrialItem> = {}): TrialItem {
  const now = new Date()
  const expires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
  return {
    PK: 'USER#u1',
    SK: `TRIAL#${now.toISOString()}#practice-1`,
    practiceId: 'practice-1',
    pillar: 'sleep',
    startedAt: now.toISOString(),
    status: 'trial',
    expiresAt: expires.toISOString(),
    ...overrides,
  }
}

describe('isTrialExpired', () => {
  it('returns false for a future expiresAt', () => {
    const trial = makeTrial()
    expect(isTrialExpired(trial)).toBe(false)
  })

  it('returns true for a past expiresAt', () => {
    const trial = makeTrial({ expiresAt: new Date(Date.now() - 1000).toISOString() })
    expect(isTrialExpired(trial)).toBe(true)
  })
})

describe('isTrialActive', () => {
  it('returns true when status=trial and not expired', () => {
    expect(isTrialActive(makeTrial())).toBe(true)
  })

  it('returns false when status=promoted', () => {
    expect(isTrialActive(makeTrial({ status: 'promoted' }))).toBe(false)
  })

  it('returns false when status=discarded', () => {
    expect(isTrialActive(makeTrial({ status: 'discarded' }))).toBe(false)
  })

  it('returns false when expired even if status=trial', () => {
    const trial = makeTrial({ expiresAt: new Date(Date.now() - 1000).toISOString() })
    expect(isTrialActive(trial)).toBe(false)
  })
})

describe('getTrialDaysRemaining', () => {
  it('returns 7 for a brand-new trial', () => {
    const days = getTrialDaysRemaining(makeTrial())
    expect(days).toBe(7)
  })

  it('returns 0 for an expired trial', () => {
    const trial = makeTrial({ expiresAt: new Date(Date.now() - 1000).toISOString() })
    expect(getTrialDaysRemaining(trial)).toBe(0)
  })

  it('GAP-T4: returns approximately 4 for a trial that started 3 days ago', () => {
    const expiresAt = new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString()
    const trial = makeTrial({ expiresAt })
    expect(getTrialDaysRemaining(trial)).toBe(4)
  })
})

describe('checkActiveCap', () => {
  it('FREE: allows when count is 0', () => {
    expect(checkActiveCap('FREE', 0)).toEqual({ allowed: true })
  })

  it(`FREE: blocks at ${FREE_CAP}`, () => {
    const result = checkActiveCap('FREE', FREE_CAP)
    expect(result.allowed).toBe(false)
    if (!result.allowed) expect(result.reason).toBe('CAP_REACHED')
  })

  it('PAID: allows when count is 0', () => {
    expect(checkActiveCap('PAID', 0)).toEqual({ allowed: true })
  })

  it(`GAP-T1a: PAID: no warning below PAID_WARN_LOW (count=${PAID_WARN_LOW - 1})`, () => {
    const result = checkActiveCap('PAID', PAID_WARN_LOW - 1)
    expect(result.allowed).toBe(true)
    if (result.allowed) expect(result.warning).toBeUndefined()
  })

  it(`PAID: warns at ${PAID_WARN_LOW}`, () => {
    const result = checkActiveCap('PAID', PAID_WARN_LOW)
    expect(result.allowed).toBe(true)
    if (result.allowed) {
      expect(result.warning).toBe('APPROACHING_CAP')
      expect(result.remaining).toBe(PAID_CAP - PAID_WARN_LOW)
    }
  })

  it(`GAP-T1b: PAID: warns between PAID_WARN_LOW and PAID_WARN_HIGH (count=6)`, () => {
    const result = checkActiveCap('PAID', 6)
    expect(result.allowed).toBe(true)
    if (result.allowed) {
      expect(result.warning).toBe('APPROACHING_CAP')
      expect(result.remaining).toBe(PAID_CAP - 6)
    }
  })

  it(`PAID: warns at ${PAID_WARN_HIGH}`, () => {
    const result = checkActiveCap('PAID', PAID_WARN_HIGH)
    expect(result.allowed).toBe(true)
    if (result.allowed) {
      expect(result.warning).toBe('APPROACHING_CAP')
      expect(result.remaining).toBe(PAID_CAP - PAID_WARN_HIGH)
    }
  })

  it(`GAP-T1c: PAID: warns at count=8, remaining=2`, () => {
    const result = checkActiveCap('PAID', 8)
    expect(result.allowed).toBe(true)
    if (result.allowed) {
      expect(result.warning).toBe('APPROACHING_CAP')
      expect(result.remaining).toBe(2)
    }
  })

  it(`GAP-T1d: PAID: warns at count=9, remaining=1`, () => {
    const result = checkActiveCap('PAID', 9)
    expect(result.allowed).toBe(true)
    if (result.allowed) {
      expect(result.warning).toBe('APPROACHING_CAP')
      expect(result.remaining).toBe(1)
    }
  })

  it(`PAID: blocks at ${PAID_CAP}`, () => {
    const result = checkActiveCap('PAID', PAID_CAP)
    expect(result.allowed).toBe(false)
    if (!result.allowed) expect(result.reason).toBe('CAP_REACHED')
  })

  it('defaults to FREE behaviour when status is undefined', () => {
    const result = checkActiveCap(undefined, FREE_CAP)
    expect(result.allowed).toBe(false)
  })

  it('GAP-T2a: lowercase "paid" is treated as PAID — allows at count below cap', () => {
    const result = checkActiveCap('paid', 1)
    expect(result.allowed).toBe(true)
  })

  it('GAP-T2b: lowercase "free" is treated as FREE — blocks at FREE_CAP', () => {
    const result = checkActiveCap('free', FREE_CAP)
    expect(result.allowed).toBe(false)
  })

  it('GAP-T3: null status defaults to FREE behaviour — blocks at FREE_CAP', () => {
    const result = checkActiveCap(null as unknown as undefined, FREE_CAP)
    expect(result.allowed).toBe(false)
  })
})

describe('SK helpers', () => {
  it('makeTrialSK produces correct format', () => {
    expect(makeTrialSK('2026-01-01T00:00:00.000Z', 'sleep-rest')).toBe(
      'TRIAL#2026-01-01T00:00:00.000Z#sleep-rest'
    )
  })

  it('makeUPracticeSK produces correct format', () => {
    expect(makeUPracticeSK('sleep-rest')).toBe('UPRACTICE#sleep-rest')
  })
})

describe('GAP-T5: exported constants', () => {
  it('TRIAL_DURATION_DAYS is 7', () => expect(TRIAL_DURATION_DAYS).toBe(7))
  it('MAX_CONCURRENT_TRIALS is 1', () => expect(MAX_CONCURRENT_TRIALS).toBe(1))
  it('FREE_CAP is 1', () => expect(FREE_CAP).toBe(1))
  it('PAID_CAP is 10', () => expect(PAID_CAP).toBe(10))
  it('PAID_WARN_LOW is 5', () => expect(PAID_WARN_LOW).toBe(5))
  it('PAID_WARN_HIGH is 7', () => expect(PAID_WARN_HIGH).toBe(7))
})
