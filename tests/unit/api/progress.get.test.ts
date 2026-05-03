import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from '@/app/api/progress/route'

const mainQueryMock = vi.fn()
const mainGetItemMock = vi.fn()
const returnsQueryMock = vi.fn()

vi.mock('@/utils/dynamoClient', () => ({
  createDynamoClient: () => ({
    getItem: mainGetItemMock,
    query: mainQueryMock,
  }),
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

const makeReq = () => new Request('http://localhost/api/progress')

beforeEach(() => {
  getCurrentUserMock.mockResolvedValue({ userId: 'u1', username: 'user' })
  mainGetItemMock.mockReset()
  mainQueryMock.mockReset()
  returnsQueryMock.mockReset()
  mainGetItemMock.mockResolvedValue(undefined)
  mainQueryMock.mockResolvedValue([])
  returnsQueryMock.mockResolvedValue([])
})

describe('GET /api/progress', () => {
  it('returns 200 with zeroed stats when profile is empty', async () => {
    const res = await GET(makeReq())
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.ok).toBe(true)
    expect(json.totalReturns).toBe(0)
    expect(json.practicesActivated).toBe(0)
    expect(json.currentStreak).toBe(0)
    expect(json.longestStreak).toBe(0)
    expect(json.milestones).toEqual([])
  })

  it('sums returnCounters for totalReturns', async () => {
    mainGetItemMock.mockResolvedValue({
      returnCounters: { 'sleep-consistent-bedtime': 5, 'sleep-screen-off': 3 },
    })
    const res = await GET(makeReq())
    const json = await res.json()
    expect(json.totalReturns).toBe(8)
  })

  it('counts UPRACTICE items for practicesActivated', async () => {
    mainQueryMock.mockImplementation(({ ExpressionAttributeValues }: { ExpressionAttributeValues: Record<string, string> }) => {
      const prefix = ExpressionAttributeValues[':prefix']
      if (prefix === 'UPRACTICE#') return Promise.resolve([{ SK: 'UPRACTICE#a' }, { SK: 'UPRACTICE#b' }])
      return Promise.resolve([])
    })
    const res = await GET(makeReq())
    const json = await res.json()
    expect(json.practicesActivated).toBe(2)
  })

  it('computes currentStreak and longestStreak from return records', async () => {
    const today = new Date().toISOString().split('T')[0]
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]

    mainGetItemMock.mockResolvedValue({
      activePracticeIds: ['sleep-consistent-bedtime'],
      returnCounters: {},
    })
    returnsQueryMock.mockResolvedValue([
      { PK: 'x', SK: `DATE#${today}`, didIt: true, createdAt: '', updatedAt: '' },
      { PK: 'x', SK: `DATE#${yesterday}`, didIt: true, createdAt: '', updatedAt: '' },
    ])

    const res = await GET(makeReq())
    const json = await res.json()
    expect(json.currentStreak).toBeGreaterThanOrEqual(2)
    expect(json.longestStreak).toBeGreaterThanOrEqual(2)
  })

  it('streak is 0 when no didIt=true records', async () => {
    mainGetItemMock.mockResolvedValue({
      activePracticeIds: ['sleep-consistent-bedtime'],
      returnCounters: {},
    })
    returnsQueryMock.mockResolvedValue([
      { PK: 'x', SK: 'DATE#2026-01-01', didIt: false, createdAt: '', updatedAt: '' },
    ])

    const res = await GET(makeReq())
    const json = await res.json()
    expect(json.currentStreak).toBe(0)
    expect(json.longestStreak).toBe(0)
  })

  it('returns milestones from query', async () => {
    mainQueryMock.mockImplementation(({ ExpressionAttributeValues }: { ExpressionAttributeValues: Record<string, string> }) => {
      const prefix = ExpressionAttributeValues[':prefix']
      if (prefix === 'MILESTONE#') return Promise.resolve([{
        PK: 'USER#u1',
        SK: 'MILESTONE#total#1',
        type: 'total',
        threshold: 1,
        title: 'First check-in',
        description: 'Logged your very first practice.',
        achievedAt: '2026-01-01T00:00:00.000Z',
      }])
      return Promise.resolve([])
    })
    const res = await GET(makeReq())
    const json = await res.json()
    expect(json.milestones).toHaveLength(1)
    expect(json.milestones[0].sk).toBe('MILESTONE#total#1')
    expect(json.milestones[0].title).toBe('First check-in')
  })

  it('handles returnCounters as JSON string', async () => {
    mainGetItemMock.mockResolvedValue({
      returnCounters: JSON.stringify({ 'sleep-consistent-bedtime': 10 }),
    })
    const res = await GET(makeReq())
    const json = await res.json()
    expect(json.totalReturns).toBe(10)
  })

  it('returns 401 when unauthenticated', async () => {
    getCurrentUserMock.mockRejectedValue(new Error('Unauthorized'))
    const res = await GET(makeReq())
    expect(res.status).toBe(401)
  })
})
