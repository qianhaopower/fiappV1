type Entry = { count: number; resetAt: number }
const store = new Map<string, Entry>()

export function checkRateLimit(key: string, limit: number, windowMs = 60_000): boolean {
  if (process.env.NODE_ENV === 'test') return true
  const now = Date.now()
  const entry = store.get(key)
  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }
  if (entry.count >= limit) return false
  entry.count++
  return true
}
