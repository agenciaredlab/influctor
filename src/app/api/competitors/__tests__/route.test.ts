import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '../route'

vi.mock('@/lib/session', () => ({ getApiSession: vi.fn() }))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    competitor: {
      create: vi.fn(),
    },
  },
}))

import { getApiSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'

const SESSION = { id: 'user_1', email: 'test@example.com', name: 'Test', plan: 'free' }

const COMPETITOR = {
  id: 'comp_1', userId: 'user_1', name: 'fitnessguru', handle: '@fitnessguru',
  platform: 'instagram', niche: 'fitness', followers: 50000, engagement: 3.2,
  avgLikes: 1600, avgComments: 85, postsPerWeek: 5, contentTypes: 'reels',
  notes: null, createdAt: new Date(), updatedAt: new Date(),
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('POST /api/competitors', () => {
  it('returns 401 when not authenticated', async () => {
    vi.mocked(getApiSession).mockResolvedValue(null)
    const res = await POST(new NextRequest('http://localhost/api/competitors', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ handle: '@fitnessguru', platform: 'instagram' }),
    }))
    expect(res.status).toBe(401)
  })

  it('creates competitor and returns 200', async () => {
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.competitor.create).mockResolvedValue(COMPETITOR as any)

    const res = await POST(new NextRequest('http://localhost/api/competitors', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ handle: '@fitnessguru', platform: 'instagram', niche: 'fitness', followers: 50000 }),
    }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.competitor.id).toBe('comp_1')
  })

  it('normalizes handle — adds @ prefix if missing', async () => {
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.competitor.create).mockResolvedValue(COMPETITOR as any)

    await POST(new NextRequest('http://localhost/api/competitors', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ handle: 'fitnessguru', platform: 'instagram' }),
    }))

    expect(prisma.competitor.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ handle: '@fitnessguru' }) })
    )
  })

  it('normalizes name — strips @ from handle', async () => {
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.competitor.create).mockResolvedValue(COMPETITOR as any)

    await POST(new NextRequest('http://localhost/api/competitors', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ handle: '@fitnessguru', platform: 'instagram' }),
    }))

    expect(prisma.competitor.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ name: 'fitnessguru' }) })
    )
  })

  it('always sets userId from session', async () => {
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.competitor.create).mockResolvedValue(COMPETITOR as any)

    await POST(new NextRequest('http://localhost/api/competitors', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ handle: 'test', platform: 'tiktok', userId: 'hacker' }),
    }))

    expect(prisma.competitor.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ userId: 'user_1' }) })
    )
  })

  it('defaults numeric fields to 0 when omitted', async () => {
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.competitor.create).mockResolvedValue(COMPETITOR as any)

    await POST(new NextRequest('http://localhost/api/competitors', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ handle: '@minimal', platform: 'instagram' }),
    }))

    expect(prisma.competitor.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ followers: 0, engagement: 0, avgLikes: 0 }),
      })
    )
  })
})
