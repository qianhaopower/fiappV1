import { describe, it, expect } from 'vitest'
import {
  isTrialActive,
  isTrialExpired,
  getTrialDaysRemaining,
  checkActiveCap,
  makeTrialSK,
  makeUPracticeSK,
  FREE_CAP,
  PAID_CAP,
  TRIAL_DURATION_DAYS,
  MAX_CONCURRENT_TRIALS,
  type TrialItem,
} from '@/lib/practices/trial'

// Trial-handling helpers stay exported through Cut 3 for lenient legacy reads.
// Cut 5 deletes lib/practices/trial.ts entirely (along with these tests).

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
    expect(isTrialExpired(makeTrial())).toBe(false)
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
    expect(getTrialDaysRemaining(makeTrial())).toBe(7)
  })

  it('returns 0 for an expired trial', () => {
    const trial = makeTrial({ expiresAt: new Date(Date.now() - 1000).toISOString() })
    expect(getTrialDaysRemaining(trial)).toBe(0)
  })

  it('returns approximately 4 for a trial expiring in 4 days', () => {
    const expiresAt = new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString()
    expect(getTrialDaysRemaining(makeTrial({ expiresAt }))).toBe(4)
  })
})

describe('checkActiveCap (v2 — no warnings)', () => {
  it('FREE: allows when count is 0', () => {
    expect(checkActiveCap('FREE', 0)).toEqual({ allowed: true })
  })

  it('FREE: blocks at FREE_CAP', () => {
    const result = checkActiveCap('FREE', FREE_CAP)
    expect(result).toEqual({ allowed: false, reason: 'CAP_REACHED', cap: FREE_CAP })
  })

  it('PAID: allows when count is below cap', () => {
    expect(checkActiveCap('PAID', 0)).toEqual({ allowed: true })
    expect(checkActiveCap('PAID', 5)).toEqual({ allowed: true })
    expect(checkActiveCap('PAID', 9)).toEqual({ allowed: true })
  })

  it('PAID: no warning at 5+/7+ (dropped in v2)', () => {
    const r5 = checkActiveCap('PAID', 5)
    const r7 = checkActiveCap('PAID', 7)
    expect(r5).toEqual({ allowed: true })
    expect(r7).toEqual({ allowed: true })
    expect((r5 as { warning?: unknown }).warning).toBeUndefined()
    expect((r7 as { warning?: unknown }).warning).toBeUndefined()
  })

  it('PAID: blocks at PAID_CAP', () => {
    const result = checkActiveCap('PAID', PAID_CAP)
    expect(result).toEqual({ allowed: false, reason: 'CAP_REACHED', cap: PAID_CAP })
  })

  it('defaults to FREE behaviour when status is undefined', () => {
    expect(checkActiveCap(undefined, FREE_CAP).allowed).toBe(false)
  })

  it('lowercase "paid" is treated as PAID', () => {
    expect(checkActiveCap('paid', 1).allowed).toBe(true)
  })

  it('lowercase "free" is treated as FREE — blocks at FREE_CAP', () => {
    expect(checkActiveCap('free', FREE_CAP).allowed).toBe(false)
  })

  it('null status defaults to FREE behaviour', () => {
    expect(checkActiveCap(null as unknown as undefined, FREE_CAP).allowed).toBe(false)
  })
})

describe('SK helpers', () => {
  it('makeTrialSK produces correct format', () => {
    expect(makeTrialSK('2026-01-01T00:00:00.000Z', 'sleep-rest')).toBe(
      'TRIAL#2026-01-01T00:00:00.000Z#sleep-rest',
    )
  })

  it('makeUPracticeSK produces correct format', () => {
    expect(makeUPracticeSK('sleep-rest')).toBe('UPRACTICE#sleep-rest')
  })
})

describe('exported constants', () => {
  it('TRIAL_DURATION_DAYS is 7', () => expect(TRIAL_DURATION_DAYS).toBe(7))
  it('MAX_CONCURRENT_TRIALS is 1', () => expect(MAX_CONCURRENT_TRIALS).toBe(1))
  it('FREE_CAP is 1', () => expect(FREE_CAP).toBe(1))
  it('PAID_CAP is 10', () => expect(PAID_CAP).toBe(10))
})
