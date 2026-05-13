import type { Pillar } from '@/lib/assessment/pillars'

export const TRIAL_DURATION_DAYS = 7
export const MAX_CONCURRENT_TRIALS = 1

export const FREE_CAP = 1
export const PAID_CAP = 10

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
  timezone?: string
  dayResetTime?: number
}

export type CapCheckResult =
  | { allowed: true }
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
  const cap = hasPlusPlan ? PAID_CAP : FREE_CAP
  if (activeCount >= cap) return { allowed: false, reason: 'CAP_REACHED', cap }
  return { allowed: true }
}

export function makeTrialSK(startedAt: string, practiceId: string): string {
  return `TRIAL#${startedAt}#${practiceId}`
}

export function makeUPracticeSK(practiceId: string): string {
  return `UPRACTICE#${practiceId}`
}
