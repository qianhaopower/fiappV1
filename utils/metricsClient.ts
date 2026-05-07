import { createDynamoClient } from './dynamoClient'

const PK = 'METRICS'
const TOTALS_SK = 'TOTALS'

function todayUTC() {
  return new Date().toISOString().slice(0, 10)
}

function ttl90Days() {
  return Math.floor(Date.now() / 1000) + 90 * 86400
}

/**
 * Atomically increment a total counter and optionally a daily counter.
 * Fire-and-forget — never throws, never blocks the calling route.
 */
export function trackEvent(
  totalField: string,
  dailyField?: string,
  by = 1
): void {
  const client = createDynamoClient()
  const now = new Date().toISOString()
  const today = todayUTC()

  // Totals
  client
    .updateItem({
      Key: { PK, SK: TOTALS_SK },
      UpdateExpression: 'ADD #f :n SET updatedAt = :now',
      ExpressionAttributeNames: { '#f': totalField },
      ExpressionAttributeValues: { ':n': by, ':now': now },
    })
    .catch((e) => console.error('[metrics] totals update failed:', e))

  // Daily
  if (dailyField) {
    client
      .updateItem({
        Key: { PK, SK: `DAILY#${today}` },
        UpdateExpression: 'ADD #f :n SET #d = :date, #ttl = :ttl',
        ExpressionAttributeNames: { '#f': dailyField, '#d': 'date', '#ttl': 'ttl' },
        ExpressionAttributeValues: {
          ':n': by,
          ':date': today,
          ':ttl': ttl90Days(),
        },
      })
      .catch((e) => console.error('[metrics] daily update failed:', e))
  }
}

/**
 * Increment the focus pillar counter when an assessment is completed.
 * Stored as top-level fields: pillarFocus_financial, pillarFocus_sleep, etc.
 */
export function trackPillarFocus(pillar: string): void {
  const client = createDynamoClient()
  const field = `pillarFocus_${pillar}`
  client
    .updateItem({
      Key: { PK, SK: TOTALS_SK },
      UpdateExpression: 'ADD #f :n SET updatedAt = :now',
      ExpressionAttributeNames: { '#f': field },
      ExpressionAttributeValues: { ':n': 1, ':now': new Date().toISOString() },
    })
    .catch((e) => console.error('[metrics] pillar focus update failed:', e))
}

export type MetricsTotals = {
  totalUsers?: number
  totalAssessments?: number
  totalReturns?: number
  totalTrials?: number
  totalPromotions?: number
  pillarFocus_financial?: number
  pillarFocus_relationship?: number
  pillarFocus_information?: number
  pillarFocus_emotional?: number
  pillarFocus_nutrition?: number
  pillarFocus_dynamic?: number
  pillarFocus_sleep?: number
  updatedAt?: string
}

export type MetricsDaily = {
  date: string
  newUsers?: number
  assessments?: number
  returns?: number
  trials?: number
}

export async function getMetricsTotals(): Promise<MetricsTotals> {
  const client = createDynamoClient()
  const item = await client.getItem<MetricsTotals>({ PK, SK: TOTALS_SK })
  return item ?? {}
}

export async function getMetricsDaily(days = 30): Promise<MetricsDaily[]> {
  const client = createDynamoClient()

  // Build list of last N dates
  const dates: string[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date()
    d.setUTCDate(d.getUTCDate() - i)
    dates.push(d.toISOString().slice(0, 10))
  }

  const oldest = dates[0]
  const items = await client.query<MetricsDaily>({
    KeyConditionExpression: 'PK = :pk AND SK BETWEEN :from AND :to',
    ExpressionAttributeValues: {
      ':pk': PK,
      ':from': `DAILY#${oldest}`,
      ':to': `DAILY#9999`,
    },
  })

  // Merge query results with the full date list so gaps show as zero
  const byDate = new Map(items.map((i) => [i.date, i]))
  return dates.map((d) => byDate.get(d) ?? { date: d })
}
