import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '../route'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    contentPost: { findMany: vi.fn(), update: vi.fn() },
  },
}))

vi.mock('@/lib/email', () => ({
  sendPublishFailedNotification: vi.fn().mockResolvedValue({}),
}))

// Mock fetch globally
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

import { prisma } from '@/lib/prisma'
import { sendPublishFailedNotification } from '@/lib/email'

const NOW = new Date('2025-06-15T14:00:00Z')

const mockUser = { id: 'user_1', email: 'creator@example.com', name: 'Ana' }

function makePost(overrides: Partial<{
  id: string; title: string; platform: string; status: string;
  scheduledAt: Date; publishAttempts: number; publishError: string | null;
  publishedMediaId: string | null; user: typeof mockUser;
}> = {}) {
  return {
    id:               'post_1',
    title:            'Test Post',
    platform:         'instagram',
    status:           'scheduled',
    scheduledAt:      new Date('2025-06-15T13:55:00Z'), // 5 min before NOW
    publishAttempts:  0,
    publishError:     null,
    publishedMediaId: null,
    user:             mockUser,
    ...overrides,
  }
}

function cronReq(secret?: string) {
  const headers: Record<string, string> = {}
  if (secret) headers['authorization'] = `Bearer ${secret}`
  return new NextRequest('http://localhost/api/cron/publish-scheduled', { headers })
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
  delete process.env.CRON_SECRET
  vi.mocked(prisma.contentPost.update).mockResolvedValue({} as any)
  mockFetch.mockResolvedValue({
    ok: true,
    json: async () => ({ success: true, mediaId: 'ig_123' }),
  })
})

afterEach(() => {
  vi.useRealTimers()
})

// ─── Auth ─────────────────────────────────────────────────────────────────────

describe('GET /api/cron/publish-scheduled — auth', () => {
  it('allows request when CRON_SECRET is not set', async () => {
    vi.mocked(prisma.contentPost.findMany).mockResolvedValue([])
    const res = await GET(cronReq())
    expect(res.status).toBe(200)
  })

  it('returns 401 when CRON_SECRET is set but header is missing', async () => {
    process.env.CRON_SECRET = 'secret123'
    const res = await GET(cronReq())
    expect(res.status).toBe(401)
  })

  it('allows request with correct CRON_SECRET', async () => {
    process.env.CRON_SECRET = 'secret123'
    vi.mocked(prisma.contentPost.findMany).mockResolvedValue([])
    const res = await GET(cronReq('secret123'))
    expect(res.status).toBe(200)
  })

  it('returns 401 with wrong CRON_SECRET', async () => {
    process.env.CRON_SECRET = 'secret123'
    const res = await GET(cronReq('wrongsecret'))
    expect(res.status).toBe(401)
  })
})

// ─── No posts due ─────────────────────────────────────────────────────────────

describe('GET /api/cron/publish-scheduled — no posts', () => {
  it('returns processed=0 when no candidates found', async () => {
    vi.mocked(prisma.contentPost.findMany).mockResolvedValue([])
    const res = await GET(cronReq())
    const body = await res.json()
    expect(body.processed).toBe(0)
  })

  it('does not call fetch when no posts', async () => {
    vi.mocked(prisma.contentPost.findMany).mockResolvedValue([])
    await GET(cronReq())
    expect(mockFetch).not.toHaveBeenCalled()
  })
})

// ─── Backoff filtering ────────────────────────────────────────────────────────

describe('GET /api/cron/publish-scheduled — backoff', () => {
  it('processes a fresh post (attempt 0) scheduled in the past', async () => {
    const post = makePost({ publishAttempts: 0, scheduledAt: new Date(NOW.getTime() - 2 * 60 * 1000) })
    vi.mocked(prisma.contentPost.findMany).mockResolvedValue([post as any])

    const res = await GET(cronReq())
    const body = await res.json()
    expect(body.processed).toBe(1)
    expect(mockFetch).toHaveBeenCalledOnce()
  })

  it('skips attempt 1 post if only 3 min have passed (needs 5 min backoff)', async () => {
    // scheduledAt = NOW - 3 min; attempt 1 → needs scheduledAt + 5min = NOW + 2min (not yet)
    const post = makePost({
      publishAttempts: 1,
      scheduledAt: new Date(NOW.getTime() - 3 * 60 * 1000),
    })
    vi.mocked(prisma.contentPost.findMany).mockResolvedValue([post as any])

    const res = await GET(cronReq())
    const body = await res.json()
    expect(body.processed).toBe(0)
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('processes attempt 1 post after 5+ min backoff', async () => {
    // scheduledAt = NOW - 6 min; attempt 1 → retry at scheduledAt + 5min = NOW - 1min ✓
    const post = makePost({
      publishAttempts: 1,
      scheduledAt: new Date(NOW.getTime() - 6 * 60 * 1000),
    })
    vi.mocked(prisma.contentPost.findMany).mockResolvedValue([post as any])

    const res = await GET(cronReq())
    const body = await res.json()
    expect(body.processed).toBe(1)
    expect(mockFetch).toHaveBeenCalledOnce()
  })

  it('skips attempt 2 post if only 10 min have passed (needs 20 min backoff)', async () => {
    const post = makePost({
      publishAttempts: 2,
      scheduledAt: new Date(NOW.getTime() - 10 * 60 * 1000),
    })
    vi.mocked(prisma.contentPost.findMany).mockResolvedValue([post as any])

    const res = await GET(cronReq())
    const body = await res.json()
    expect(body.processed).toBe(0)
  })

  it('processes attempt 2 post after 20+ min backoff', async () => {
    const post = makePost({
      publishAttempts: 2,
      scheduledAt: new Date(NOW.getTime() - 21 * 60 * 1000),
    })
    vi.mocked(prisma.contentPost.findMany).mockResolvedValue([post as any])

    const res = await GET(cronReq())
    const body = await res.json()
    expect(body.processed).toBe(1)
  })
})

// ─── Success path ─────────────────────────────────────────────────────────────

describe('GET /api/cron/publish-scheduled — success', () => {
  it('returns succeeded=1 and failed=0 on successful publish', async () => {
    vi.mocked(prisma.contentPost.findMany).mockResolvedValue([makePost() as any])

    const res = await GET(cronReq())
    const body = await res.json()
    expect(body.succeeded).toBe(1)
    expect(body.failed).toBe(0)
  })

  it('calls the Instagram publish endpoint with postId', async () => {
    vi.mocked(prisma.contentPost.findMany).mockResolvedValue([makePost({ id: 'post_abc' }) as any])

    await GET(cronReq())
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/social/instagram/publish'),
      expect.objectContaining({ method: 'POST', body: expect.stringContaining('post_abc') })
    )
  })
})

// ─── Failure and retry ────────────────────────────────────────────────────────

describe('GET /api/cron/publish-scheduled — failure handling', () => {
  it('returns failed=1 when publish endpoint returns error', async () => {
    mockFetch.mockResolvedValue({ ok: false, json: async () => ({ error: 'Token expired' }) })
    vi.mocked(prisma.contentPost.findMany).mockResolvedValue([makePost() as any])

    const res = await GET(cronReq())
    const body = await res.json()
    expect(body.failed).toBe(1)
    expect(body.succeeded).toBe(0)
  })

  it('marks post as failed after MAX_ATTEMPTS (4) exhausted', async () => {
    mockFetch.mockResolvedValue({ ok: false, json: async () => ({ error: 'Token expired' }) })
    // publishAttempts = 3 means this will be attempt 4 (the last one)
    const post = makePost({
      publishAttempts: 3,
      scheduledAt: new Date(NOW.getTime() - 55 * 60 * 1000), // past the 50-min backoff
    })
    vi.mocked(prisma.contentPost.findMany).mockResolvedValue([post as any])

    await GET(cronReq())

    expect(prisma.contentPost.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'failed' }) })
    )
  })

  it('sends failure notification after MAX_ATTEMPTS exhausted', async () => {
    mockFetch.mockResolvedValue({ ok: false, json: async () => ({ error: 'Token expired' }) })
    const post = makePost({
      publishAttempts: 3,
      scheduledAt: new Date(NOW.getTime() - 55 * 60 * 1000),
    })
    vi.mocked(prisma.contentPost.findMany).mockResolvedValue([post as any])

    await GET(cronReq())

    expect(sendPublishFailedNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userEmail: 'creator@example.com',
        postTitle: 'Test Post',
        attempts:  4,
        lastError: 'Token expired',
      })
    )
  })

  it('does NOT send notification on intermediate failure (not yet exhausted)', async () => {
    mockFetch.mockResolvedValue({ ok: false, json: async () => ({ error: 'Timeout' }) })
    const post = makePost({ publishAttempts: 1, scheduledAt: new Date(NOW.getTime() - 6 * 60 * 1000) })
    vi.mocked(prisma.contentPost.findMany).mockResolvedValue([post as any])

    await GET(cronReq())

    expect(sendPublishFailedNotification).not.toHaveBeenCalled()
    expect(prisma.contentPost.update).not.toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'failed' }) })
    )
  })

  it('includes exhausted count in response', async () => {
    mockFetch.mockResolvedValue({ ok: false, json: async () => ({ error: 'err' }) })
    const post = makePost({
      publishAttempts: 3,
      scheduledAt: new Date(NOW.getTime() - 55 * 60 * 1000),
    })
    vi.mocked(prisma.contentPost.findMany).mockResolvedValue([post as any])

    const res = await GET(cronReq())
    const body = await res.json()
    expect(body.exhausted).toBe(1)
  })

  it('handles fetch throwing (network error) gracefully', async () => {
    mockFetch.mockRejectedValue(new Error('ECONNREFUSED'))
    vi.mocked(prisma.contentPost.findMany).mockResolvedValue([makePost() as any])

    const res = await GET(cronReq())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.failed).toBe(1)
  })
})
