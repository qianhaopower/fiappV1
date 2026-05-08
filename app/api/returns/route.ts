import { NextResponse } from 'next/server'
import { createDynamoClient, createReturnsClient } from '@/utils/dynamoClient'
import { withAuth } from '@/utils/authServer'
import { practicesById } from '@/lib/practices/library'
import type { ProfileData } from '@/lib/practices/trial'
import {
  RETURNS_DEFAULT_DAYS,
  RETURNS_MIN_DAYS,
  RETURNS_MAX_DAYS,
  returnDayForUser,
  dateRange,
  makeReturnPK,
  makeReturnSK,
  type ReturnItem,
  type DotEntry,
} from '@/lib/returns/returns'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  return withAuth(req, async (user) => {
    const url = new URL(req.url)
    const practiceId = url.searchParams.get('practiceId')
    const daysParam = parseInt(url.searchParams.get('days') ?? String(RETURNS_DEFAULT_DAYS), 10)

    if (!practiceId) {
      return NextResponse.json({ error: 'practiceId required' }, { status: 400 })
    }
    if (!practicesById.get(practiceId)) {
      return NextResponse.json({ error: 'PRACTICE_NOT_FOUND' }, { status: 404 })
    }
    const days = Math.min(RETURNS_MAX_DAYS, Math.max(RETURNS_MIN_DAYS, isNaN(daysParam) ? RETURNS_DEFAULT_DAYS : daysParam))

    const pk = `USER#${user.userId}`
    const mainClient = createDynamoClient()
    const profile = await mainClient.getItem<ProfileData>({ PK: pk, SK: 'PROFILE' })

    const currentReturnDate = returnDayForUser({
      timezone: profile?.timezone ?? 'UTC',
      resetMinutes: profile?.dayResetTime ?? 240,
    })

    const dates = dateRange(days, currentReturnDate)
    const startDate = dates[0]
    const endDate = dates[dates.length - 1]

    const client = createReturnsClient()
    const items = await client.query<ReturnItem>({
      KeyConditionExpression: 'PK = :pk AND SK BETWEEN :start AND :end',
      ExpressionAttributeValues: {
        ':pk': makeReturnPK(user.userId, practiceId),
        ':start': makeReturnSK(startDate),
        ':end': makeReturnSK(endDate),
      },
    })

    const byDate = new Map(items.map((r) => [r.SK.replace('DATE#', ''), r.didIt]))

    const returns: DotEntry[] = dates.map((date) => ({
      date,
      didIt: byDate.has(date) ? (byDate.get(date) ?? null) : null,
    }))

    const total = items.filter((r) => r.didIt).length

    return NextResponse.json({ returns, total, days, currentReturnDate }, { status: 200 })
  })
}
