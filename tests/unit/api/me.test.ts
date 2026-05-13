import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET, PATCH } from '@/app/api/me/route'

const getItemMock = vi.fn()
const putItemIfNotExistsMock = vi.fn()
const queryMock = vi.fn()
const updateItemMock = vi.fn()

vi.mock('@/utils/dynamoClient', () => ({
  createDynamoClient: () => ({
    getItem: getItemMock,
    putItemIfNotExists: putItemIfNotExistsMock,
    query: queryMock,
    updateItem: updateItemMock,
  }),
}))

vi.mock('@/utils/metricsClient', () => ({ trackEvent: vi.fn() }))

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

const existingProfile = {
  PK: 'USER#usr-1',
  SK: 'PROFILE',
  userId: 'usr-1',
  subscriptionStatus: 'FREE',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  activePracticeIds: [],
  latestAssessmentId: null,
}

beforeEach(() => {
  getCurrentUserMock.mockResolvedValue({ userId: 'usr-1', username: 'test@example.com' })
  getItemMock.mockReset()
  putItemIfNotExistsMock.mockReset()
  queryMock.mockReset()
  updateItemMock.mockReset()
  queryMock.mockResolvedValue([])
  updateItemMock.mockResolvedValue(undefined)
})

describe('GET /api/me', () => {
  it('returns existing profile with activeTrialCount=0 (trials removed in v2)', async () => {
    getItemMock.mockResolvedValue(existingProfile)

    const res = await GET(new Request('http://localhost/api/me'))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.ok).toBe(true)
    expect(json.data.userId).toBe('usr-1')
    expect(json.data.activeTrialCount).toBe(0)
    expect(json.data.PK).toBeUndefined()
    expect(json.data.SK).toBeUndefined()
  })

  it('does not query the TRIAL# partition any more', async () => {
    getItemMock.mockResolvedValue(existingProfile)

    await GET(new Request('http://localhost/api/me'))

    expect(queryMock).not.toHaveBeenCalled()
  })

  it('creates profile when missing and returns it', async () => {
    getItemMock.mockResolvedValue(undefined)
    putItemIfNotExistsMock.mockResolvedValue(true)

    const res = await GET(new Request('http://localhost/api/me'))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.ok).toBe(true)
    expect(json.data.subscriptionStatus).toBe('FREE')
    expect(json.data.activeTrialCount).toBe(0)
    expect(putItemIfNotExistsMock).toHaveBeenCalledOnce()
  })

  it('re-reads profile on race condition (putItemIfNotExists returns false)', async () => {
    getItemMock
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(existingProfile)
    putItemIfNotExistsMock.mockResolvedValue(false)

    const res = await GET(new Request('http://localhost/api/me'))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.data.userId).toBe('usr-1')
    expect(getItemMock).toHaveBeenCalledTimes(2)
  })

  it('returns 500 when profile re-read after race also fails', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    getItemMock
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
    putItemIfNotExistsMock.mockResolvedValue(false)

    const res = await GET(new Request('http://localhost/api/me'))
    expect(res.status).toBe(500)
    consoleError.mockRestore()
  })

  it('returns 401 when unauthenticated', async () => {
    getCurrentUserMock.mockRejectedValue(new Error('Not authenticated'))
    const res = await GET(new Request('http://localhost/api/me'))
    expect(res.status).toBe(401)
  })
})

describe('PATCH /api/me', () => {
  function makeReq(body: object) {
    return new Request('http://localhost/api/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  }

  it('updates timezone and returns 200', async () => {
    const res = await PATCH(makeReq({ timezone: 'America/New_York' }))
    expect(res.status).toBe(200)
    expect((await res.json()).ok).toBe(true)
    expect(updateItemMock).toHaveBeenCalledOnce()
    const call = updateItemMock.mock.calls[0][0]
    expect(Object.values(call.ExpressionAttributeNames)).toContain('timezone')
    expect(Object.values(call.ExpressionAttributeValues)).toContain('America/New_York')
  })

  it('updates dayResetTime and returns 200', async () => {
    const res = await PATCH(makeReq({ dayResetTime: 180 }))
    expect(res.status).toBe(200)
    expect(updateItemMock).toHaveBeenCalledOnce()
    const call = updateItemMock.mock.calls[0][0]
    expect(Object.values(call.ExpressionAttributeNames)).toContain('dayResetTime')
    expect(Object.values(call.ExpressionAttributeValues)).toContain(180)
  })

  it('updates both fields in a single updateItem call', async () => {
    const res = await PATCH(makeReq({ timezone: 'Australia/Melbourne', dayResetTime: 240 }))
    expect(res.status).toBe(200)
    expect(updateItemMock).toHaveBeenCalledOnce()
    const call = updateItemMock.mock.calls[0][0]
    expect(Object.values(call.ExpressionAttributeNames)).toContain('timezone')
    expect(Object.values(call.ExpressionAttributeNames)).toContain('dayResetTime')
  })

  it('returns 200 without calling updateItem when body is empty', async () => {
    const res = await PATCH(makeReq({}))
    expect(res.status).toBe(200)
    expect(updateItemMock).not.toHaveBeenCalled()
  })

  it('returns 400 for invalid timezone string', async () => {
    const res = await PATCH(makeReq({ timezone: 'Not/A/Timezone' }))
    expect(res.status).toBe(400)
    expect(updateItemMock).not.toHaveBeenCalled()
  })

  it('returns 400 for dayResetTime below 0', async () => {
    const res = await PATCH(makeReq({ dayResetTime: -1 }))
    expect(res.status).toBe(400)
  })

  it('returns 400 for dayResetTime above 1439', async () => {
    const res = await PATCH(makeReq({ dayResetTime: 1440 }))
    expect(res.status).toBe(400)
  })

  it('returns 400 for non-integer dayResetTime', async () => {
    const res = await PATCH(makeReq({ dayResetTime: 4.5 }))
    expect(res.status).toBe(400)
  })

  it('returns 401 when unauthenticated', async () => {
    getCurrentUserMock.mockRejectedValue(new Error('Not authenticated'))
    const res = await PATCH(makeReq({ timezone: 'UTC' }))
    expect(res.status).toBe(401)
  })
})
