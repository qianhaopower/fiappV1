export const RETURNS_MIN_DAYS = 1
export const RETURNS_MAX_DAYS = 30
export const RETURNS_DEFAULT_DAYS = 14

export type ReturnItem = {
  PK: string
  SK: string
  didIt: boolean
  createdAt: string
  updatedAt: string
}

export type DotEntry = {
  date: string       // YYYY-MM-DD
  didIt: boolean | null
}

export function todayUTC(): string {
  return new Date().toISOString().split('T')[0]
}

export function dateRange(days: number, endDate = todayUTC()): string[] {
  const end = new Date(`${endDate}T00:00:00Z`)
  const dates: string[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(end)
    d.setUTCDate(d.getUTCDate() - i)
    dates.push(d.toISOString().split('T')[0])
  }
  return dates
}

export function makeReturnPK(userId: string, practiceId: string): string {
  return `USER#${userId}#PRACTICE#${practiceId}`
}

export function makeReturnSK(date: string): string {
  return `DATE#${date}`
}

/** delta to apply to the didIt counter (+1, -1, or 0) */
export function computeDelta(oldDidIt: boolean | undefined, newDidIt: boolean): number {
  if (oldDidIt === newDidIt) return 0          // no-op
  if (oldDidIt === undefined) return newDidIt ? 1 : 0   // new record
  return newDidIt ? 1 : -1                     // toggle
}

export function applyDelta(
  counters: Record<string, number>,
  practiceId: string,
  delta: number
): Record<string, number> {
  if (delta === 0) return counters
  const current = counters[practiceId] ?? 0
  return { ...counters, [practiceId]: Math.max(0, current + delta) }
}
