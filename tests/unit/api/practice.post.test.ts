import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '@/app/api/practice/route'

const getItemMock = vi.fn()
const putItemMock = vi.fn()
const updateItemMock = vi.fn()

vi.mock('@/utils/dynamoClient', () => ({
  createDynamoClient: () => ({
    getItem: getItemMock,
    putItem: putItemMock,
    updateItem: updateItemMock,
  }),
}))

vi.mock('@/utils/metricsClient', () => ({
  trackEvent: vi.fn(),
  trackPillarFocus: vi.fn(),
}))

const getCurrentUserMock = vi.fn()
vi.mock('aws-amplify/auth/server', () => ({
  getCurrentUser: () => getCurrentUserMock(),
}))
vi.mock('@/utils/amplifyServerUtils', () => ({
  runWithAmplifyServerContext: ({
    operation,
  }: {
    operation: (ctx: unknown) => Promise<unknown>
  }) => operation({}),
}))

function makeReq(body: object) {
  return new Request('http://localhost/api/practice', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function mockStore(
  profile: Record<string, unknown> | null,
  uprBySK: Record<string, Record<string, unknown> | null> = {},
) {
  getItemMock.mockImplementation(async ({ SK }: { SK: string }) => {
    if (SK === 'PROFILE') return profile
    if (SK.startsWith('UPRACTICE#')) return uprBySK[SK] ?? null
    return null
  })
}

beforeEach(() => {
  getCurrentUserMock.mockResolvedValue({ userId: 'u1', username: 'user' })
  getItemMock.mockReset()
  putItemMock.mockReset()
  updateItemMock.mockReset()
})

// ── startPractice (and reactivatePractice alias) ─────────────────────────────

describe('POST /api/practice — startPractice', () => {
  it('creates a new UPRACTICE and returns 201', async () => {
    mockStore({ activePracticeIds: [], subscriptionStatus: 'FREE' })
    const res = await POST(makeReq({ mode: 'startPractice', practiceId: 'sleep-consistent-bedtime' }))
    expect(res.status).toBe(201)
    const json = await res.json()
    expect(json.practiceId).toBe('sleep-consistent-bedtime')
    expect(json.status).toBe('active')

    const putArgs = putItemMock.mock.calls[0][0]
    expect(putArgs.SK).toBe('UPRACTICE#sleep-consistent-bedtime')
    expect(putArgs.status).toBe('active')
    expect(putArgs.firstStartedAt).toBeDefined()
    expect(putArgs.lastActivatedAt).toBeDefined()

    const profileUpdate = updateItemMock.mock.calls[0][0]
    expect(profileUpdate.ExpressionAttributeValues[':ids']).toEqual([
      'sleep-consistent-bedtime',
    ])
  })

  it('reactivates an inactive UPRACTICE (200, preserves firstStartedAt)', async () => {
    mockStore(
      { activePracticeIds: [], subscriptionStatus: 'FREE' },
      {
        'UPRACTICE#sleep-consistent-bedtime': {
          status: 'inactive',
          firstStartedAt: '2025-01-01T00:00:00.000Z',
          practiceId: 'sleep-consistent-bedtime',
        },
      },
    )
    const res = await POST(makeReq({ mode: 'startPractice', practiceId: 'sleep-consistent-bedtime' }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.reactivated).toBe(true)

    expect(putItemMock).not.toHaveBeenCalled() // no new record
    const statusUpdate = updateItemMock.mock.calls.find(
      (c) => c[0].Key.SK === 'UPRACTICE#sleep-consistent-bedtime',
    )
    expect(statusUpdate[0].ExpressionAttributeValues[':status']).toBe('active')
    expect(statusUpdate[0].ExpressionAttributeValues[':now']).toBeDefined()
  })

  it('reactivates a legacy "paused" UPRACTICE (lenient read)', async () => {
    mockStore(
      { activePracticeIds: [], subscriptionStatus: 'FREE' },
      {
        'UPRACTICE#sleep-consistent-bedtime': { status: 'paused' },
      },
    )
    const res = await POST(makeReq({ mode: 'startPractice', practiceId: 'sleep-consistent-bedtime' }))
    expect(res.status).toBe(200)
    expect((await res.json()).reactivated).toBe(true)
  })

  it('reactivates a legacy "replaced" UPRACTICE (lenient read)', async () => {
    mockStore(
      { activePracticeIds: [], subscriptionStatus: 'FREE' },
      {
        'UPRACTICE#sleep-consistent-bedtime': { status: 'replaced' },
      },
    )
    const res = await POST(makeReq({ mode: 'startPractice', practiceId: 'sleep-consistent-bedtime' }))
    expect(res.status).toBe(200)
  })

  it('already-active returns 200 alreadyActive (no-op, no writes)', async () => {
    mockStore(
      { activePracticeIds: ['sleep-consistent-bedtime'], subscriptionStatus: 'FREE' },
      {
        'UPRACTICE#sleep-consistent-bedtime': { status: 'active' },
      },
    )
    const res = await POST(makeReq({ mode: 'startPractice', practiceId: 'sleep-consistent-bedtime' }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.alreadyActive).toBe(true)
    expect(putItemMock).not.toHaveBeenCalled()
    expect(updateItemMock).not.toHaveBeenCalled()
  })

  it('FREE user at cap is blocked with 409 CAP_REACHED', async () => {
    mockStore({ activePracticeIds: ['financial-weekly-review'], subscriptionStatus: 'FREE' })
    const res = await POST(makeReq({ mode: 'startPractice', practiceId: 'sleep-consistent-bedtime' }))
    expect(res.status).toBe(409)
    expect((await res.json()).error).toBe('CAP_REACHED')
    expect(putItemMock).not.toHaveBeenCalled()
    expect(updateItemMock).not.toHaveBeenCalled()
  })

  it('PAID user blocked at 10 (no soft warnings)', async () => {
    const ten = Array.from({ length: 10 }, (_, i) => `practice-${i}`)
    mockStore({ activePracticeIds: ten, subscriptionStatus: 'PAID' })
    const res = await POST(makeReq({ mode: 'startPractice', practiceId: 'sleep-consistent-bedtime' }))
    expect(res.status).toBe(409)
    expect((await res.json()).error).toBe('CAP_REACHED')
  })

  it('PAID user at 5 active gets no warning (warnings dropped in v2)', async () => {
    const five = Array.from({ length: 5 }, (_, i) => `practice-${i}`)
    mockStore({ activePracticeIds: five, subscriptionStatus: 'PAID' })
    const res = await POST(makeReq({ mode: 'startPractice', practiceId: 'sleep-consistent-bedtime' }))
    expect(res.status).toBe(201)
    const json = await res.json()
    expect(json.warning).toBeUndefined()
  })

  it('returns 404 for unknown practiceId', async () => {
    mockStore({ activePracticeIds: [], subscriptionStatus: 'FREE' })
    const res = await POST(makeReq({ mode: 'startPractice', practiceId: 'nonexistent-id' }))
    expect(res.status).toBe(404)
  })

  it('reactivatePractice mode is an alias for startPractice', async () => {
    mockStore(
      { activePracticeIds: [], subscriptionStatus: 'FREE' },
      { 'UPRACTICE#sleep-consistent-bedtime': { status: 'inactive' } },
    )
    const res = await POST(makeReq({ mode: 'reactivatePractice', practiceId: 'sleep-consistent-bedtime' }))
    expect(res.status).toBe(200)
    expect((await res.json()).reactivated).toBe(true)
  })
})

// ── makePracticeInactive ─────────────────────────────────────────────────────

describe('POST /api/practice — makePracticeInactive', () => {
  it('flips active to inactive (200)', async () => {
    mockStore(
      { activePracticeIds: ['financial-weekly-review'], activePracticeSkById: { 'financial-weekly-review': 'UPRACTICE#financial-weekly-review' }, subscriptionStatus: 'FREE' },
      { 'UPRACTICE#financial-weekly-review': { status: 'active' } },
    )
    const res = await POST(makeReq({ mode: 'makePracticeInactive', practiceId: 'financial-weekly-review' }))
    expect(res.status).toBe(200)

    const statusUpdate = updateItemMock.mock.calls.find(
      (c) => c[0].Key.SK === 'UPRACTICE#financial-weekly-review',
    )
    expect(statusUpdate[0].ExpressionAttributeValues[':status']).toBe('inactive')
    expect(statusUpdate[0].ExpressionAttributeValues[':now']).toBeDefined()

    const profileUpdate = updateItemMock.mock.calls.find(
      (c) => c[0].Key.SK === 'PROFILE',
    )
    expect(profileUpdate[0].ExpressionAttributeValues[':ids']).toEqual([])
  })

  it('returns 409 PRACTICE_NOT_ACTIVE when no UPRACTICE exists', async () => {
    mockStore({ activePracticeIds: [], subscriptionStatus: 'FREE' })
    const res = await POST(makeReq({ mode: 'makePracticeInactive', practiceId: 'financial-weekly-review' }))
    expect(res.status).toBe(409)
    expect((await res.json()).error).toBe('PRACTICE_NOT_ACTIVE')
  })

  it('returns 409 PRACTICE_NOT_ACTIVE when UPRACTICE exists but is already inactive', async () => {
    mockStore(
      { activePracticeIds: [], subscriptionStatus: 'FREE' },
      { 'UPRACTICE#financial-weekly-review': { status: 'inactive' } },
    )
    const res = await POST(makeReq({ mode: 'makePracticeInactive', practiceId: 'financial-weekly-review' }))
    expect(res.status).toBe(409)
  })
})

// ── switchToPractice ─────────────────────────────────────────────────────────

describe('POST /api/practice — switchToPractice', () => {
  it('deactivates the old practice and activates the new (200)', async () => {
    mockStore(
      {
        activePracticeIds: ['financial-weekly-review'],
        activePracticeSkById: { 'financial-weekly-review': 'UPRACTICE#financial-weekly-review' },
        subscriptionStatus: 'FREE',
      },
      {
        'UPRACTICE#financial-weekly-review': { status: 'active' },
        'UPRACTICE#sleep-consistent-bedtime': null,
      },
    )
    const res = await POST(
      makeReq({
        mode: 'switchToPractice',
        practiceId: 'sleep-consistent-bedtime',
        deactivatePracticeId: 'financial-weekly-review',
      }),
    )
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.practiceId).toBe('sleep-consistent-bedtime')
    expect(json.deactivated).toBe('financial-weekly-review')

    // Old was set to inactive
    const inactiveUpdate = updateItemMock.mock.calls.find(
      (c) => c[0].Key.SK === 'UPRACTICE#financial-weekly-review',
    )
    expect(inactiveUpdate[0].ExpressionAttributeValues[':status']).toBe('inactive')

    // New was created with status=active
    const newPut = putItemMock.mock.calls.find(
      (c) => c[0].SK === 'UPRACTICE#sleep-consistent-bedtime',
    )
    expect(newPut[0].status).toBe('active')
  })

  it('reactivates an existing inactive practice on the activate side', async () => {
    mockStore(
      {
        activePracticeIds: ['financial-weekly-review'],
        activePracticeSkById: { 'financial-weekly-review': 'UPRACTICE#financial-weekly-review' },
        subscriptionStatus: 'FREE',
      },
      {
        'UPRACTICE#financial-weekly-review': { status: 'active' },
        'UPRACTICE#sleep-consistent-bedtime': {
          status: 'inactive',
          firstStartedAt: '2025-01-01T00:00:00.000Z',
        },
      },
    )
    const res = await POST(
      makeReq({
        mode: 'switchToPractice',
        practiceId: 'sleep-consistent-bedtime',
        deactivatePracticeId: 'financial-weekly-review',
      }),
    )
    expect(res.status).toBe(200)
    // No putItem for the reactivated one — only updateItem
    const newPut = putItemMock.mock.calls.find(
      (c) => c[0].SK === 'UPRACTICE#sleep-consistent-bedtime',
    )
    expect(newPut).toBeUndefined()
  })

  it('returns 400 if practiceId === deactivatePracticeId', async () => {
    mockStore({ activePracticeIds: ['financial-weekly-review'], subscriptionStatus: 'FREE' })
    const res = await POST(
      makeReq({
        mode: 'switchToPractice',
        practiceId: 'financial-weekly-review',
        deactivatePracticeId: 'financial-weekly-review',
      }),
    )
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('SAME_PRACTICE')
  })

  it('returns 400 when deactivatePracticeId is missing', async () => {
    const res = await POST(
      makeReq({ mode: 'switchToPractice', practiceId: 'sleep-consistent-bedtime' }),
    )
    expect(res.status).toBe(400)
  })

  it('returns 409 DEACTIVATE_PRACTICE_NOT_ACTIVE when the named practice is not active', async () => {
    mockStore(
      { activePracticeIds: [], subscriptionStatus: 'FREE' },
      { 'UPRACTICE#financial-weekly-review': { status: 'inactive' } },
    )
    const res = await POST(
      makeReq({
        mode: 'switchToPractice',
        practiceId: 'sleep-consistent-bedtime',
        deactivatePracticeId: 'financial-weekly-review',
      }),
    )
    expect(res.status).toBe(409)
    expect((await res.json()).error).toBe('DEACTIVATE_PRACTICE_NOT_ACTIVE')
  })

  it('returns 409 PRACTICE_ALREADY_ACTIVE when target is already active', async () => {
    mockStore(
      {
        activePracticeIds: ['financial-weekly-review', 'sleep-consistent-bedtime'],
        subscriptionStatus: 'PAID',
      },
      {
        'UPRACTICE#financial-weekly-review': { status: 'active' },
        'UPRACTICE#sleep-consistent-bedtime': { status: 'active' },
      },
    )
    const res = await POST(
      makeReq({
        mode: 'switchToPractice',
        practiceId: 'sleep-consistent-bedtime',
        deactivatePracticeId: 'financial-weekly-review',
      }),
    )
    expect(res.status).toBe(409)
    expect((await res.json()).error).toBe('PRACTICE_ALREADY_ACTIVE')
  })
})

// ── auth & validation ────────────────────────────────────────────────────────

describe('POST /api/practice — auth & validation', () => {
  it('returns 401 when unauthenticated', async () => {
    getCurrentUserMock.mockRejectedValue(new Error('Unauthorized'))
    const res = await POST(makeReq({ mode: 'startPractice', practiceId: 'sleep-consistent-bedtime' }))
    expect(res.status).toBe(401)
  })

  it('returns 400 for missing mode', async () => {
    const res = await POST(makeReq({ practiceId: 'sleep-consistent-bedtime' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 for missing practiceId', async () => {
    const res = await POST(makeReq({ mode: 'startPractice' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 for unknown mode', async () => {
    const res = await POST(makeReq({ mode: 'startTrial', practiceId: 'sleep-consistent-bedtime' }))
    expect(res.status).toBe(400)
  })
})
