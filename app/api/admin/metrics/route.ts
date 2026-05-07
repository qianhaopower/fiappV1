import { NextResponse } from 'next/server'
import { withAuth } from '@/utils/authServer'
import { getMetricsTotals, getMetricsDaily } from '@/utils/metricsClient'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ADMIN_USER_ID = process.env.FIAPP_ADMIN_USER_ID

export async function GET(req: Request) {
  return withAuth(req, async (user) => {
    if (!ADMIN_USER_ID || user.userId !== ADMIN_USER_ID) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const [totals, daily] = await Promise.all([
      getMetricsTotals(),
      getMetricsDaily(30),
    ])

    return NextResponse.json({ totals, daily })
  })
}
