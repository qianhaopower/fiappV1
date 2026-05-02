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

beforeEach(() => {
  getCurrentUserMock.mockResolvedValue({ userId: 'u1', username: 'user' })
  getItemMock.mockReset()
  putItemMock.mockReset()
  updateItemMock.mockReset()
  queryMock.mockReset()
  putItemMock.mockResolvedValue(undefined)
  updateItemMock.mockResolvedValue(undefined)
})

// ── add ──────────────────────────────────────────────────────────────────────
describe('POST /api/practice — add', () => {
  it('creates UPRACTICE and returns 201', async () => {
    getItemMock.mockResolvedValue({ activePracticeIds: [], activePracticeSkById: {}, subscriptionStatus: 'FREE' })
    const res = await POST(makeReq({ mode: 'add', practiceId: 'sleep-consistent-bedtime' }))
    expect(res.status).toBe(201)
    expect(putItemMock).toHaveBeenCalledOnce()
    expect(updateItemMock).toHaveBeenCalledOnce()
  })

  it('returns 409 ALREADY_ACTIVE when practice is active', async () => {
    getItemMock.mockResolvedValue({ activePracticeIds: ['sleep-consistent-bedtime'], subscriptionStatus: 'FREE' })
    const res = await POST(makeReq({ mode: 'add', practiceId: 'sleep-consistent-bedtime' }))
    expect(res.status).toBe(409)
    expect((await res.json()).error).toBe('ALREADY_ACTIVE')
  })

  it('returns 409 CAP_REACHED for FREE user at cap', async () => {
    getItemMock.mockResolvedValue({ activePracticeIds: ['financial-weekly-review'], subscriptionStatus: 'FREE' })
    const res = await POST(makeReq({ mode: 'add', practiceId: 'sleep-consistent-bedtime' }))
    expect(res.status).toBe(409)
    expect((await res.json()).error).toBe('CAP_REACHED')
    expect(putItemMock).not.toHaveBeenCalled()
  })

  it('returns 404 for unknown practice', async () => {
    const res = await POST(makeReq({ mode: 'add', practiceId: 'nonexistent' }))
    expect(res.status).toBe(404)
  })
})

// ── replace ──────────────────────────────────────────────────────────────────
describe('POST /api/practice — replace', () => {
  it('returns 202 CONFIRM_REQUIRED on first call', async () => {
    const res = await POST(makeReq({
      mode: 'replace',
      practiceId: 'sleep-consistent-bedtime',
      replacePracticeId: 'financial-weekly-review',
    }))
    expect(res.status).toBe(202)
    const json = await res.json()
    expect(json.confirmRequired).toBe(true)
    expect(typeof json.confirmToken).toBe('string')
  })

  it('executes replace with valid confirmToken', async () => {
    // Step 1: get token
    const r1 = await POST(makeReq({
      mode: 'replace',
      practiceId: 'sleep-consistent-bedtime',
      replacePracticeId: 'financial-weekly-review',
    }))
    const { confirmToken } = await r1.json()

    // Step 2: confirm
    getItemMock.mockResolvedValue({
      activePracticeIds: ['financial-weekly-review'],
      activePracticeSkById: { 'financial-weekly-review': 'UPRACTICE#financial-weekly-review' },
      subscriptionStatus: 'FREE',
    })
    const r2 = await POST(makeReq({
      mode: 'replace',
      practiceId: 'sleep-consistent-bedtime',
      replacePracticeId: 'financial-weekly-review',
      confirmToken,
    }))
    expect(r2.status).toBe(200)
    expect(putItemMock).toHaveBeenCalledOnce()
    expect(updateItemMock).toHaveBeenCalledTimes(2) // old UPRACTICE + PROFILE
  })

  it('returns 409 INVALID_CONFIRM_TOKEN for bad token', async () => {
    getItemMock.mockResolvedValue({
      activePracticeIds: ['financial-weekly-review'],
      subscriptionStatus: 'FREE',
    })
    const res = await POST(makeReq({
      mode: 'replace',
      practiceId: 'sleep-consistent-bedtime',
      replacePracticeId: 'financial-weekly-review',
      confirmToken: 'bad-token',
    }))
    expect(res.status).toBe(409)
    expect((await res.json()).error).toBe('INVALID_CONFIRM_TOKEN')
  })

  it('returns 400 when replacePracticeId is missing', async () => {
    const res = await POST(makeReq({ mode: 'replace', practiceId: 'sleep-consistent-bedtime' }))
    expect(res.status).toBe(400)
  })
})

// ── pause ────────────────────────────────────────────────────────────────────
describe('POST /api/practice — pause', () => {
  it('pauses an active practice', async () => {
    getItemMock
      .mockResolvedValueOnce({ PK: 'USER#u1', SK: 'UPRACTICE#sleep-consistent-bedtime', practiceId: 'sleep-consistent-bedtime', status: 'active' })
      .mockResolvedValueOnce({ activePracticeIds: ['sleep-consistent-bedtime'], subscriptionStatus: 'FREE' })
    const res = await POST(makeReq({ mode: 'pause', practiceId: 'sleep-consistent-bedtime' }))
    expect(res.status).toBe(200)
    expect(updateItemMock).toHaveBeenCalledTimes(2) // UPRACTICE + PROFILE
    const upracticeCall = updateItemMock.mock.calls[0][0]
    expect(upracticeCall.ExpressionAttributeValues[':status']).toBe('paused')
  })

  it('returns 404 when practice is not active', async () => {
    getItemMock.mockResolvedValue(null)
    const res = await POST(makeReq({ mode: 'pause', practiceId: 'sleep-consistent-bedtime' }))
    expect(res.status).toBe(404)
  })
})

// ── resume ───────────────────────────────────────────────────────────────────
describe('POST /api/practice — resume', () => {
  it('resumes a paused practice', async () => {
    getItemMock
      .mockResolvedValueOnce({ practiceId: 'sleep-consistent-bedtime', status: 'paused' })
      .mockResolvedValueOnce({ activePracticeIds: [], subscriptionStatus: 'FREE' })
    const res = await POST(makeReq({ mode: 'resume', practiceId: 'sleep-consistent-bedtime' }))
    expect(res.status).toBe(200)
    const upracticeCall = updateItemMock.mock.calls[0][0]
    expect(upracticeCall.ExpressionAttributeValues[':status']).toBe('active')
  })

  it('returns 409 CAP_REACHED when at cap', async () => {
    getItemMock
      .mockResolvedValueOnce({ practiceId: 'sleep-consistent-bedtime', status: 'paused' })
      .mockResolvedValueOnce({ activePracticeIds: ['financial-weekly-review'], subscriptionStatus: 'FREE' })
    const res = await POST(makeReq({ mode: 'resume', practiceId: 'sleep-consistent-bedtime' }))
    expect(res.status).toBe(409)
    expect(updateItemMock).not.toHaveBeenCalled()
  })

  it('returns 404 when practice is not paused', async () => {
    getItemMock
      .mockResolvedValueOnce({ practiceId: 'sleep-consistent-bedtime', status: 'active' })
      .mockResolvedValueOnce({ activePracticeIds: [], subscriptionStatus: 'FREE' })
    const res = await POST(makeReq({ mode: 'resume', practiceId: 'sleep-consistent-bedtime' }))
    expect(res.status).toBe(404)
  })
})

// ── setFocus ──────────────────────────────────────────────────────────────────
describe('POST /api/practice — setFocus', () => {
  it('sets focus for an active practice', async () => {
    getItemMock.mockResolvedValue({ activePracticeIds: ['sleep-consistent-bedtime'], subscriptionStatus: 'FREE' })
    queryMock.mockResolvedValue([])
    const res = await POST(makeReq({ mode: 'setFocus', practiceId: 'sleep-consistent-bedtime' }))
    expect(res.status).toBe(200)
    const call = updateItemMock.mock.calls[0][0]
    expect(call.ExpressionAttributeValues[':id']).toBe('sleep-consistent-bedtime')
  })

  it('sets focus for an active trial practice', async () => {
    getItemMock.mockResolvedValue({ activePracticeIds: [], subscriptionStatus: 'FREE' })
    queryMock.mockResolvedValue([{
      practiceId: 'sleep-consistent-bedtime',
      status: 'trial',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      SK: 'TRIAL#x#sleep-consistent-bedtime',
    }])
    const res = await POST(makeReq({ mode: 'setFocus', practiceId: 'sleep-consistent-bedtime' }))
    expect(res.status).toBe(200)
  })

  it('returns 409 when practice is neither active nor a trial', async () => {
    getItemMock.mockResolvedValue({ activePracticeIds: [], subscriptionStatus: 'FREE' })
    queryMock.mockResolvedValue([])
    const res = await POST(makeReq({ mode: 'setFocus', practiceId: 'sleep-consistent-bedtime' }))
    expect(res.status).toBe(409)
    expect(updateItemMock).not.toHaveBeenCalled()
  })
})
