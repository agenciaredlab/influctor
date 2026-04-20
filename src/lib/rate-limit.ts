/**
 * In-memory sliding-window rate limiter.
 *
 * Works for single-instance deployments (Railway, Render, VPS).
 * For multi-instance (Vercel serverless with many regions), replace
 * the store with Upstash Redis using the same interface.
 *
 * Usage:
 *   const { ok, retryAfter } = rateLimit(identifier, { limit: 10, window: 60 })
 *   if (!ok) return NextResponse.json({ error: '...' }, { status: 429, headers: { 'Retry-After': String(retryAfter) } })
 */

interface Window {
  count:     number
  resetAt:   number  // unix ms
}

const store = new Map<string, Window>()

// Clean up expired keys every 5 minutes to avoid memory leaks
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [key, win] of store) {
      if (win.resetAt < now) store.delete(key)
    }
  }, 5 * 60 * 1000)
}

interface Options {
  limit:  number   // max requests per window
  window: number   // window size in seconds
}

export function rateLimit(
  identifier: string,
  { limit, window: windowSec }: Options
): { ok: boolean; remaining: number; retryAfter: number } {
  const now      = Date.now()
  const windowMs = windowSec * 1000
  const key      = identifier

  const current = store.get(key)

  if (!current || current.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return { ok: true, remaining: limit - 1, retryAfter: 0 }
  }

  if (current.count >= limit) {
    const retryAfter = Math.ceil((current.resetAt - now) / 1000)
    return { ok: false, remaining: 0, retryAfter }
  }

  current.count++
  return { ok: true, remaining: limit - current.count, retryAfter: 0 }
}

/** Builds the identifier from IP + optional userId for per-user limits. */
export function rateLimitKey(req: Request, userId?: string): string {
  const forwarded = (req.headers as any).get?.('x-forwarded-for') ?? ''
  const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown'
  return userId ? `${ip}:${userId}` : ip
}
