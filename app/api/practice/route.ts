import { NextResponse } from 'next/server'
import { createDynamoClient } from '@/utils/dynamoClient'
import { withAuth, rateLimitedResponse } from '@/utils/authServer'
import { checkRateLimit } from '@/utils/rateLimiter'
import { trackEvent } from '@/utils/metricsClient'
import { practicesById } from '@/lib/practices/library'
import {
  checkActiveCap,
  makeUPracticeSK,
  type ProfileData,
} from '@/lib/practices/trial'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type UPracticeStatus = 'active' | 'inactive' | 'paused' | 'replaced'

type UPracticeItem = {
  PK: string
  SK: string
  practiceId: string
  pillar: string
  status?: UPracticeStatus
  firstStartedAt?: string
  lastActivatedAt?: string
  lastInactivatedAt?: string
  addedAt?: string
}

type Body = {
  mode?: string
  practiceId?: string
  deactivatePracticeId?: string
}

type Client = ReturnType<typeof createDynamoClient>

export async function POST(req: Request) {
  return withAuth(req, async (user) => {
    if (!checkRateLimit(`practice:${user.userId}`, 20)) return rateLimitedResponse()

    let body: Body
    try {
      body = (await req.json()) as Body
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const { mode, practiceId, deactivatePracticeId } = body ?? {}
    if (!mode || !practiceId) {
      return NextResponse.json({ error: 'mode and practiceId required' }, { status: 400 })
    }

    const pk = `USER#${user.userId}`
    const client = createDynamoClient()

    // startPractice and reactivatePractice share a handler — same semantics, two names.
    if (mode === 'startPractice' || mode === 'reactivatePractice') {
      return handleStartOrReactivate({ pk, client, practiceId })
    }

    if (mode === 'makePracticeInactive') {
      return handleMakeInactive({ pk, client, practiceId })
    }

    if (mode === 'switchToPractice') {
      if (!deactivatePracticeId) {
        return NextResponse.json({ error: 'deactivatePracticeId required' }, { status: 400 })
      }
      return handleSwitch({ pk, client, practiceId, deactivatePracticeId })
    }

    return NextResponse.json({ error: 'Unknown mode' }, { status: 400 })
  })
}

async function handleStartOrReactivate(args: {
  pk: string
  client: Client
  practiceId: string
}): Promise<NextResponse> {
  const { pk, client, practiceId } = args

  const practice = practicesById.get(practiceId)
  if (!practice) {
    return NextResponse.json({ error: 'PRACTICE_NOT_FOUND' }, { status: 404 })
  }

  const sk = makeUPracticeSK(practiceId)
  const [profile, existing] = await Promise.all([
    client.getItem<ProfileData>({ PK: pk, SK: 'PROFILE' }),
    client.getItem<UPracticeItem>({ PK: pk, SK: sk }),
  ])

  // Already active — idempotent no-op (200 instead of 409)
  if (existing?.status === 'active') {
    return NextResponse.json(
      { practiceId, status: 'active', alreadyActive: true },
      { status: 200 },
    )
  }

  const activePracticeIds = profile?.activePracticeIds ?? []
  const activePracticeSkById = profile?.activePracticeSkById ?? {}

  const capCheck = checkActiveCap(profile?.subscriptionStatus, activePracticeIds.length)
  if (!capCheck.allowed) {
    return NextResponse.json({ error: capCheck.reason, cap: capCheck.cap }, { status: 409 })
  }

  const now = new Date().toISOString()
  const newIds = [...activePracticeIds, practiceId]
  const newSkById = { ...activePracticeSkById, [practiceId]: sk }

  if (!existing) {
    await Promise.all([
      client.putItem({
        PK: pk,
        SK: sk,
        practiceId,
        pillar: practice.pillar,
        status: 'active',
        firstStartedAt: now,
        lastActivatedAt: now,
        addedAt: now,
      }),
      client.updateItem({
        Key: { PK: pk, SK: 'PROFILE' },
        UpdateExpression: 'SET activePracticeIds = :ids, activePracticeSkById = :skById',
        ExpressionAttributeValues: { ':ids': newIds, ':skById': newSkById },
      }),
    ])
    trackEvent('totalPromotions')
    return NextResponse.json({ practiceId, status: 'active' }, { status: 201 })
  }

  // existing.status is "inactive" or a legacy non-active value ("paused" / "replaced")
  // — all are treated as "bring this back."
  await Promise.all([
    client.updateItem({
      Key: { PK: pk, SK: sk },
      UpdateExpression: 'SET #s = :status, lastActivatedAt = :now',
      ExpressionAttributeNames: { '#s': 'status' },
      ExpressionAttributeValues: { ':status': 'active', ':now': now },
    }),
    client.updateItem({
      Key: { PK: pk, SK: 'PROFILE' },
      UpdateExpression: 'SET activePracticeIds = :ids, activePracticeSkById = :skById',
      ExpressionAttributeValues: { ':ids': newIds, ':skById': newSkById },
    }),
  ])
  return NextResponse.json({ practiceId, status: 'active', reactivated: true }, { status: 200 })
}

async function handleMakeInactive(args: {
  pk: string
  client: Client
  practiceId: string
}): Promise<NextResponse> {
  const { pk, client, practiceId } = args

  const sk = makeUPracticeSK(practiceId)
  const [profile, existing] = await Promise.all([
    client.getItem<ProfileData>({ PK: pk, SK: 'PROFILE' }),
    client.getItem<UPracticeItem>({ PK: pk, SK: sk }),
  ])

  if (!existing || existing.status !== 'active') {
    return NextResponse.json({ error: 'PRACTICE_NOT_ACTIVE' }, { status: 409 })
  }

  const activePracticeIds = (profile?.activePracticeIds ?? []).filter((id) => id !== practiceId)
  const activePracticeSkById = { ...(profile?.activePracticeSkById ?? {}) }
  delete activePracticeSkById[practiceId]

  const now = new Date().toISOString()
  await Promise.all([
    client.updateItem({
      Key: { PK: pk, SK: sk },
      UpdateExpression: 'SET #s = :status, lastInactivatedAt = :now',
      ExpressionAttributeNames: { '#s': 'status' },
      ExpressionAttributeValues: { ':status': 'inactive', ':now': now },
    }),
    client.updateItem({
      Key: { PK: pk, SK: 'PROFILE' },
      UpdateExpression: 'SET activePracticeIds = :ids, activePracticeSkById = :skById',
      ExpressionAttributeValues: { ':ids': activePracticeIds, ':skById': activePracticeSkById },
    }),
  ])

  return NextResponse.json({ ok: true, practiceId, status: 'inactive' }, { status: 200 })
}

async function handleSwitch(args: {
  pk: string
  client: Client
  practiceId: string
  deactivatePracticeId: string
}): Promise<NextResponse> {
  const { pk, client, practiceId, deactivatePracticeId } = args

  if (practiceId === deactivatePracticeId) {
    return NextResponse.json({ error: 'SAME_PRACTICE' }, { status: 400 })
  }

  const practice = practicesById.get(practiceId)
  if (!practice) {
    return NextResponse.json({ error: 'PRACTICE_NOT_FOUND' }, { status: 404 })
  }

  const oldSk = makeUPracticeSK(deactivatePracticeId)
  const newSk = makeUPracticeSK(practiceId)
  const [profile, oldExisting, newExisting] = await Promise.all([
    client.getItem<ProfileData>({ PK: pk, SK: 'PROFILE' }),
    client.getItem<UPracticeItem>({ PK: pk, SK: oldSk }),
    client.getItem<UPracticeItem>({ PK: pk, SK: newSk }),
  ])

  if (!oldExisting || oldExisting.status !== 'active') {
    return NextResponse.json({ error: 'DEACTIVATE_PRACTICE_NOT_ACTIVE' }, { status: 409 })
  }
  if (newExisting?.status === 'active') {
    return NextResponse.json({ error: 'PRACTICE_ALREADY_ACTIVE' }, { status: 409 })
  }

  const activePracticeIds = (profile?.activePracticeIds ?? [])
    .filter((id) => id !== deactivatePracticeId)
    .concat(practiceId)
  const activePracticeSkById = { ...(profile?.activePracticeSkById ?? {}) }
  delete activePracticeSkById[deactivatePracticeId]
  activePracticeSkById[practiceId] = newSk

  const now = new Date().toISOString()

  // Sequential — deactivate old first, then activate new. If the second step fails,
  // the client can retry safely: the old is already inactive (so retry just creates/reactivates the new).
  await client.updateItem({
    Key: { PK: pk, SK: oldSk },
    UpdateExpression: 'SET #s = :status, lastInactivatedAt = :now',
    ExpressionAttributeNames: { '#s': 'status' },
    ExpressionAttributeValues: { ':status': 'inactive', ':now': now },
  })

  if (!newExisting) {
    await client.putItem({
      PK: pk,
      SK: newSk,
      practiceId,
      pillar: practice.pillar,
      status: 'active',
      firstStartedAt: now,
      lastActivatedAt: now,
      addedAt: now,
    })
  } else {
    await client.updateItem({
      Key: { PK: pk, SK: newSk },
      UpdateExpression: 'SET #s = :status, lastActivatedAt = :now',
      ExpressionAttributeNames: { '#s': 'status' },
      ExpressionAttributeValues: { ':status': 'active', ':now': now },
    })
  }

  await client.updateItem({
    Key: { PK: pk, SK: 'PROFILE' },
    UpdateExpression: 'SET activePracticeIds = :ids, activePracticeSkById = :skById',
    ExpressionAttributeValues: { ':ids': activePracticeIds, ':skById': activePracticeSkById },
  })

  return NextResponse.json(
    { ok: true, practiceId, deactivated: deactivatePracticeId },
    { status: 200 },
  )
}
