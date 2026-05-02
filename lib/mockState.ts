import type { Pillar } from '@/lib/assessment/pillars'

// TODO: replace all MOCK_* exports with real API data as each epic lands

export type MockPractice = {
  id: string
  title: string
  pillar: Pillar
  description: string
}

export type MockTrial = MockPractice & {
  daysLeft: number
}

export const MOCK_PILLAR_SCORES: Record<Pillar, number> = {
  financial: 3,
  relationship: 4,
  information: 2,
  emotional: 4,
  nutrition: 3,
  dynamic: 5,
  sleep: 1,   // lowest → focus pillar
}

export const MOCK_FOCUS_PILLAR: Pillar = 'sleep'

export const MOCK_PILLAR_LABELS: Record<Pillar, string> = {
  financial: 'Financial',
  relationship: 'Relationship',
  information: 'Information',
  emotional: 'Emotional',
  nutrition: 'Nutrition',
  dynamic: 'Dynamic',
  sleep: 'Sleep',
}

export const MOCK_ACTIVE_PRACTICES: MockPractice[] = [
  {
    id: 'practice-financial-1',
    title: 'Track weekly spending',
    pillar: 'financial',
    description: 'Review your bank transactions once a week.',
  },
]

export const MOCK_TRIALS: MockTrial[] = [
  {
    id: 'trial-sleep-1',
    title: 'Set a consistent bedtime',
    pillar: 'sleep',
    description: 'Go to bed at the same time each night.',
    daysLeft: 5,
  },
]

export const MOCK_FOCUS_PRACTICE = MOCK_ACTIVE_PRACTICES[0]

export const MOCK_COUNTERS = {
  totalReturns: 12,
  currentStreak: 3,
  longestStreak: 7,
  practicesActivated: 4,
}

export const MOCK_MILESTONES = [
  {
    id: 'first-return',
    title: 'First check-in',
    description: 'Logged your very first daily return.',
    achievedAt: '2026-04-01',
  },
  {
    id: 'streak-3',
    title: '3-day streak',
    description: 'Checked in 3 days in a row.',
    achievedAt: '2026-04-20',
  },
]

// 14 days of mock return dots: true = did it, false = skipped, null = no data yet
export const MOCK_RETURN_DOTS: (boolean | null)[] = [
  true, true, false, true, true, true, false,
  null, true, true, false, true, true, true,
]
