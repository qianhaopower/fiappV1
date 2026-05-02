import { NextResponse } from 'next/server'
import { createDynamoClient } from '@/utils/dynamoClient'
import { withAuth } from '@/utils/authServer'
import { practicesById } from '@/lib/practices/library'
import {
  isTrialActive,
  isTrialExpired,
  getTrialDaysRemaining,
  type TrialItem,
  type ProfileData,
} from '@/lib/practices/trial'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type UPracticeItem = {
  practiceId: string
  pillar: string
  addedAt: string
  status?: 'active' | 'paused' | 'replaced'
  pausedAt?: string
}

export async function GET() {
  return withAuth(undefined, async (user) => {
    const pk = `USER#${user.userId}`
    const client = createDynamoClient()

    const [profile, trials, upractices] = await Promise.all([
      client.getItem<ProfileData>({ PK: pk, SK: 'PROFILE' }),
      client.query<TrialItem>({
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
        ExpressionAttributeValues: { ':pk': pk, ':prefix': 'TRIAL#' },
      }),
      client.query<UPracticeItem>({
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
        ExpressionAttributeValues: { ':pk': pk, ':prefix': 'UPRACTICE#' },
      }),
    ])

    function enrich(up: UPracticeItem) {
      const lib = practicesById.get(up.practiceId)
      if (!lib) return null
      return { ...lib, addedAt: up.addedAt, status: up.status ?? 'active' }
    }

    // Treat no-status (legacy promoted before E6) as active
    const activePractices = upractices
      .filter((up) => !up.status || up.status === 'active')
      .map(enrich)
      .filter(Boolean)

    const pausedPractices = upractices
      .filter((up) => up.status === 'paused')
      .map(enrich)
      .filter(Boolean)

    const activeTrials = trials
      .filter((t) => t.status === 'trial')
      .map((t) => {
        const lib = practicesById.get(t.practiceId)
        if (!lib) return null
        const expired = isTrialExpired(t)
        return {
          ...lib,
          trialSK: t.SK,
          startedAt: t.startedAt,
          expiresAt: t.expiresAt,
          status: expired ? 'expired' : 'trial',
          daysRemaining: expired ? 0 : getTrialDaysRemaining(t),
          active: isTrialActive(t),
        }
      })
      .filter(Boolean)

    return NextResponse.json(
      {
        activePractices,
        pausedPractices,
        trials: activeTrials,
        subscriptionStatus: profile?.subscriptionStatus ?? 'FREE',
        todayFocusPracticeId: profile?.todayFocusPracticeId ?? null,
      },
      { status: 200 }
    )
  })
}
