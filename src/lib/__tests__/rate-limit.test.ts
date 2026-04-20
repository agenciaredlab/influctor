import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { rateLimit, rateLimitKey } from '../rate-limit'
import { NextRequest } from 'next/server'

// Unique prefix per test to avoid memStore cross-contamination
let testId = 0
function uid() { return `test-${++testId}-${Math.random()}` }

describe('rateLimit (in-memory, no REDIS_URL)', () => {
  beforeEach(() => {
    delete process.env.REDIS_URL
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('allows the first request', async () => {
    const result = await rateLimit(uid(), { limit: 5, window: 60 })
    expect(result.ok).toBe(true)
    expect(result.remaining).toBe(4)
    expect(result.retryAfter).toBe(0)
  })

  it('allows requests up to the limit', async () => {
    const id = uid()
    for (let i = 0; i < 3; i++) {
      const r = await rateLimit(id, { limit: 3, window: 60 })
      expect(r.ok).toBe(true)
    }
  })

  it('blocks after limit is exceeded', async () => {
    const id = uid()
    for (let i = 0; i < 2; i++) await rateLimit(id, { limit: 2, window: 60 })
    const r = await rateLimit(id, { limit: 2, window: 60 })
    expect(r.ok).toBe(false)
    expect(r.remaining).toBe(0)
    expect(r.retryAfter).toBeGreaterThan(0)
  })

  it('retryAfter is at most the window size', async () => {
    const id = uid()
    const window = 30
    await rateLimit(id, { limit: 1, window })
    const r = await rateLimit(id, { limit: 1, window })
    expect(r.retryAfter).toBeLessThanOrEqual(window)
  })

  it('resets after the window expires', async () => {
    const id = uid()
    await rateLimit(id, { limit: 1, window: 10 })
    // Advance time past the window
    vi.advanceTimersByTime(11_000)
    const r = await rateLimit(id, { limit: 1, window: 10 })
    expect(r.ok).toBe(true)
    expect(r.remaining).toBe(0)
  })

  it('remaining decrements with each request', async () => {
    const id = uid()
    const r1 = await rateLimit(id, { limit: 5, window: 60 })
    const r2 = await rateLimit(id, { limit: 5, window: 60 })
    const r3 = await rateLimit(id, { limit: 5, window: 60 })
    expect(r1.remaining).toBe(4)
    expect(r2.remaining).toBe(3)
    expect(r3.remaining).toBe(2)
  })

  it('handles limit of 1 correctly', async () => {
    const id = uid()
    const first = await rateLimit(id, { limit: 1, window: 60 })
    expect(first.ok).toBe(true)
    expect(first.remaining).toBe(0)

    const second = await rateLimit(id, { limit: 1, window: 60 })
    expect(second.ok).toBe(false)
  })

  it('different identifiers do not interfere', async () => {
    const id1 = uid()
    const id2 = uid()
    await rateLimit(id1, { limit: 1, window: 60 })
    const r = await rateLimit(id2, { limit: 1, window: 60 })
    expect(r.ok).toBe(true)
  })
})

describe('rateLimitKey', () => {
  it('uses x-forwarded-for IP', () => {
    const req = new NextRequest('http://localhost/api/test', {
      headers: { 'x-forwarded-for': '1.2.3.4' },
    })
    expect(rateLimitKey(req)).toBe('1.2.3.4')
  })

  it('takes first IP from comma-separated x-forwarded-for', () => {
    const req = new NextRequest('http://localhost/api/test', {
      headers: { 'x-forwarded-for': '10.0.0.1, 10.0.0.2, 10.0.0.3' },
    })
    expect(rateLimitKey(req)).toBe('10.0.0.1')
  })

  it('falls back to "unknown" when no IP header', () => {
    const req = new NextRequest('http://localhost/api/test')
    expect(rateLimitKey(req)).toBe('unknown')
  })

  it('appends userId when provided', () => {
    const req = new NextRequest('http://localhost/api/test', {
      headers: { 'x-forwarded-for': '5.6.7.8' },
    })
    expect(rateLimitKey(req, 'user_abc')).toBe('5.6.7.8:user_abc')
  })

  it('uses only IP when userId is undefined', () => {
    const req = new NextRequest('http://localhost/api/test', {
      headers: { 'x-forwarded-for': '9.9.9.9' },
    })
    expect(rateLimitKey(req, undefined)).toBe('9.9.9.9')
  })
})
