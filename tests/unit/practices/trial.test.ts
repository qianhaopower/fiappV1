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

  it(`PAID: warns at ${PAID_WARN_LOW}`, () => {
    const result = checkActiveCap('PAID', PAID_WARN_LOW)
    expect(result.allowed).toBe(true)
    if (result.allowed) expect(result.warning).toBe('APPROACHING_CAP')
  })

  it(`PAID: warns at ${PAID_WARN_HIGH}`, () => {
    const result = checkActiveCap('PAID', PAID_WARN_HIGH)
    expect(result.allowed).toBe(true)
    if (result.allowed) expect(result.warning).toBe('APPROACHING_CAP')
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
