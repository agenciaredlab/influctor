import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from '../route'

vi.mock('@/lib/session', () => ({ getApiSession: vi.fn() }))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    contentPost: {
      findMany: vi.fn(),
      create:   vi.fn(),
    },
  },
}))

import { getApiSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'

const SESSION = { id: 'user_1', email: 'test@example.com', name: 'Test', plan: 'free' }

const POST_RECORD = {
  id: 'post_1', userId: 'user_1', title: 'My Reel', platform: 'instagram',
  type: 'reel', status: 'idea', scheduledAt: null, caption: null,
  hashtags: null, hookText: null, imageUrl: null, notes: null,
  createdAt: new Date(), updatedAt: new Date(),
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/content', () => {
  it('returns 401 when not authenticated', async () => {
    vi.mocked(getApiSession).mockResolvedValue(null)
    const res = await GET(new NextRequest('http://localhost/api/content'))
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBeDefined()
  })

  it('returns posts for authenticated user', async () => {
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.contentPost.findMany).mockResolvedValue([POST_RECORD] as any)

    const res = await GET(new NextRequest('http://localhost/api/content'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveLength(1)
    expect(body[0].id).toBe('post_1')
  })

  it('queries only posts owned by the session user', async () => {
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.contentPost.findMany).mockResolvedValue([])

    await GET(new NextRequest('http://localhost/api/content'))
    expect(prisma.contentPost.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ userId: 'user_1' }) })
    )
  })
})

describe('POST /api/content', () => {
  it('returns 401 when not authenticated', async () => {
    vi.mocked(getApiSession).mockResolvedValue(null)
    const res = await POST(new NextRequest('http://localhost/api/content', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Test', platform: 'instagram', type: 'reel' }),
    }))
    expect(res.status).toBe(401)
  })

  it('returns 400 when title is missing', async () => {
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    const res = await POST(new NextRequest('http://localhost/api/content', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ platform: 'instagram', type: 'reel' }),
    }))
    expect(res.status).toBe(400)
  })

  it('creates post and returns 201', async () => {
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.contentPost.create).mockResolvedValue(POST_RECORD as any)

    const res = await POST(new NextRequest('http://localhost/api/content', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'My Reel', platform: 'instagram', type: 'reel' }),
    }))
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.id).toBe('post_1')
  })

  it('defaults status to "idea" when not provided', async () => {
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.contentPost.create).mockResolvedValue(POST_RECORD as any)

    await POST(new NextRequest('http://localhost/api/content', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Draft', platform: 'tiktok', type: 'video' }),
    }))

    expect(prisma.contentPost.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'idea' }) })
    )
  })

  it('converts scheduledAt string to Date when provided', async () => {
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.contentPost.create).mockResolvedValue(POST_RECORD as any)

    await POST(new NextRequest('http://localhost/api/content', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Scheduled', platform: 'instagram', type: 'reel', scheduledAt: '2025-05-01T10:00' }),
    }))

    expect(prisma.contentPost.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ scheduledAt: expect.any(Date) }) })
    )
  })

  it('always sets userId from session', async () => {
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.contentPost.create).mockResolvedValue(POST_RECORD as any)

    await POST(new NextRequest('http://localhost/api/content', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Test', platform: 'instagram', type: 'post', userId: 'hacker' }),
    }))

    expect(prisma.contentPost.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ userId: 'user_1' }) })
    )
  })

  it('returns 500 when DB throws on GET', async () => {
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.contentPost.findMany).mockRejectedValue(new Error('DB error'))
    const res = await GET(new NextRequest('http://localhost/api/content'))
    expect(res.status).toBe(500)
  })

  it('returns 500 when DB throws on POST', async () => {
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.contentPost.create).mockRejectedValue(new Error('DB error'))
    const res = await POST(new NextRequest('http://localhost/api/content', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Post', platform: 'instagram', type: 'post' }),
    }))
    expect(res.status).toBe(500)
  })
})
