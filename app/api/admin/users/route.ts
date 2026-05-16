import { NextResponse } from 'next/server'
import { withAuth } from '@/utils/authServer'
import { createDynamoClient } from '@/utils/dynamoClient'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ADMIN_USER_ID = process.env.FIAPP_ADMIN_USER_ID

type ProfileRow = {
  PK: string
  SK: string
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
    const rows = await client.scan<ProfileRow>({
      FilterExpression: 'SK = :sk AND begins_with(PK, :pkPrefix)',
      ExpressionAttributeValues: { ':sk': 'PROFILE', ':pkPrefix': 'USER#' },
    })

    const testIds = loadTestUserIds()

    const users: UserSummary[] = rows.map((r) => {
      const userId = r.PK.replace(/^USER#/, '')
      const counters = parseCounters(r.returnCounters)
      const totalCheckIns = Object.values(counters).reduce((sum, n) => sum + (Number(n) || 0), 0)
      return {
        userId,
        subscriptionStatus: r.subscriptionStatus ?? 'FREE',
        activePractices: r.activePracticeIds?.length ?? 0,
        totalCheckIns,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        isTestAccount: testIds.has(userId),
      }
    })

    users.sort((a, b) => b.totalCheckIns - a.totalCheckIns)

    return NextResponse.json({ users })
  })
}
