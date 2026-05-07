import { NextResponse } from 'next/server'
import { createDynamoClient } from '@/utils/dynamoClient'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const started = Date.now()

  let dbOk = false
  try {
    const client = createDynamoClient()
    await client.getItem({ PK: 'METRICS', SK: 'TOTALS' })
    dbOk = true
  } catch {
    // DynamoDB unreachable — still return a response, just flag it
  }

  const status = dbOk ? 200 : 503
  return NextResponse.json(
    {
      ok: dbOk,
      timestamp: new Date().toISOString(),
      latencyMs: Date.now() - started,
      checks: { dynamodb: dbOk ? 'ok' : 'error' },
    },
    { status }
  )
}
