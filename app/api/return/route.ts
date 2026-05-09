import { NextResponse } from 'next/server'
import { createDynamoClient, createReturnsClient } from '@/utils/dynamoClient'
import { withAuth, rateLimitedResponse } from '@/utils/authServer'
import { checkRateLimit } from '@/utils/rateLimiter'
import { practicesById } from '@/lib/practices/library'
import { isTrialActive, type TrialItem, type ProfileData } from '@/lib/practices/trial'
import {
  returnDayForUser,
  makeReturnPK,
  makeReturnSK,
  computeDelta,
  applyDelta,
  type ReturnItem,
} from '@/lib/returns/returns'
import {
  checkNewMilestones,
  getMilestoneDef,
  makeMilestoneSK,
  type NewMilestone,
} from '@/lib/milestones/milestones'
import { trackEvent } from '@/utils/metricsClient'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Body = {
  practiceId: string
  didIt: boolean
  date?: string
}

export async function POST(req: Request) {
  return withAuth(req, async (user) => {
    if (!checkRateLimit(`return:${user.userId}`, 10)) return rateLimitedResponse()

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
    if (date !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
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

    const returnDate = date ?? returnDayForUser({
      timezone: profile?.timezone ?? 'UTC',
      resetMinutes: profile?.dayResetTime ?? 240,
    })

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
      return NextResponse.json({ ok: true, noop: true, didIt, date: returnDate, newMilestones: [] }, { status: 200 })
    }

    // Track new didIt=true returns (net new check-ins only)
    if (didIt === true && delta > 0) {
      trackEvent('totalReturns', 'returns')
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

    let newMilestones: NewMilestone[] = []

    // Update returnCounters and check milestones if delta != 0
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

      // Check and persist milestones triggered by this check-in
      if (delta > 0) {
        const crossed = checkNewMilestones(updated, practiceId, delta)
        const results = await Promise.all(
          crossed.map(async (hit) => {
            const def = getMilestoneDef(hit.type, hit.threshold)
            if (!def) return null
            const sk = makeMilestoneSK(hit.type, hit.threshold, hit.practiceId)
            const item = {
              PK: pk,
              SK: sk,
              type: hit.type,
              ...(hit.practiceId ? { practiceId: hit.practiceId } : {}),
              threshold: hit.threshold,
              title: def.title,
              description: def.description,
              achievedAt: now,
            }
            const isNew = await mainClient.putItemIfNotExists(item)
            if (!isNew) return null
            const m: NewMilestone = { type: def.type, threshold: def.threshold, title: def.title, description: def.description }
            if (hit.practiceId) m.practiceId = hit.practiceId
            return m
          })
        )
        newMilestones = results.filter((m): m is NewMilestone => m !== null)
      }
    }

    return NextResponse.json({ ok: true, didIt, date: returnDate, delta, newMilestones }, { status: 200 })
  })
}
