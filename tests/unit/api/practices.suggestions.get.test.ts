import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from '@/app/api/practices/suggestions/route'

const getItemMock = vi.fn()

vi.mock('@/utils/dynamoClient', () => ({
  createDynamoClient: () => ({
    getItem: getItemMock,
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

describe('GET /api/practices/suggestions', () => {
  beforeEach(() => {
    getItemMock.mockReset()
    getCurrentUserMock.mockReset()
  })

  it('returns 3 suggestions for the user focus pillar', async () => {
    getCurrentUserMock.mockResolvedValue({ userId: 'u1', username: 'user' })
    getItemMock.mockResolvedValue({ focusPillar: 'sleep' })

    const res = await GET()
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.suggestions).toHaveLength(3)
    expect(json.suggestions.every((s: { pillar: string }) => s.pillar === 'sleep')).toBe(true)
    expect(json.focusPillar).toBe('sleep')
  })

  it('returns 3 fallback suggestions when focusPillar is null', async () => {
    getCurrentUserMock.mockResolvedValue({ userId: 'u1', username: 'user' })
    getItemMock.mockResolvedValue({ focusPillar: null })

    const res = await GET()
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.suggestions).toHaveLength(3)
    expect(json.focusPillar).toBeNull()
  })

  it('returns 3 fallback suggestions when profile has no focusPillar field', async () => {
    getCurrentUserMock.mockResolvedValue({ userId: 'u1', username: 'user' })
    getItemMock.mockResolvedValue({})

    const res = await GET()
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.suggestions).toHaveLength(3)
  })

  it('each suggestion has the expected shape', async () => {
    getCurrentUserMock.mockResolvedValue({ userId: 'u1', username: 'user' })
    getItemMock.mockResolvedValue({ focusPillar: 'financial' })

    const res = await GET()
    const json = await res.json()

    for (const s of json.suggestions) {
      expect(s).toHaveProperty('id')
      expect(s).toHaveProperty('pillar')
      expect(s).toHaveProperty('title')
      expect(s).toHaveProperty('description')
      expect(s).toHaveProperty('rationale')
    }
  })

  it('returns 401 when unauthenticated', async () => {
    getCurrentUserMock.mockRejectedValue(new Error('Unauthorized'))

    const res = await GET()
    expect(res.status).toBe(401)
  })
})
