import { NextResponse } from 'next/server'
import { createDynamoClient } from '@/utils/dynamoClient'
import { withAuth } from '@/utils/authServer'
import { practicesById } from '@/lib/practices/library'
import { type ProfileData } from '@/lib/practices/caps'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type UPracticeStatus = 'active' | 'inactive' | 'paused' | 'replaced'

type UPracticeItem = {
  practiceId: string
  pillar: string
  status?: UPracticeStatus
  firstStartedAt?: string
  lastActivatedAt?: string
  lastInactivatedAt?: string
  addedAt?: string
}

export async function GET() {
  return withAuth(undefined, async (user) => {
    const pk = `USER#${user.userId}`
    const client = createDynamoClient()

    const [profile, upractices] = await Promise.all([
      client.getItem<ProfileData>({ PK: pk, SK: 'PROFILE' }),
      client.query<UPracticeItem>({
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
        ExpressionAttributeValues: { ':pk': pk, ':prefix': 'UPRACTICE#' },
      }),
    ])

    function enrich(up: UPracticeItem, normalisedStatus: 'active' | 'inactive') {
      const lib = practicesById.get(up.practiceId)
      if (!lib) return null
      return {
        ...lib,
        addedAt: up.addedAt ?? up.firstStartedAt ?? new Date(0).toISOString(),
        firstStartedAt: up.firstStartedAt,
        lastActivatedAt: up.lastActivatedAt,
        lastInactivatedAt: up.lastInactivatedAt,
        status: normalisedStatus,
      }
    }

    // Legacy lenient read: missing status defaults to active; "paused"/"replaced" → inactive.
    const activePractices = upractices
      .filter((up) => !up.status || up.status === 'active')
      .map((up) => enrich(up, 'active'))
      .filter(Boolean)

    const inactivePractices = upractices
      .filter((up) => up.status === 'inactive' || up.status === 'paused' || up.status === 'replaced')
      .map((up) => enrich(up, 'inactive'))
      .filter(Boolean)

    return NextResponse.json(
      {
        activePractices,
        inactivePractices,
        subscriptionStatus: profile?.subscriptionStatus ?? 'FREE',
      },
      { status: 200 },
    )
  })
}
