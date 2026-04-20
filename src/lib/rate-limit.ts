/**
 * Rate limiting with automatic backend selection:
 *
 *  - Production (UPSTASH_REDIS_REST_URL set) → Upstash Redis sliding window.
 *    Works across all instances/regions (Vercel, Railway, etc.).
 *
 *  - Development / no Redis → in-memory sliding window.
 *    Single-instance only; resets on server restart.
 *
 * Setup (Upstash):
 *   1. https://console.upstash.com → New Database (free tier)
 *   2. Copy REST URL and token to .env.local:
 *      UPSTASH_REDIS_REST_URL="https://..."
 *      UPSTASH_REDIS_REST_TOKEN="..."
 */

import { NextRequest } from 'next/server'

// ─── Result type ──────────────────────────────────────────────────────────────

export interface RateLimitResult {
  ok:         boolean
  remaining:  number
  retryAfter: number  // seconds to wait if ok=false
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

// ─── Upstash Redis limiter ────────────────────────────────────────────────────

// Lazily initialised so the import doesn't fail when Upstash isn't configured.
let upstashLimiter: ((id: string, limit: number, windowSec: number) => Promise<RateLimitResult>) | null = null

function getUpstashLimiter() {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null
  }
  if (upstashLimiter) return upstashLimiter

  // Dynamic import to avoid errors when package isn't configured
  const { Redis }     = require('@upstash/redis')
  const { Ratelimit } = require('@upstash/ratelimit')

  const redis = new Redis({
    url:   process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  })

  const cache = new Map<string, Ratelimit>()

  upstashLimiter = async (id: string, limit: number, windowSec: number) => {
    const key = `${limit}:${windowSec}`
    if (!cache.has(key)) {
      cache.set(key, new Ratelimit({
        redis,
        limiter:   Ratelimit.slidingWindow(limit, `${windowSec} s`),
        prefix:    'influctor:rl',
        ephemeralCache: new Map(),
      }))
    }
    const { success, remaining, reset } = await cache.get(key)!.limit(id)
    const retryAfter = success ? 0 : Math.ceil((reset - Date.now()) / 1000)
    return { ok: success, remaining, retryAfter }
  }

  return upstashLimiter
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function rateLimit(
  identifier: string,
  options: { limit: number; window: number },
): Promise<RateLimitResult> {
  const upstash = getUpstashLimiter()
  if (upstash) return upstash(identifier, options.limit, options.window)
  return memLimit(identifier, options.limit, options.window)
}

/** Builds a per-user+IP key from the request. */
export function rateLimitKey(req: NextRequest, userId?: string): string {
  const forwarded = req.headers.get('x-forwarded-for') ?? ''
  const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown'
  return userId ? `${ip}:${userId}` : ip
}
