export type LogEntry = {
  requestId: string
  route: string
  method: string
  outcome: 'ok' | 'unauthorized' | 'error' | 'rate_limited'
  status: number
  latencyMs: number
  userId?: string
}

export function log(entry: LogEntry, level: 'info' | 'error' = 'info') {
  if (process.env.NODE_ENV === 'test') return
  const record = JSON.stringify({ ...entry, timestamp: new Date().toISOString() })
  if (level === 'error') console.error(record)
  else console.log(record)
}
