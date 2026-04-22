import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '../route'

vi.mock('@/lib/session', () => ({ getApiSession: vi.fn() }))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    contentPost:   { findUnique: vi.fn(), update: vi.fn() },
    socialAccount: { findFirst: vi.fn() },
  },
}))

import { getApiSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'

const SESSION  = { id: 'user_1', email: 'test@example.com', name: 'Test', plan: 'creator' }
const IG_ACCOUNT = {
  id: 'acc_1', userId: 'user_1', platform: 'instagram', isActive: true,
  platformUserId: 'ig_user_123', accessToken: 'valid_token',
  tokenExpiresAt: null, username: 'testuser',
}
const CONTENT_POST = {
  id: 'post_1', userId: 'user_1', title: 'My Reel', platform: 'instagram',
  type: 'reel', status: 'idea', imageUrl: 'https://example.com/video.mp4',
  caption: 'Amazing content!', hashtags: '#fitness #health',
  publishAttempts: 0, publishError: null,
}

function makeReq(body: unknown) {
  return new NextRequest('http://localhost/api/social/instagram/publish', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

// Mock fetch globally for Meta Graph API calls
const mockFetch = vi.fn()
global.fetch = mockFetch

function mockMetaSuccess() {
  mockFetch
    .mockResolvedValueOnce({
      ok: true, json: async () => ({ id: 'container_123' }),
    })
    // For IMAGE type, skip waitForContainer (no second call needed)
    .mockResolvedValueOnce({
      ok: true, json: async () => ({ id: 'media_456' }),
    })
}

beforeEach(() => {
  vi.clearAllMocks()
  mockFetch.mockReset()
})

describe('POST /api/social/instagram/publish', () => {
  it('returns 401 when not authenticated', async () => {
    vi.mocked(getApiSession).mockResolvedValue(null)
    const res = await POST(makeReq({ postId: 'post_1' }))
    expect(res.status).toBe(401)
  })

  it('returns 400 when postId is missing', async () => {
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    const res = await POST(makeReq({}))
    expect(res.status).toBe(400)
  })

  it('returns 404 when post not found', async () => {
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.contentPost.findUnique).mockResolvedValue(null)

    const res = await POST(makeReq({ postId: 'post_1' }))
    expect(res.status).toBe(404)
  })

  it('returns 400 when post is already published', async () => {
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.contentPost.findUnique).mockResolvedValue({ ...CONTENT_POST, status: 'published' } as any)

    const res = await POST(makeReq({ postId: 'post_1' }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/ya fue publicado/)
  })

  it('returns 400 when post has no imageUrl', async () => {
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.contentPost.findUnique).mockResolvedValue({ ...CONTENT_POST, imageUrl: null } as any)

    const res = await POST(makeReq({ postId: 'post_1' }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/imagen o video/)
  })

  it('returns 404 when no active Instagram account is connected', async () => {
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.contentPost.findUnique).mockResolvedValue(CONTENT_POST as any)
    vi.mocked(prisma.socialAccount.findFirst).mockResolvedValue(null)

    const res = await POST(makeReq({ postId: 'post_1' }))
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toMatch(/Instagram/)
  })

  it('returns 401 when Instagram token is expired', async () => {
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.contentPost.findUnique).mockResolvedValue(CONTENT_POST as any)
    vi.mocked(prisma.socialAccount.findFirst).mockResolvedValue({
      ...IG_ACCOUNT, tokenExpiresAt: new Date(Date.now() - 86400_000),
    } as any)

    const res = await POST(makeReq({ postId: 'post_1' }))
    expect(res.status).toBe(401)
  })

  it('publishes image post and marks it as published', async () => {
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.contentPost.findUnique).mockResolvedValue({
      ...CONTENT_POST, type: 'post', imageUrl: 'https://example.com/photo.jpg',
    } as any)
    vi.mocked(prisma.socialAccount.findFirst).mockResolvedValue(IG_ACCOUNT as any)
    vi.mocked(prisma.contentPost.update).mockResolvedValue({ ...CONTENT_POST, status: 'published' } as any)

    mockMetaSuccess()

    const res = await POST(makeReq({ postId: 'post_1' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.mediaId).toBe('media_456')
    expect(body.permalink).toContain('instagram.com')
  })

  it('records publish error on Meta API failure', async () => {
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.contentPost.findUnique).mockResolvedValue({
      ...CONTENT_POST, type: 'post', imageUrl: 'https://example.com/photo.jpg',
    } as any)
    vi.mocked(prisma.socialAccount.findFirst).mockResolvedValue(IG_ACCOUNT as any)
    vi.mocked(prisma.contentPost.update).mockResolvedValue(CONTENT_POST as any)

    mockFetch.mockResolvedValueOnce({
      ok: false, json: async () => ({ error: { message: 'Invalid token' } }),
    })

    const res = await POST(makeReq({ postId: 'post_1' }))
    expect(res.status).toBe(422)
    expect(prisma.contentPost.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ publishError: 'Invalid token' }) })
    )
  })
})
