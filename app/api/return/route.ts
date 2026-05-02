import { NextResponse } from 'next/server'
import { createDynamoClient, createReturnsClient } from '@/utils/dynamoClient'
import { withAuth } from '@/utils/authServer'
import { practicesById } from '@/lib/practices/library'
import { isTrialActive, type TrialItem, type ProfileData } from '@/lib/practices/trial'
import {
  todayUTC,
  makeReturnPK,
  makeReturnSK,
  computeDelta,
  applyDelta,
  type ReturnItem,
} from '@/lib/returns/returns'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Body = {
  practiceId: string
  didIt: boolean
  date?: string
}

export async function POST(req: Request) {
  return withAuth(req, async (user) => {
    let body: Body
    try {
      body = (await req.json()) as Body
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const { practiceId, didIt, date } = body ?? {}
    if (!practiceId || typeof didIt !== 'boolean') {
      return NextResponse.json({ error: 'practiceId and didIt required' }, { status: 400 })
    }
    if (!practicesById.get(practiceId)) {
      return NextResponse.json({ error: 'PRACTICE_NOT_FOUND' }, { status: 404 })
    }

    const returnDate = date ?? todayUTC()
    if (!/^\d{4}-\d{2}-\d{2}$/.test(returnDate)) {
      return NextResponse.json({ error: 'Invalid date format, use YYYY-MM-DD' }, { status: 400 })
    }

    const pk = `USER#${user.userId}`
    const mainClient = createDynamoClient()
    const returnsClient = createReturnsClient()

    // Validate practice is active or active trial
    const [profile, trials] = await Promise.all([
      mainClient.getItem<ProfileData>({ PK: pk, SK: 'PROFILE' }),
      mainClient.query<TrialItem>({
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
        ExpressionAttributeValues: { ':pk': pk, ':prefix': 'TRIAL#' },
      }),
    ])

    const activePracticeIds = profile?.activePracticeIds ?? []
    const isActive = activePracticeIds.includes(practiceId)
    const hasActiveTrial = trials.some((t) => t.practiceId === practiceId && isTrialActive(t))

    if (!isActive && !hasActiveTrial) {
      return NextResponse.json({ error: 'PRACTICE_NOT_ACTIVE_OR_TRIAL' }, { status: 409 })
    }

    // Read existing return for idempotency
    const returnPK = makeReturnPK(user.userId, practiceId)
    const returnSK = makeReturnSK(returnDate)
    const existing = await returnsClient.getItem<ReturnItem>({ PK: returnPK, SK: returnSK })

    const delta = computeDelta(existing?.didIt, didIt)

    // No-op if value unchanged
    if (existing && delta === 0) {
      return NextResponse.json({ ok: true, noop: true, didIt, date: returnDate }, { status: 200 })
    }

    const now = new Date().toISOString()

    // Upsert return record
    await returnsClient.putItem({
      PK: returnPK,
      SK: returnSK,
      didIt,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    })

    // Update returnCounters in PROFILE if delta != 0
    if (delta !== 0) {
      const raw = profile?.returnCounters
      const counters: Record<string, number> =
        typeof raw === 'string'
          ? JSON.parse(raw || '{}')
          : (raw as Record<string, number> | undefined) ?? {}
      const updated = applyDelta(counters, practiceId, delta)
      await mainClient.updateItem({
        Key: { PK: pk, SK: 'PROFILE' },
        UpdateExpression: 'SET returnCounters = :counters',
        ExpressionAttributeValues: { ':counters': updated },
      })
    }

    return NextResponse.json({ ok: true, didIt, date: returnDate, delta }, { status: 200 })
  })
}
