export type MilestoneType = 'total' | 'practice'
export type MilestoneTier = 'bronze' | 'silver' | 'gold'
export type MilestoneIcon = 'sprout' | 'calendar' | 'flame' | 'trophy' | 'medal'

export type MilestoneDef = {
  type: MilestoneType
  threshold: number
  title: string
  description: string
  icon: MilestoneIcon
  tier: MilestoneTier
}

export type MilestoneItem = {
  PK: string
  SK: string
  type: MilestoneType
  practiceId?: string
  threshold: number
  title: string
  description: string
  achievedAt: string
}

export type NewMilestone = Pick<MilestoneItem, 'type' | 'threshold' | 'title' | 'description'> & {
  practiceId?: string
  icon: MilestoneIcon
  tier: MilestoneTier
}

export const TOTAL_MILESTONES: MilestoneDef[] = [
  { type: 'total', threshold: 1,   title: 'First check-in',  description: 'Logged your very first practice.',     icon: 'sprout',   tier: 'bronze' },
  { type: 'total', threshold: 7,   title: 'One week in',     description: 'Seven check-ins logged.',              icon: 'calendar', tier: 'bronze' },
  { type: 'total', threshold: 30,  title: 'Monthly habit',   description: '30 check-ins across your practices.',  icon: 'flame',    tier: 'silver' },
  { type: 'total', threshold: 100, title: 'Century',         description: '100 total check-ins. Remarkable.',     icon: 'trophy',   tier: 'gold' },
]

export const PRACTICE_MILESTONES: MilestoneDef[] = [
  { type: 'practice', threshold: 7,  title: '7-day practice',  description: '7 check-ins for a single practice.',  icon: 'calendar', tier: 'bronze' },
  { type: 'practice', threshold: 30, title: 'Practice master', description: '30 check-ins for a single practice.', icon: 'medal',    tier: 'silver' },
]

export const ALL_MILESTONE_DEFS = [...TOTAL_MILESTONES, ...PRACTICE_MILESTONES]

export function makeMilestoneSK(type: MilestoneType, threshold: number, practiceId?: string): string {
  if (type === 'total') return `MILESTONE#total#${threshold}`
  return `MILESTONE#practice#${practiceId}#${threshold}`
}

export function getMilestoneDef(type: MilestoneType, threshold: number): MilestoneDef | undefined {
  return ALL_MILESTONE_DEFS.find((d) => d.type === type && d.threshold === threshold)
}

/**
 * Returns milestone thresholds newly crossed after applying delta to updatedCounters.
 * Only triggers for positive delta (check-ins increasing).
 */
export function checkNewMilestones(
  updatedCounters: Record<string, number>,
  practiceId: string,
  delta: number,
): Array<{ type: MilestoneType; threshold: number; practiceId?: string }> {
  if (delta <= 0) return []

  const newTotal = Object.values(updatedCounters).reduce((sum, v) => sum + v, 0)
  const oldTotal = newTotal - delta
  const newPracticeCount = updatedCounters[practiceId] ?? 0
  const oldPracticeCount = newPracticeCount - delta

  const hits: Array<{ type: MilestoneType; threshold: number; practiceId?: string }> = []

  for (const def of TOTAL_MILESTONES) {
    if (newTotal >= def.threshold && oldTotal < def.threshold) {
      hits.push({ type: 'total', threshold: def.threshold })
    }
  }

  for (const def of PRACTICE_MILESTONES) {
    if (newPracticeCount >= def.threshold && oldPracticeCount < def.threshold) {
      hits.push({ type: 'practice', threshold: def.threshold, practiceId })
    }
  }

  return hits
}
