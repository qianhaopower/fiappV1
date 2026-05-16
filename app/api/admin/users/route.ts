import { NextResponse } from 'next/server'
import { withAuth } from '@/utils/authServer'
import { createDynamoClient } from '@/utils/dynamoClient'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ADMIN_USER_ID = process.env.FIAPP_ADMIN_USER_ID

type IndexRow = {
  PK: string
  SK: string
  userId: string
  createdAt?: string
}

type ProfileRow = {
  subscriptionStatus?: string
  activePracticeIds?: string[]
  returnCounters?: Record<string, number> | string
  createdAt?: string
  updatedAt?: string
}

type UserSummary = {
  userId: string
  subscriptionStatus: string
  activePractices: number
  totalCheckIns: number
  createdAt?: string
  updatedAt?: string
  isTestAccount: boolean
}

function parseCounters(raw: ProfileRow['returnCounters']): Record<string, number> {
  if (!raw) return {}
  if (typeof raw === 'string') {
    try { return JSON.parse(raw || '{}') } catch { return {} }
  }
  return raw
}

function loadTestUserIds(): Set<string> {
  const raw = process.env.FIAPP_TEST_USER_IDS ?? ''
  return new Set(raw.split(',').map((s) => s.trim()).filter(Boolean))
}

export async function GET(req: Request) {
  return withAuth(req, async (user) => {
    if (!ADMIN_USER_ID || user.userId !== ADMIN_USER_ID) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const client = createDynamoClient()

    // Query the user index — one item per registered user. Populated by
    // /api/me on profile creation and by scripts/backfill-users-index.mjs.
    const indexRows = await client.query<IndexRow>({
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
      ExpressionAttributeValues: { ':pk': 'USERS', ':prefix': 'INDEX#' },
    })

    const testIds = loadTestUserIds()

    const users: UserSummary[] = await Promise.all(
      indexRows.map(async (row) => {
        const profile = await client.getItem<ProfileRow>({
          PK: `USER#${row.userId}`,
          SK: 'PROFILE',
        })
        const counters = parseCounters(profile?.returnCounters)
        const totalCheckIns = Object.values(counters).reduce((sum, n) => sum + (Number(n) || 0), 0)
        return {
          userId: row.userId,
          subscriptionStatus: profile?.subscriptionStatus ?? 'FREE',
          activePractices: profile?.activePracticeIds?.length ?? 0,
          totalCheckIns,
          createdAt: profile?.createdAt ?? row.createdAt,
          updatedAt: profile?.updatedAt,
          isTestAccount: testIds.has(row.userId),
        }
      })
    )

    users.sort((a, b) => b.totalCheckIns - a.totalCheckIns)

    return NextResponse.json({ users })
  })
}
