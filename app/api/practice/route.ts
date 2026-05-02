import { NextResponse } from 'next/server'
import { createDynamoClient } from '@/utils/dynamoClient'
import { withAuth } from '@/utils/authServer'
import { practicesById } from '@/lib/practices/library'
import {
  TRIAL_DURATION_DAYS,
  MAX_CONCURRENT_TRIALS,
  isTrialActive,
  isTrialExpired,
  checkActiveCap,
  makeTrialSK,
  makeUPracticeSK,
  type TrialItem,
  type ProfileData,
} from '@/lib/practices/trial'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Body = {
  mode: 'startTrial' | 'promoteTrial' | 'discardTrial'
  practiceId: string
}

export async function POST(req: Request) {
  return withAuth(req, async (user) => {
    let body: Body
    try {
      body = (await req.json()) as Body
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const { mode, practiceId } = body ?? {}
    if (!mode || !practiceId) {
      return NextResponse.json({ error: 'mode and practiceId required' }, { status: 400 })
    }

    const pk = `USER#${user.userId}`
    const client = createDynamoClient()

    // ── startTrial ──────────────────────────────────────────────────────────
    if (mode === 'startTrial') {
      const practice = practicesById.get(practiceId)
      if (!practice) {
        return NextResponse.json({ error: 'PRACTICE_NOT_FOUND' }, { status: 404 })
      }

      const [profile, trials] = await Promise.all([
        client.getItem<ProfileData>({ PK: pk, SK: 'PROFILE' }),
        client.query<TrialItem>({
          KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
          ExpressionAttributeValues: { ':pk': pk, ':prefix': 'TRIAL#' },
        }),
      ])

      const activePracticeIds = profile?.activePracticeIds ?? []

      if (activePracticeIds.includes(practiceId)) {
        return NextResponse.json({ error: 'ALREADY_ACTIVE' }, { status: 409 })
      }

      if (trials.find((t) => t.practiceId === practiceId && isTrialActive(t))) {
        return NextResponse.json({ error: 'ALREADY_TRIALING' }, { status: 409 })
      }

      const activeTrials = trials.filter(isTrialActive)
      if (activeTrials.length >= MAX_CONCURRENT_TRIALS) {
        return NextResponse.json(
          { error: 'TRIAL_LIMIT_REACHED', max: MAX_CONCURRENT_TRIALS },
          { status: 409 }
        )
      }

      const startedAt = new Date().toISOString()
      const expiresAt = new Date(
        Date.now() + TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000
      ).toISOString()

      const trial: TrialItem = {
        PK: pk,
        SK: makeTrialSK(startedAt, practiceId),
        practiceId,
        pillar: practice.pillar,
        startedAt,
        status: 'trial',
        expiresAt,
      }

      await client.putItem(trial)
      return NextResponse.json({ trial }, { status: 201 })
    }

    // ── promoteTrial ────────────────────────────────────────────────────────
    if (mode === 'promoteTrial') {
      const practice = practicesById.get(practiceId)
      if (!practice) {
        return NextResponse.json({ error: 'PRACTICE_NOT_FOUND' }, { status: 404 })
      }

      const [profile, trials] = await Promise.all([
        client.getItem<ProfileData>({ PK: pk, SK: 'PROFILE' }),
        client.query<TrialItem>({
          KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
          ExpressionAttributeValues: { ':pk': pk, ':prefix': 'TRIAL#' },
        }),
      ])

      const activeTrial = trials.find(
        (t) => t.practiceId === practiceId && t.status === 'trial'
      )
      if (!activeTrial) {
        return NextResponse.json({ error: 'TRIAL_NOT_FOUND' }, { status: 404 })
      }
      if (isTrialExpired(activeTrial)) {
        return NextResponse.json({ error: 'TRIAL_EXPIRED' }, { status: 409 })
      }

      const activePracticeIds = profile?.activePracticeIds ?? []
      const activePracticeSkById = profile?.activePracticeSkById ?? {}
      const capCheck = checkActiveCap(profile?.subscriptionStatus, activePracticeIds.length)
      if (!capCheck.allowed) {
        return NextResponse.json(
          { error: capCheck.reason, cap: capCheck.cap },
          { status: 409 }
        )
      }

      const addedAt = new Date().toISOString()
      const upracticeSK = makeUPracticeSK(practiceId)
      const resolvedAt = addedAt

      await Promise.all([
        client.putItem({ PK: pk, SK: upracticeSK, practiceId, pillar: practice.pillar, addedAt }),
        client.updateItem({
          Key: { PK: pk, SK: 'PROFILE' },
          UpdateExpression: 'SET activePracticeIds = :ids, activePracticeSkById = :skById',
          ExpressionAttributeValues: {
            ':ids': [...activePracticeIds, practiceId],
            ':skById': { ...activePracticeSkById, [practiceId]: upracticeSK },
          },
        }),
        client.updateItem({
          Key: { PK: pk, SK: activeTrial.SK },
          UpdateExpression: 'SET #s = :status, resolvedAt = :resolvedAt',
          ExpressionAttributeNames: { '#s': 'status' },
          ExpressionAttributeValues: { ':status': 'promoted', ':resolvedAt': resolvedAt },
        }),
      ])

      return NextResponse.json(
        {
          practiceId,
          warning: capCheck.allowed && capCheck.warning ? capCheck.warning : undefined,
          remaining: capCheck.allowed ? capCheck.remaining : undefined,
        },
        { status: 200 }
      )
    }

    // ── discardTrial ────────────────────────────────────────────────────────
    if (mode === 'discardTrial') {
      const trials = await client.query<TrialItem>({
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
        ExpressionAttributeValues: { ':pk': pk, ':prefix': 'TRIAL#' },
      })

      const activeTrial = trials.find(
        (t) => t.practiceId === practiceId && t.status === 'trial'
      )
      if (!activeTrial) {
        return NextResponse.json({ error: 'TRIAL_NOT_FOUND' }, { status: 404 })
      }

      await client.updateItem({
        Key: { PK: pk, SK: activeTrial.SK },
        UpdateExpression: 'SET #s = :status, resolvedAt = :resolvedAt',
        ExpressionAttributeNames: { '#s': 'status' },
        ExpressionAttributeValues: {
          ':status': 'discarded',
          ':resolvedAt': new Date().toISOString(),
        },
      })

      return NextResponse.json({ ok: true }, { status: 200 })
    }

    return NextResponse.json({ error: 'Unknown mode' }, { status: 400 })
  })
}
