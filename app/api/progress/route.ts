import { NextResponse } from 'next/server'
import { createDynamoClient, createReturnsClient } from '@/utils/dynamoClient'
import { withAuth } from '@/utils/authServer'
import type { ProfileData } from '@/lib/practices/trial'
import type { MilestoneItem } from '@/lib/milestones/milestones'
import {
  returnDayForUser,
  dateRange,
  makeReturnPK,
  makeReturnSK,
  computeStreaks,
  type ReturnItem,
} from '@/lib/returns/returns'
import {
  TOTAL_MILESTONES,
  PRACTICE_MILESTONES,
  makeMilestoneSK,
} from '@/lib/milestones/milestones'

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
    const today = returnDayForUser({
      timezone: profile?.timezone ?? 'UTC',
      resetMinutes: profile?.dayResetTime ?? 240,
    })
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

    // Compute next-up milestones
    const achievedSKs = new Set(milestones.map((m) => m.SK))

    type NextMilestone = {
      type: string; threshold: number; practiceId?: string
      title: string; description: string; progress: number; remaining: number
    }
    const nextMilestones: NextMilestone[] = []

    // Next total milestone
    for (const def of TOTAL_MILESTONES) {
      if (!achievedSKs.has(makeMilestoneSK('total', def.threshold))) {
        nextMilestones.push({
          type: 'total', threshold: def.threshold,
          title: def.title, description: def.description,
          progress: totalReturns, remaining: def.threshold - totalReturns,
        })
        break
      }
    }

    // Next practice milestone per active practice
    for (const practiceId of activePracticeIds) {
      const practiceCount = counters[practiceId] ?? 0
      for (const def of PRACTICE_MILESTONES) {
        if (!achievedSKs.has(makeMilestoneSK('practice', def.threshold, practiceId))) {
          nextMilestones.push({
            type: 'practice', threshold: def.threshold, practiceId,
            title: def.title, description: def.description,
            progress: practiceCount, remaining: def.threshold - practiceCount,
          })
          break
        }
      }
    }

    return NextResponse.json({
      ok: true,
      totalReturns,
      practicesActivated,
      currentStreak,
      longestStreak,
      nextMilestones,
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
