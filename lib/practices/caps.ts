export const FREE_CAP = 1
export const PAID_CAP = 10

export type CapCheckResult =
  | { allowed: true }
  | { allowed: false; reason: 'CAP_REACHED'; cap: number }

export function checkActiveCap(
  subscriptionStatus: string | undefined,
  activeCount: number,
): CapCheckResult {
  const hasPlusPlan = subscriptionStatus?.toUpperCase() === 'PAID'
  const cap = hasPlusPlan ? PAID_CAP : FREE_CAP
  if (activeCount >= cap) return { allowed: false, reason: 'CAP_REACHED', cap }
  return { allowed: true }
}

export function makeUPracticeSK(practiceId: string): string {
  return `UPRACTICE#${practiceId}`
}

export type ProfileData = {
  subscriptionStatus?: string
  activePracticeIds?: string[]
  returnCounters?: Record<string, number> | string
  timezone?: string
  dayResetTime?: number
}
