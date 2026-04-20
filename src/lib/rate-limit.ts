/**
 * Rate limiting with automatic backend selection:
 *
 *  - REDIS_URL set → ioredis sliding window (shared across all instances)
 *  - No Redis       → in-memory sliding window (dev / single-instance only)
 *
 * Usage:
 *   const { ok, retryAfter } = await rateLimit(rateLimitKey(req, userId), { limit: 20, window: 60 })
 *   if (!ok) return NextResponse.json({ error: '...' }, { status: 429, headers: { 'Retry-After': String(retryAfter) } })
 *
 * .env.local:
 *   REDIS_URL="redis://localhost:6379"
 *   REDIS_URL="redis://:password@host:6379"
 *   REDIS_URL="rediss://host:6380"   ← TLS
 */

import { NextRequest } from 'next/server'

export interface RateLimitResult {
  ok:         boolean
  remaining:  number
  retryAfter: number  // seconds; 0 when ok=true
}

// ─── In-memory fallback ───────────────────────────────────────────────────────

interface Window { count: number; resetAt: number }
const memStore = new Map<string, Window>()

if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [k, w] of memStore) if (w.resetAt < now) memStore.delete(k)
  }, 5 * 60 * 1000)
}

function memLimit(id: string, limit: number, windowSec: number): RateLimitResult {
  const now = Date.now()
  const ms  = windowSec * 1000
  const cur = memStore.get(id)

  if (!cur || cur.resetAt < now) {
    memStore.set(id, { count: 1, resetAt: now + ms })
    return { ok: true, remaining: limit - 1, retryAfter: 0 }
  }
  if (cur.count >= limit) {
    return { ok: false, remaining: 0, retryAfter: Math.ceil((cur.resetAt - now) / 1000) }
  }
  cur.count++
  return { ok: true, remaining: limit - cur.count, retryAfter: 0 }
}

// ─── Redis sliding window (sorted set) ───────────────────────────────────────

let redisClient: any = null

function getRedis() {
  if (!process.env.REDIS_URL) return null
  if (redisClient) return redisClient

  const { default: Redis } = require('ioredis')
  redisClient = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: 1,
    enableReadyCheck: false,
    lazyConnect: true,
  })
  redisClient.on('error', (err: Error) => {
    // Don't crash the app if Redis is down — fall back silently
    console.error('[rate-limit] Redis error:', err.message)
    redisClient = null
  })
  return redisClient
}

async function redisLimit(id: string, limit: number, windowSec: number): Promise<RateLimitResult> {
  const redis = getRedis()
  if (!redis) return memLimit(id, limit, windowSec)

  const key    = `rl:${id}`
  const now    = Date.now()
  const cutoff = now - windowSec * 1000

  try {
    // Sliding window via sorted set
    const pipeline = redis.pipeline()
    pipeline.zremrangebyscore(key, '-inf', cutoff)          // remove expired entries
    pipeline.zadd(key, now, `${now}-${Math.random()}`)      // add current request
    pipeline.zcard(key)                                      // count in window
    pipeline.pexpire(key, windowSec * 1000)                  // auto-expire the key

    const results  = await pipeline.exec() as [Error | null, any][]
    const count    = results[2][1] as number
    const remaining = Math.max(0, limit - count)

    if (count > limit) {
      // Get the oldest entry to calculate retry window
      const oldest = await redis.zrange(key, 0, 0, 'WITHSCORES') as string[]
      const oldestTs  = oldest.length >= 2 ? parseInt(oldest[1]) : now
      const retryAfter = Math.ceil((oldestTs + windowSec * 1000 - now) / 1000)
      return { ok: false, remaining: 0, retryAfter: Math.max(1, retryAfter) }
    }

    return { ok: true, remaining, retryAfter: 0 }
  } catch (err) {
    console.error('[rate-limit] Redis pipeline error:', err)
    return memLimit(id, limit, windowSec)
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function rateLimit(
  identifier: string,
  options: { limit: number; window: number },
): Promise<RateLimitResult> {
  if (process.env.REDIS_URL) return redisLimit(identifier, options.limit, options.window)
  return memLimit(identifier, options.limit, options.window)
}

export function rateLimitKey(req: NextRequest, userId?: string): string {
  const forwarded = req.headers.get('x-forwarded-for') ?? ''
  const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown'
  return userId ? `${ip}:${userId}` : ip
}
