import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from '@/app/api/returns/route'

const returnsQueryMock = vi.fn()

vi.mock('@/utils/dynamoClient', () => ({
  createReturnsClient: () => ({
    query: returnsQueryMock,
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

function makeReq(params: Record<string, string>) {
  const url = new URL('http://localhost/api/returns')
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  return new Request(url)
}

beforeEach(() => {
  getCurrentUserMock.mockResolvedValue({ userId: 'u1', username: 'user' })
  returnsQueryMock.mockReset()
  returnsQueryMock.mockResolvedValue([])
})

describe('GET /api/returns', () => {
  it('returns exactly 14 entries by default', async () => {
    const res = await GET(makeReq({ practiceId: 'sleep-consistent-bedtime' }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.returns).toHaveLength(14)
    expect(json.days).toBe(14)
  })

  it('returns exactly N entries for custom days param', async () => {
    const res = await GET(makeReq({ practiceId: 'sleep-consistent-bedtime', days: '7' }))
    const json = await res.json()
    expect(json.returns).toHaveLength(7)
  })

  it('clamps days to max 30', async () => {
    const res = await GET(makeReq({ practiceId: 'sleep-consistent-bedtime', days: '999' }))
    const json = await res.json()
    expect(json.returns).toHaveLength(30)
  })

  it('clamps days to min 1', async () => {
    const res = await GET(makeReq({ practiceId: 'sleep-consistent-bedtime', days: '0' }))
    const json = await res.json()
    expect(json.returns).toHaveLength(1)
  })

  it('fills missing dates with didIt=null', async () => {
    returnsQueryMock.mockResolvedValue([])
    const res = await GET(makeReq({ practiceId: 'sleep-consistent-bedtime', days: '3' }))
    const json = await res.json()
    expect(json.returns.every((d: { didIt: unknown }) => d.didIt === null)).toBe(true)
  })

  it('maps existing return records correctly', async () => {
    returnsQueryMock.mockResolvedValue([
      { PK: 'x', SK: `DATE#${new Date().toISOString().split('T')[0]}`, didIt: true, createdAt: '', updatedAt: '' },
    ])
    const res = await GET(makeReq({ practiceId: 'sleep-consistent-bedtime', days: '1' }))
    const json = await res.json()
    expect(json.returns[0].didIt).toBe(true)
    expect(json.total).toBe(1)
  })

  it('returns ordered oldest → newest', async () => {
    const res = await GET(makeReq({ practiceId: 'sleep-consistent-bedtime', days: '3' }))
    const json = await res.json()
    const dates = json.returns.map((d: { date: string }) => d.date)
    expect(dates[0] < dates[1] && dates[1] < dates[2]).toBe(true)
  })

  it('returns 400 when practiceId is missing', async () => {
    const res = await GET(makeReq({}))
    expect(res.status).toBe(400)
  })

  it('returns 401 when unauthenticated', async () => {
    getCurrentUserMock.mockRejectedValue(new Error('Unauthorized'))
    const res = await GET(makeReq({ practiceId: 'sleep-consistent-bedtime' }))
    expect(res.status).toBe(401)
  })
})
