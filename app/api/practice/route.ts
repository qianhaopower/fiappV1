import crypto from 'crypto'
import { NextResponse } from 'next/server'
import { createDynamoClient } from '@/utils/dynamoClient'
import { withAuth } from '@/utils/authServer'
import { trackEvent } from '@/utils/metricsClient'
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

// ── Replace confirm tokens (in-memory, 5-min TTL) ───────────────────────────
type ConfirmEntry = {
  userId: string
  replacePracticeId: string
  practiceId: string
  exp: number
}
const pendingReplaces = new Map<string, ConfirmEntry>()

function newConfirmToken(entry: Omit<ConfirmEntry, 'exp'>): string {
  const token = crypto.randomUUID()
  pendingReplaces.set(token, { ...entry, exp: Date.now() + 5 * 60 * 1000 })
  return token
}

function consumeConfirmToken(
  token: string,
  userId: string,
  replacePracticeId: string,
  practiceId: string
): boolean {
  const entry = pendingReplaces.get(token)
  if (!entry) return false
  if (entry.exp < Date.now()) {
    pendingReplaces.delete(token)
    return false
  }
  if (
    entry.userId !== userId ||
    entry.replacePracticeId !== replacePracticeId ||
    entry.practiceId !== practiceId
  )
    return false
  pendingReplaces.delete(token)
  return true
}

// ────────────────────────────────────────────────────────────────────────────

type UPracticeItem = {
  PK: string
  SK: string
  practiceId: string
  pillar: string
  addedAt: string
  status?: 'active' | 'paused'
  pausedAt?: string
  resumedAt?: string
}

type Body = {
  mode: string
  practiceId: string
  replacePracticeId?: string
  confirmToken?: string
}

export async function POST(req: Request) {
  return withAuth(req, async (user) => {
    let body: Body
    try {
      body = (await req.json()) as Body
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const { mode, practiceId, replacePracticeId, confirmToken } = body ?? {}
    if (!mode || !practiceId) {
      return NextResponse.json({ error: 'mode and practiceId required' }, { status: 400 })
    }

    const pk = `USER#${user.userId}`
    const client = createDynamoClient()

    // ── startTrial ──────────────────────────────────────────────────────────
    if (mode === 'startTrial') {
      const practice = practicesById.get(practiceId)
      if (!practice) return NextResponse.json({ error: 'PRACTICE_NOT_FOUND' }, { status: 404 })

      const [profile, trials] = await Promise.all([
        client.getItem<ProfileData>({ PK: pk, SK: 'PROFILE' }),
        client.query<TrialItem>({
          KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
          ExpressionAttributeValues: { ':pk': pk, ':prefix': 'TRIAL#' },
        }),
      ])

      const activePracticeIds = profile?.activePracticeIds ?? []
      if (activePracticeIds.includes(practiceId))
        return NextResponse.json({ error: 'ALREADY_ACTIVE' }, { status: 409 })
      if (trials.find((t) => t.practiceId === practiceId && isTrialActive(t)))
        return NextResponse.json({ error: 'ALREADY_TRIALING' }, { status: 409 })
      if (trials.filter(isTrialActive).length >= MAX_CONCURRENT_TRIALS)
        return NextResponse.json({ error: 'TRIAL_LIMIT_REACHED', max: MAX_CONCURRENT_TRIALS }, { status: 409 })

      const startedAt = new Date().toISOString()
      const expiresAt = new Date(Date.now() + TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000).toISOString()
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
      trackEvent('totalTrials', 'trials')
      return NextResponse.json({ trial }, { status: 201 })
    }

    // ── promoteTrial ────────────────────────────────────────────────────────
    if (mode === 'promoteTrial') {
      const practice = practicesById.get(practiceId)
      if (!practice) return NextResponse.json({ error: 'PRACTICE_NOT_FOUND' }, { status: 404 })

      const [profile, trials] = await Promise.all([
        client.getItem<ProfileData>({ PK: pk, SK: 'PROFILE' }),
        client.query<TrialItem>({
          KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
          ExpressionAttributeValues: { ':pk': pk, ':prefix': 'TRIAL#' },
        }),
      ])

      const activeTrial = trials.find((t) => t.practiceId === practiceId && t.status === 'trial')
      if (!activeTrial) return NextResponse.json({ error: 'TRIAL_NOT_FOUND' }, { status: 404 })
      if (isTrialExpired(activeTrial)) return NextResponse.json({ error: 'TRIAL_EXPIRED' }, { status: 409 })

      const activePracticeIds = profile?.activePracticeIds ?? []
      const activePracticeSkById = profile?.activePracticeSkById ?? {}
      const capCheck = checkActiveCap(profile?.subscriptionStatus, activePracticeIds.length)
      if (!capCheck.allowed)
        return NextResponse.json({ error: capCheck.reason, cap: capCheck.cap }, { status: 409 })

      const addedAt = new Date().toISOString()
      const upracticeSK = makeUPracticeSK(practiceId)
      await Promise.all([
        client.putItem({ PK: pk, SK: upracticeSK, practiceId, pillar: practice.pillar, addedAt, status: 'active' }),
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
          ExpressionAttributeValues: { ':status': 'promoted', ':resolvedAt': addedAt },
        }),
      ])
      return NextResponse.json(
        { practiceId, warning: capCheck.allowed && capCheck.warning ? capCheck.warning : undefined },
        { status: 200 }
      )
    }

    // ── discardTrial ────────────────────────────────────────────────────────
    if (mode === 'discardTrial') {
      const trials = await client.query<TrialItem>({
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
        ExpressionAttributeValues: { ':pk': pk, ':prefix': 'TRIAL#' },
      })
      const activeTrial = trials.find((t) => t.practiceId === practiceId && t.status === 'trial')
      if (!activeTrial) return NextResponse.json({ error: 'TRIAL_NOT_FOUND' }, { status: 404 })

      await client.updateItem({
        Key: { PK: pk, SK: activeTrial.SK },
        UpdateExpression: 'SET #s = :status, resolvedAt = :resolvedAt',
        ExpressionAttributeNames: { '#s': 'status' },
        ExpressionAttributeValues: { ':status': 'discarded', ':resolvedAt': new Date().toISOString() },
      })
      return NextResponse.json({ ok: true }, { status: 200 })
    }

    // ── add ─────────────────────────────────────────────────────────────────
    if (mode === 'add') {
      const practice = practicesById.get(practiceId)
      if (!practice) return NextResponse.json({ error: 'PRACTICE_NOT_FOUND' }, { status: 404 })

      const profile = await client.getItem<ProfileData>({ PK: pk, SK: 'PROFILE' })
      const activePracticeIds = profile?.activePracticeIds ?? []
      const activePracticeSkById = profile?.activePracticeSkById ?? {}

      if (activePracticeIds.includes(practiceId))
        return NextResponse.json({ error: 'ALREADY_ACTIVE' }, { status: 409 })

      const capCheck = checkActiveCap(profile?.subscriptionStatus, activePracticeIds.length)
      if (!capCheck.allowed)
        return NextResponse.json({ error: capCheck.reason, cap: capCheck.cap }, { status: 409 })

      const addedAt = new Date().toISOString()
      const upracticeSK = makeUPracticeSK(practiceId)
      await Promise.all([
        client.putItem({ PK: pk, SK: upracticeSK, practiceId, pillar: practice.pillar, addedAt, status: 'active' }),
        client.updateItem({
          Key: { PK: pk, SK: 'PROFILE' },
          UpdateExpression: 'SET activePracticeIds = :ids, activePracticeSkById = :skById',
          ExpressionAttributeValues: {
            ':ids': [...activePracticeIds, practiceId],
            ':skById': { ...activePracticeSkById, [practiceId]: upracticeSK },
          },
        }),
      ])
      trackEvent('totalPromotions')
      return NextResponse.json(
        { practiceId, warning: capCheck.allowed && capCheck.warning ? capCheck.warning : undefined },
        { status: 201 }
      )
    }

    // ── replace ─────────────────────────────────────────────────────────────
    if (mode === 'replace') {
      if (!replacePracticeId)
        return NextResponse.json({ error: 'replacePracticeId required' }, { status: 400 })

      const newPractice = practicesById.get(practiceId)
      if (!newPractice) return NextResponse.json({ error: 'PRACTICE_NOT_FOUND' }, { status: 404 })

      // First call — return confirm token
      if (!confirmToken) {
        const token = newConfirmToken({ userId: user.userId, replacePracticeId, practiceId })
        return NextResponse.json(
          { confirmRequired: true, confirmToken: token, replacePracticeId, practiceId },
          { status: 202 }
        )
      }

      // Second call — validate token and execute
      if (!consumeConfirmToken(confirmToken, user.userId, replacePracticeId, practiceId))
        return NextResponse.json({ error: 'INVALID_CONFIRM_TOKEN' }, { status: 409 })

      const profile = await client.getItem<ProfileData>({ PK: pk, SK: 'PROFILE' })
      const activePracticeIds = profile?.activePracticeIds ?? []
      const activePracticeSkById = profile?.activePracticeSkById ?? {}

      if (!activePracticeIds.includes(replacePracticeId))
        return NextResponse.json({ error: 'PRACTICE_NOT_ACTIVE' }, { status: 409 })
      if (activePracticeIds.includes(practiceId))
        return NextResponse.json({ error: 'ALREADY_ACTIVE' }, { status: 409 })

      const addedAt = new Date().toISOString()
      const newSK = makeUPracticeSK(practiceId)
      const newIds = activePracticeIds.filter((id) => id !== replacePracticeId).concat(practiceId)
      const newSkById = { ...activePracticeSkById }
      delete newSkById[replacePracticeId]
      newSkById[practiceId] = newSK

      await Promise.all([
        client.putItem({ PK: pk, SK: newSK, practiceId, pillar: newPractice.pillar, addedAt, status: 'active' }),
        client.updateItem({
          Key: { PK: pk, SK: makeUPracticeSK(replacePracticeId) },
          UpdateExpression: 'SET #s = :status, endedAt = :endedAt',
          ExpressionAttributeNames: { '#s': 'status' },
          ExpressionAttributeValues: { ':status': 'replaced', ':endedAt': addedAt },
        }),
        client.updateItem({
          Key: { PK: pk, SK: 'PROFILE' },
          UpdateExpression: 'SET activePracticeIds = :ids, activePracticeSkById = :skById',
          ExpressionAttributeValues: { ':ids': newIds, ':skById': newSkById },
        }),
      ])
      return NextResponse.json({ ok: true, practiceId, replaced: replacePracticeId }, { status: 200 })
    }

    // ── pause ────────────────────────────────────────────────────────────────
    if (mode === 'pause') {
      const upractice = await client.getItem<UPracticeItem>({ PK: pk, SK: makeUPracticeSK(practiceId) })
      if (!upractice || (upractice.status && upractice.status !== 'active'))
        return NextResponse.json({ error: 'PRACTICE_NOT_ACTIVE' }, { status: 404 })

      const profile = await client.getItem<ProfileData>({ PK: pk, SK: 'PROFILE' })
      const activePracticeIds = profile?.activePracticeIds ?? []
      const newIds = activePracticeIds.filter((id) => id !== practiceId)

      await Promise.all([
        client.updateItem({
          Key: { PK: pk, SK: makeUPracticeSK(practiceId) },
          UpdateExpression: 'SET #s = :status, pausedAt = :pausedAt',
          ExpressionAttributeNames: { '#s': 'status' },
          ExpressionAttributeValues: { ':status': 'paused', ':pausedAt': new Date().toISOString() },
        }),
        client.updateItem({
          Key: { PK: pk, SK: 'PROFILE' },
          UpdateExpression: 'SET activePracticeIds = :ids',
          ExpressionAttributeValues: { ':ids': newIds },
        }),
      ])
      return NextResponse.json({ ok: true }, { status: 200 })
    }

    // ── resume ───────────────────────────────────────────────────────────────
    if (mode === 'resume') {
      const [upractice, profile] = await Promise.all([
        client.getItem<UPracticeItem>({ PK: pk, SK: makeUPracticeSK(practiceId) }),
        client.getItem<ProfileData>({ PK: pk, SK: 'PROFILE' }),
      ])

      if (!upractice || upractice.status !== 'paused')
        return NextResponse.json({ error: 'PRACTICE_NOT_PAUSED' }, { status: 404 })

      const activePracticeIds = profile?.activePracticeIds ?? []
      const capCheck = checkActiveCap(profile?.subscriptionStatus, activePracticeIds.length)
      if (!capCheck.allowed)
        return NextResponse.json({ error: capCheck.reason, cap: capCheck.cap }, { status: 409 })

      await Promise.all([
        client.updateItem({
          Key: { PK: pk, SK: makeUPracticeSK(practiceId) },
          UpdateExpression: 'SET #s = :status, resumedAt = :resumedAt',
          ExpressionAttributeNames: { '#s': 'status' },
          ExpressionAttributeValues: { ':status': 'active', ':resumedAt': new Date().toISOString() },
        }),
        client.updateItem({
          Key: { PK: pk, SK: 'PROFILE' },
          UpdateExpression: 'SET activePracticeIds = :ids',
          ExpressionAttributeValues: { ':ids': [...activePracticeIds, practiceId] },
        }),
      ])
      return NextResponse.json(
        { ok: true, warning: capCheck.allowed && capCheck.warning ? capCheck.warning : undefined },
        { status: 200 }
      )
    }

    // ── setFocus ─────────────────────────────────────────────────────────────
    if (mode === 'setFocus') {
      const practice = practicesById.get(practiceId)
      if (!practice) return NextResponse.json({ error: 'PRACTICE_NOT_FOUND' }, { status: 404 })

      const [profile, trials] = await Promise.all([
        client.getItem<ProfileData>({ PK: pk, SK: 'PROFILE' }),
        client.query<TrialItem>({
          KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
          ExpressionAttributeValues: { ':pk': pk, ':prefix': 'TRIAL#' },
        }),
      ])

      const activePracticeIds = profile?.activePracticeIds ?? []
      const isActive = activePracticeIds.includes(practiceId)
      const hasActiveTrial = trials.some((t) => t.practiceId === practiceId && isTrialActive(t))

      if (!isActive && !hasActiveTrial)
        return NextResponse.json({ error: 'PRACTICE_NOT_ACTIVE_OR_TRIAL' }, { status: 409 })

      await client.updateItem({
        Key: { PK: pk, SK: 'PROFILE' },
        UpdateExpression: 'SET todayFocusPracticeId = :id, updatedAt = :updatedAt',
        ExpressionAttributeValues: {
          ':id': practiceId,
          ':updatedAt': new Date().toISOString(),
        },
      })
      return NextResponse.json({ ok: true, todayFocusPracticeId: practiceId }, { status: 200 })
    }

    return NextResponse.json({ error: 'Unknown mode' }, { status: 400 })
  })
}
