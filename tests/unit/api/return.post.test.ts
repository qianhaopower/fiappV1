import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '@/app/api/return/route'

vi.mock('@/utils/metricsClient', () => ({ trackEvent: vi.fn() }))

const mainGetItemMock = vi.fn()
const mainQueryMock = vi.fn()
const mainUpdateItemMock = vi.fn()
const mainPutItemIfNotExistsMock = vi.fn()
const returnsGetItemMock = vi.fn()
const returnsPutItemMock = vi.fn()

vi.mock('@/utils/dynamoClient', () => ({
  createDynamoClient: () => ({
    getItem: mainGetItemMock,
    query: mainQueryMock,
    updateItem: mainUpdateItemMock,
    putItemIfNotExists: mainPutItemIfNotExistsMock,
  }),
  createReturnsClient: () => ({
    getItem: returnsGetItemMock,
    putItem: returnsPutItemMock,
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
  return new Request('http://localhost/api/return', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  getCurrentUserMock.mockResolvedValue({ userId: 'u1', username: 'user' })
  mainGetItemMock.mockReset()
  mainQueryMock.mockReset()
  mainUpdateItemMock.mockReset()
  mainPutItemIfNotExistsMock.mockReset()
  returnsGetItemMock.mockReset()
  returnsPutItemMock.mockReset()
  mainUpdateItemMock.mockResolvedValue(undefined)
  mainPutItemIfNotExistsMock.mockResolvedValue(false)
  returnsPutItemMock.mockResolvedValue(undefined)
  mainQueryMock.mockResolvedValue([])
})

describe('POST /api/return', () => {
  it('creates a new return record (didIt=true) and returns delta=1', async () => {
    mainGetItemMock.mockResolvedValue({ activePracticeIds: ['sleep-consistent-bedtime'], returnCounters: {} })
    returnsGetItemMock.mockResolvedValue(undefined)

    const res = await POST(makeReq({ practiceId: 'sleep-consistent-bedtime', didIt: true }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.didIt).toBe(true)
    expect(json.delta).toBe(1)
    expect(returnsPutItemMock).toHaveBeenCalledOnce()
    expect(mainUpdateItemMock).toHaveBeenCalledOnce()
  })

  it('creates a new return record (didIt=false) and returns delta=0, skips counter update', async () => {
    mainGetItemMock.mockResolvedValue({ activePracticeIds: ['sleep-consistent-bedtime'], returnCounters: {} })
    returnsGetItemMock.mockResolvedValue(undefined)

    const res = await POST(makeReq({ practiceId: 'sleep-consistent-bedtime', didIt: false }))
    const json = await res.json()
    expect(json.delta).toBe(0)
    expect(returnsPutItemMock).toHaveBeenCalledOnce()
    expect(mainUpdateItemMock).not.toHaveBeenCalled()
  })

  it('is idempotent — same value returns noop=true', async () => {
    mainGetItemMock.mockResolvedValue({ activePracticeIds: ['sleep-consistent-bedtime'], returnCounters: {} })
    returnsGetItemMock.mockResolvedValue({ didIt: true, createdAt: 'x', updatedAt: 'x' })

    const res = await POST(makeReq({ practiceId: 'sleep-consistent-bedtime', didIt: true }))
    const json = await res.json()
    expect(json.noop).toBe(true)
    expect(returnsPutItemMock).not.toHaveBeenCalled()
    expect(mainUpdateItemMock).not.toHaveBeenCalled()
  })

  it('toggle true→false returns delta=-1', async () => {
    mainGetItemMock.mockResolvedValue({ activePracticeIds: ['sleep-consistent-bedtime'], returnCounters: { 'sleep-consistent-bedtime': 5 } })
    returnsGetItemMock.mockResolvedValue({ didIt: true, createdAt: 'x', updatedAt: 'x' })

    const res = await POST(makeReq({ practiceId: 'sleep-consistent-bedtime', didIt: false }))
    const json = await res.json()
    expect(json.delta).toBe(-1)
    expect(mainUpdateItemMock).toHaveBeenCalledOnce()
    const counters = mainUpdateItemMock.mock.calls[0][0].ExpressionAttributeValues[':counters']
    expect(counters['sleep-consistent-bedtime']).toBe(4)
  })

  it('toggle false→true returns delta=+1', async () => {
    mainGetItemMock.mockResolvedValue({ activePracticeIds: ['sleep-consistent-bedtime'], returnCounters: {} })
    returnsGetItemMock.mockResolvedValue({ didIt: false, createdAt: 'x', updatedAt: 'x' })

    const res = await POST(makeReq({ practiceId: 'sleep-consistent-bedtime', didIt: true }))
    const json = await res.json()
    expect(json.delta).toBe(1)
  })

  // E5-T13: returns during trial count toward counters
  it('E5-T13: counts return during active trial', async () => {
    mainGetItemMock.mockResolvedValue({ activePracticeIds: [], returnCounters: {} })
    mainQueryMock.mockResolvedValue([{
      practiceId: 'sleep-consistent-bedtime',
      status: 'trial',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      SK: 'TRIAL#x#sleep-consistent-bedtime',
    }])
    returnsGetItemMock.mockResolvedValue(undefined)

    const res = await POST(makeReq({ practiceId: 'sleep-consistent-bedtime', didIt: true }))
    expect(res.status).toBe(200)
    expect((await res.json()).delta).toBe(1)
    expect(mainUpdateItemMock).toHaveBeenCalledOnce()
  })

  it('returns 409 when practice is not active or trial', async () => {
    mainGetItemMock.mockResolvedValue({ activePracticeIds: [], returnCounters: {} })
    mainQueryMock.mockResolvedValue([])

    const res = await POST(makeReq({ practiceId: 'sleep-consistent-bedtime', didIt: true }))
    expect(res.status).toBe(409)
    expect((await res.json()).error).toBe('PRACTICE_NOT_ACTIVE_OR_TRIAL')
  })

  it('returns 401 when unauthenticated', async () => {
    getCurrentUserMock.mockRejectedValue(new Error('Unauthorized'))
    const res = await POST(makeReq({ practiceId: 'sleep-consistent-bedtime', didIt: true }))
    expect(res.status).toBe(401)
  })

  it('returns 400 for missing fields', async () => {
    const res = await POST(makeReq({ practiceId: 'sleep-consistent-bedtime' }))
    expect(res.status).toBe(400)
  })

  it('returns newMilestones=[] when no milestone crossed', async () => {
    mainGetItemMock.mockResolvedValue({ activePracticeIds: ['sleep-consistent-bedtime'], returnCounters: { 'sleep-consistent-bedtime': 5 } })
    returnsGetItemMock.mockResolvedValue(undefined)

    const res = await POST(makeReq({ practiceId: 'sleep-consistent-bedtime', didIt: true }))
    const json = await res.json()
    expect(json.newMilestones).toEqual([])
  })

  it('returns newMilestones with first-checkin milestone when counter crosses 1', async () => {
    mainGetItemMock.mockResolvedValue({ activePracticeIds: ['sleep-consistent-bedtime'], returnCounters: {} })
    returnsGetItemMock.mockResolvedValue(undefined)
    mainPutItemIfNotExistsMock.mockResolvedValue(true)

    const res = await POST(makeReq({ practiceId: 'sleep-consistent-bedtime', didIt: true }))
    const json = await res.json()
    // counter goes 0→1: crosses total#1 only (practice milestones are at 7 and 30)
    expect(json.newMilestones).toHaveLength(1)
    expect(json.newMilestones[0].type).toBe('total')
    expect(json.newMilestones[0].threshold).toBe(1)
    expect(json.newMilestones[0].title).toBe('First check-in')
  })

  it('does not return milestone when putItemIfNotExists returns false (already earned)', async () => {
    mainGetItemMock.mockResolvedValue({ activePracticeIds: ['sleep-consistent-bedtime'], returnCounters: {} })
    returnsGetItemMock.mockResolvedValue(undefined)
    mainPutItemIfNotExistsMock.mockResolvedValue(false) // already exists

    const res = await POST(makeReq({ practiceId: 'sleep-consistent-bedtime', didIt: true }))
    const json = await res.json()
    expect(json.newMilestones).toEqual([])
  })

  it('returns newMilestones=[] on noop', async () => {
    mainGetItemMock.mockResolvedValue({ activePracticeIds: ['sleep-consistent-bedtime'], returnCounters: {} })
    returnsGetItemMock.mockResolvedValue({ didIt: true, createdAt: 'x', updatedAt: 'x' })

    const res = await POST(makeReq({ practiceId: 'sleep-consistent-bedtime', didIt: true }))
    const json = await res.json()
    expect(json.noop).toBe(true)
    expect(json.newMilestones).toEqual([])
  })

  it('uses user timezone from profile when date is omitted', async () => {
    mainGetItemMock.mockResolvedValue({
      activePracticeIds: ['sleep-consistent-bedtime'],
      returnCounters: {},
      timezone: 'UTC',
      dayResetTime: 0,
    })
    returnsGetItemMock.mockResolvedValue(undefined)

    const res = await POST(makeReq({ practiceId: 'sleep-consistent-bedtime', didIt: true }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('respects explicit date param over user timezone', async () => {
    mainGetItemMock.mockResolvedValue({
      activePracticeIds: ['sleep-consistent-bedtime'],
      returnCounters: {},
      timezone: 'America/New_York',
      dayResetTime: 240,
    })
    returnsGetItemMock.mockResolvedValue(undefined)

    const res = await POST(makeReq({ practiceId: 'sleep-consistent-bedtime', didIt: true, date: '2026-01-10' }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.date).toBe('2026-01-10')
  })

  it('returns 400 for invalid explicit date format', async () => {
    const res = await POST(makeReq({ practiceId: 'sleep-consistent-bedtime', didIt: true, date: 'not-a-date' }))
    expect(res.status).toBe(400)
  })
})
