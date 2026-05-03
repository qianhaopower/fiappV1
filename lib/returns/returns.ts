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

export type StreakResult = {
  currentStreak: number
  longestStreak: number
}

/**
 * Computes current and longest streaks from a set of dates where the user
 * logged at least one didIt=true return.
 *
 * Current streak: consecutive days ending on today (or yesterday if today
 * has no log yet — gives the user the full day to check in).
 * Longest streak: longest consecutive run within the lookback window.
 */
export function computeStreaks(
  activeDates: Set<string>,
  today = todayUTC(),
  lookbackDays = 90
): StreakResult {
  const dates = dateRange(lookbackDays, today)

  let longestStreak = 0
  let run = 0
  for (const d of dates) {
    if (activeDates.has(d)) {
      run++
      if (run > longestStreak) longestStreak = run
    } else {
      run = 0
    }
  }

  // Start current streak from today; if today not logged, start from yesterday
  let anchor = today
  if (!activeDates.has(today)) {
    const d = new Date(`${today}T00:00:00Z`)
    d.setUTCDate(d.getUTCDate() - 1)
    anchor = d.toISOString().split('T')[0]
  }

  let currentStreak = 0
  const cur = new Date(`${anchor}T00:00:00Z`)
  for (let i = 0; i < lookbackDays; i++) {
    const dateStr = cur.toISOString().split('T')[0]
    if (activeDates.has(dateStr)) {
      currentStreak++
      cur.setUTCDate(cur.getUTCDate() - 1)
    } else {
      break
    }
  }

  return { currentStreak, longestStreak }
}
