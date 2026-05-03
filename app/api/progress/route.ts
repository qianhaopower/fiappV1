import { NextResponse } from 'next/server'
import { createDynamoClient, createReturnsClient } from '@/utils/dynamoClient'
import { withAuth } from '@/utils/authServer'
import type { ProfileData } from '@/lib/practices/trial'
import type { MilestoneItem } from '@/lib/milestones/milestones'
import {
  todayUTC,
  dateRange,
  makeReturnPK,
  makeReturnSK,
  computeStreaks,
  type ReturnItem,
} from '@/lib/returns/returns'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const STREAK_LOOKBACK_DAYS = 90

type UPracticeItem = { SK: string; status?: string }

export async function GET(req: Request) {
  return withAuth(req, async (user) => {
    const pk = `USER#${user.userId}`
    const mainClient = createDynamoClient()
    const returnsClient = createReturnsClient()

    const [profile, upractices, milestones] = await Promise.all([
      mainClient.getItem<ProfileData>({ PK: pk, SK: 'PROFILE' }),
      mainClient.query<UPracticeItem>({
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
        ExpressionAttributeValues: { ':pk': pk, ':prefix': 'UPRACTICE#' },
      }),
      mainClient.query<MilestoneItem>({
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

    // Compute streaks from return records for all active practices
    const activePracticeIds = profile?.activePracticeIds ?? []
    const today = todayUTC()
    const startDate = dateRange(STREAK_LOOKBACK_DAYS, today)[0]

    const allReturnRecords = await Promise.all(
      activePracticeIds.map((practiceId) =>
        returnsClient.query<ReturnItem>({
          KeyConditionExpression: 'PK = :pk AND SK BETWEEN :start AND :end',
          ExpressionAttributeValues: {
            ':pk': makeReturnPK(user.userId, practiceId),
            ':start': makeReturnSK(startDate),
            ':end': makeReturnSK(today),
          },
        })
      )
    )

    const activeDates = new Set<string>()
    for (const records of allReturnRecords) {
      for (const r of records) {
        if (r.didIt) activeDates.add(r.SK.replace('DATE#', ''))
      }
    }

    const { currentStreak, longestStreak } = computeStreaks(activeDates, today, STREAK_LOOKBACK_DAYS)

    return NextResponse.json({
      ok: true,
      totalReturns,
      practicesActivated,
      currentStreak,
      longestStreak,
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
