import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '@/app/api/practice/route'

const getItemMock = vi.fn()
const putItemMock = vi.fn()
const updateItemMock = vi.fn()
const queryMock = vi.fn()

vi.mock('@/utils/dynamoClient', () => ({
  createDynamoClient: () => ({
    getItem: getItemMock,
    putItem: putItemMock,
    updateItem: updateItemMock,
    query: queryMock,
  }),
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

function futureIso(days = 7) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
}

function pastIso(days = 1) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
}

describe('POST /api/practice — startTrial', () => {
  beforeEach(() => {
    getCurrentUserMock.mockResolvedValue({ userId: 'u1', username: 'user' })
    getItemMock.mockReset()
    putItemMock.mockReset()
    updateItemMock.mockReset()
    queryMock.mockReset()
  })

  it('creates a trial and returns 201', async () => {
    getItemMock.mockResolvedValue({ activePracticeIds: [], subscriptionStatus: 'FREE' })
    queryMock.mockResolvedValue([])
    putItemMock.mockResolvedValue(undefined)

    const res = await POST(makeReq({ mode: 'startTrial', practiceId: 'sleep-consistent-bedtime' }))
    expect(res.status).toBe(201)
    const json = await res.json()
    expect(json.trial.practiceId).toBe('sleep-consistent-bedtime')
    expect(json.trial.status).toBe('trial')
  })

  it('returns 404 for unknown practiceId', async () => {
    const res = await POST(makeReq({ mode: 'startTrial', practiceId: 'nonexistent-id' }))
    expect(res.status).toBe(404)
  })

  it('returns 409 ALREADY_ACTIVE if practice is already active', async () => {
    getItemMock.mockResolvedValue({ activePracticeIds: ['sleep-consistent-bedtime'], subscriptionStatus: 'FREE' })
    queryMock.mockResolvedValue([])

    const res = await POST(makeReq({ mode: 'startTrial', practiceId: 'sleep-consistent-bedtime' }))
    expect(res.status).toBe(409)
    expect((await res.json()).error).toBe('ALREADY_ACTIVE')
  })

  it('returns 409 ALREADY_TRIALING if active trial exists for the practice', async () => {
    getItemMock.mockResolvedValue({ activePracticeIds: [], subscriptionStatus: 'FREE' })
    queryMock.mockResolvedValue([
      {
        practiceId: 'sleep-consistent-bedtime',
        status: 'trial',
        expiresAt: futureIso(),
        SK: 'TRIAL#x#sleep-consistent-bedtime',
      },
    ])

    const res = await POST(makeReq({ mode: 'startTrial', practiceId: 'sleep-consistent-bedtime' }))
    expect(res.status).toBe(409)
    expect((await res.json()).error).toBe('ALREADY_TRIALING')
  })

  it('returns 409 TRIAL_LIMIT_REACHED when at max concurrent trials', async () => {
    getItemMock.mockResolvedValue({ activePracticeIds: [], subscriptionStatus: 'FREE' })
    queryMock.mockResolvedValue([
      {
        practiceId: 'sleep-screen-off',
        status: 'trial',
        expiresAt: futureIso(),
        SK: 'TRIAL#x#sleep-screen-off',
      },
    ])

    const res = await POST(makeReq({ mode: 'startTrial', practiceId: 'sleep-consistent-bedtime' }))
    expect(res.status).toBe(409)
    expect((await res.json()).error).toBe('TRIAL_LIMIT_REACHED')
  })

  // E5-T12: trial does NOT affect active cap
  it('E5-T12: FREE user at active cap can still start a trial', async () => {
    // User has 1 active practice (FREE cap = 1)
    getItemMock.mockResolvedValue({ activePracticeIds: ['financial-weekly-review'], subscriptionStatus: 'FREE' })
    queryMock.mockResolvedValue([])
    putItemMock.mockResolvedValue(undefined)

    const res = await POST(makeReq({ mode: 'startTrial', practiceId: 'sleep-consistent-bedtime' }))
    // startTrial doesn't check the active cap — it's only checked on promote
    expect(res.status).toBe(201)
    // activePracticeIds is NOT modified
    expect(updateItemMock).not.toHaveBeenCalled()
  })
})

describe('POST /api/practice — promoteTrial', () => {
  beforeEach(() => {
    getCurrentUserMock.mockResolvedValue({ userId: 'u1', username: 'user' })
    getItemMock.mockReset()
    putItemMock.mockReset()
    updateItemMock.mockReset()
    queryMock.mockReset()
  })

  it('promotes a valid trial and returns 200', async () => {
    getItemMock.mockResolvedValue({ activePracticeIds: [], activePracticeSkById: {}, subscriptionStatus: 'FREE' })
    queryMock.mockResolvedValue([
      { practiceId: 'sleep-consistent-bedtime', status: 'trial', expiresAt: futureIso(), SK: 'TRIAL#x#sleep-consistent-bedtime' },
    ])
    putItemMock.mockResolvedValue(undefined)
    updateItemMock.mockResolvedValue(undefined)

    const res = await POST(makeReq({ mode: 'promoteTrial', practiceId: 'sleep-consistent-bedtime' }))
    expect(res.status).toBe(200)
  })

  it('returns 409 CAP_REACHED for FREE user at cap', async () => {
    getItemMock.mockResolvedValue({
      activePracticeIds: ['financial-weekly-review'],
      activePracticeSkById: {},
      subscriptionStatus: 'FREE',
    })
    queryMock.mockResolvedValue([
      { practiceId: 'sleep-consistent-bedtime', status: 'trial', expiresAt: futureIso(), SK: 'TRIAL#x#sleep-consistent-bedtime' },
    ])

    const res = await POST(makeReq({ mode: 'promoteTrial', practiceId: 'sleep-consistent-bedtime' }))
    expect(res.status).toBe(409)
    expect((await res.json()).error).toBe('CAP_REACHED')
    // trial state is NOT mutated when blocked
    expect(updateItemMock).not.toHaveBeenCalled()
  })

  it('returns 409 TRIAL_EXPIRED for an expired trial', async () => {
    getItemMock.mockResolvedValue({ activePracticeIds: [], activePracticeSkById: {}, subscriptionStatus: 'FREE' })
    queryMock.mockResolvedValue([
      { practiceId: 'sleep-consistent-bedtime', status: 'trial', expiresAt: pastIso(), SK: 'TRIAL#x#sleep-consistent-bedtime' },
    ])

    const res = await POST(makeReq({ mode: 'promoteTrial', practiceId: 'sleep-consistent-bedtime' }))
    expect(res.status).toBe(409)
    expect((await res.json()).error).toBe('TRIAL_EXPIRED')
  })

  it('returns 404 TRIAL_NOT_FOUND when no active trial exists', async () => {
    getItemMock.mockResolvedValue({ activePracticeIds: [], activePracticeSkById: {}, subscriptionStatus: 'FREE' })
    queryMock.mockResolvedValue([])

    const res = await POST(makeReq({ mode: 'promoteTrial', practiceId: 'sleep-consistent-bedtime' }))
    expect(res.status).toBe(404)
  })
})

describe('POST /api/practice — discardTrial', () => {
  beforeEach(() => {
    getCurrentUserMock.mockResolvedValue({ userId: 'u1', username: 'user' })
    queryMock.mockReset()
    updateItemMock.mockReset()
  })

  it('discards a trial and returns 200', async () => {
    queryMock.mockResolvedValue([
      { practiceId: 'sleep-consistent-bedtime', status: 'trial', expiresAt: futureIso(), SK: 'TRIAL#x#sleep-consistent-bedtime' },
    ])
    updateItemMock.mockResolvedValue(undefined)

    const res = await POST(makeReq({ mode: 'discardTrial', practiceId: 'sleep-consistent-bedtime' }))
    expect(res.status).toBe(200)
    expect(updateItemMock).toHaveBeenCalledOnce()
    const call = updateItemMock.mock.calls[0][0]
    expect(call.ExpressionAttributeValues[':status']).toBe('discarded')
  })

  it('returns 404 when no active trial to discard', async () => {
    queryMock.mockResolvedValue([])
    const res = await POST(makeReq({ mode: 'discardTrial', practiceId: 'sleep-consistent-bedtime' }))
    expect(res.status).toBe(404)
  })
})

describe('POST /api/practice — auth', () => {
  it('returns 401 when unauthenticated', async () => {
    getCurrentUserMock.mockRejectedValue(new Error('Unauthorized'))
    const res = await POST(makeReq({ mode: 'startTrial', practiceId: 'sleep-consistent-bedtime' }))
    expect(res.status).toBe(401)
  })
})
