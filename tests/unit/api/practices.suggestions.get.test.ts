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

function mockStore(
  profile: Record<string, unknown> | null,
  assessment: Record<string, unknown> | null,
) {
  getItemMock.mockImplementation(async ({ SK }: { SK: string }) => {
    if (SK === 'PROFILE') return profile
    if (SK.startsWith('ASSESS#')) return assessment
    return null
  })
}

describe('GET /api/practices/suggestions', () => {
  beforeEach(() => {
    getItemMock.mockReset()
    getCurrentUserMock.mockReset()
  })

  it('hydrates suggestions from the latest ASSESS suggestedPracticeIds', async () => {
    getCurrentUserMock.mockResolvedValue({ userId: 'u1', username: 'user' })
    mockStore(
      { latestAssessmentId: 'a-1', lowestPillarId: 'sleep' },
      {
        suggestedPracticeIds: [
          'sleep-consistent-bedtime',
          'sleep-wind-down-ritual',
          'sleep-screen-off',
        ],
        lowestPillarId: 'sleep',
      },
    )

    const res = await GET()
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.suggestions.map((s: { id: string }) => s.id)).toEqual([
      'sleep-consistent-bedtime',
      'sleep-wind-down-ritual',
      'sleep-screen-off',
    ])
    expect(json.lowestPillarId).toBe('sleep')
    expect(json.focusPillar).toBe('sleep')
  })

  it('falls back to pillar-based pick when ASSESS lacks suggestedPracticeIds (legacy)', async () => {
    getCurrentUserMock.mockResolvedValue({ userId: 'u1', username: 'user' })
    mockStore(
      { latestAssessmentId: 'a-1', focusPillar: 'financial' },
      { focusPillar: 'financial' },
    )

    const res = await GET()
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.suggestions).toHaveLength(3)
    expect(json.suggestions.every((s: { pillar: string }) => s.pillar === 'financial')).toBe(true)
  })

  it('returns fallback suggestions when no assessment exists', async () => {
    getCurrentUserMock.mockResolvedValue({ userId: 'u1', username: 'user' })
    mockStore({}, null)

    const res = await GET()
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.suggestions).toHaveLength(3)
    expect(json.focusPillar).toBeNull()
    expect(json.lowestPillarId).toBeNull()
  })

  it('returns fallback when profile has no PROFILE item at all', async () => {
    getCurrentUserMock.mockResolvedValue({ userId: 'u1', username: 'user' })
    mockStore(null, null)

    const res = await GET()
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.suggestions).toHaveLength(3)
  })

  it('each suggestion has the expected shape', async () => {
    getCurrentUserMock.mockResolvedValue({ userId: 'u1', username: 'user' })
    mockStore(
      { latestAssessmentId: 'a-1', lowestPillarId: 'financial' },
      {
        suggestedPracticeIds: [
          'financial-weekly-review',
          'financial-bill-list',
          'financial-24hr-rule',
        ],
        lowestPillarId: 'financial',
      },
    )

    const res = await GET()
    const json = await res.json()

    for (const s of json.suggestions) {
      expect(s).toHaveProperty('id')
      expect(s).toHaveProperty('pillar')
      expect(s).toHaveProperty('title')
      expect(s).toHaveProperty('description')
      expect(s).toHaveProperty('rationale')
      expect(s).toHaveProperty('mappedQuestionId')
    }
  })

  it('returns 401 when unauthenticated', async () => {
    getCurrentUserMock.mockRejectedValue(new Error('Unauthorized'))

    const res = await GET()
    expect(res.status).toBe(401)
  })
})
