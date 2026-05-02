import { NextResponse } from 'next/server'
import { createDynamoClient } from '@/utils/dynamoClient'
import { withAuth } from '@/utils/authServer'
import type { ProfileData } from '@/lib/practices/trial'
import type { MilestoneItem } from '@/lib/milestones/milestones'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type UPracticeItem = { SK: string; status?: string }

export async function GET(req: Request) {
  return withAuth(req, async (user) => {
    const pk = `USER#${user.userId}`
    const client = createDynamoClient()

    const [profile, upractices, milestones] = await Promise.all([
      client.getItem<ProfileData>({ PK: pk, SK: 'PROFILE' }),
      client.query<UPracticeItem>({
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
        ExpressionAttributeValues: { ':pk': pk, ':prefix': 'UPRACTICE#' },
      }),
      client.query<MilestoneItem>({
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
        ExpressionAttributeValues: { ':pk': pk, ':prefix': 'MILESTONE#' },
        ScanIndexForward: false,
      }),
    ])

    const raw = profile?.returnCounters
    const counters: Record<string, number> =
      typeof raw === 'string'
        ? JSON.parse(raw || '{}')
        : (raw as Record<string, number> | undefined) ?? {}

    const totalReturns = Object.values(counters).reduce((sum, v) => sum + v, 0)
    const practicesActivated = upractices.length

    return NextResponse.json({
      ok: true,
      totalReturns,
      practicesActivated,
      milestones: milestones.map((m) => ({
        sk: m.SK,
        type: m.type,
        threshold: m.threshold,
        practiceId: m.practiceId,
        title: m.title,
        description: m.description,
        achievedAt: m.achievedAt,
      })),
    })
  })
}
