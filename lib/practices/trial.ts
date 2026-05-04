import type { Pillar } from '@/lib/assessment/pillars'

export const TRIAL_DURATION_DAYS = 7
export const MAX_CONCURRENT_TRIALS = 1

export const FREE_CAP = 1
export const PAID_CAP = 10
export const PAID_WARN_HIGH = 7
export const PAID_WARN_LOW = 5

export type TrialStatus = 'trial' | 'promoted' | 'expired' | 'discarded'

export type TrialItem = {
  PK: string
  SK: string
  practiceId: string
  pillar: Pillar
  startedAt: string
  status: TrialStatus
  expiresAt: string
  resolvedAt?: string
}

export type ProfileData = {
  subscriptionStatus?: string
  activePracticeIds?: string[]
  activePracticeSkById?: Record<string, string>
  todayFocusPracticeId?: string | null
  returnCounters?: Record<string, number> | string
}

export type CapCheckResult =
  | { allowed: true; warning?: 'APPROACHING_CAP'; remaining?: number }
  | { allowed: false; reason: 'CAP_REACHED'; cap: number }

export function isTrialActive(trial: TrialItem): boolean {
  return trial.status === 'trial' && !isTrialExpired(trial)
}

export function isTrialExpired(trial: TrialItem): boolean {
  return new Date(trial.expiresAt) < new Date()
}

export function getTrialDaysRemaining(trial: TrialItem): number {
  const ms = new Date(trial.expiresAt).getTime() - Date.now()
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)))
}

export function checkActiveCap(
  subscriptionStatus: string | undefined,
  activeCount: number
): CapCheckResult {
  const hasPlusPlan = subscriptionStatus?.toUpperCase() === 'PAID'

  if (!hasPlusPlan) {
    if (activeCount >= FREE_CAP) return { allowed: false, reason: 'CAP_REACHED', cap: FREE_CAP }
    return { allowed: true }
  }

  if (activeCount >= PAID_CAP) return { allowed: false, reason: 'CAP_REACHED', cap: PAID_CAP }
  if (activeCount >= PAID_WARN_HIGH)
    return { allowed: true, warning: 'APPROACHING_CAP', remaining: PAID_CAP - activeCount }
  if (activeCount >= PAID_WARN_LOW)
    return { allowed: true, warning: 'APPROACHING_CAP', remaining: PAID_CAP - activeCount }
  return { allowed: true }
}

export function makeTrialSK(startedAt: string, practiceId: string): string {
  return `TRIAL#${startedAt}#${practiceId}`
}

export function makeUPracticeSK(practiceId: string): string {
  return `UPRACTICE#${practiceId}`
}
