import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from '../route'

vi.mock('@/lib/session', () => ({ getApiSession: vi.fn() }))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    influencerProfile: {
      findMany: vi.fn(),
      create:   vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
  },
}))

import { getApiSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'

const SESSION = { id: 'user_1', email: 'test@example.com', name: 'Test', plan: 'pro' }

const PROFILE = {
  id: 'inf_1', name: 'FitnessGuru', handle: '@fitnessguru',
  platform: 'instagram', niche: 'fitness', followers: 50000,
  engagement: 3.2, avgViews: 0, estimatedRate: 500,
  location: null, bio: null, topics: null, verified: false,
  profileUrl: null, addedById: 'user_1',
  createdAt: new Date(), updatedAt: new Date(),
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/influencer-discovery', () => {
  it('returns profiles without auth (public endpoint)', async () => {
    vi.mocked(getApiSession).mockResolvedValue(null)
    vi.mocked(prisma.influencerProfile.findMany).mockResolvedValue([PROFILE] as any)

    const res = await GET(new NextRequest('http://localhost/api/influencer-discovery'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.profiles).toHaveLength(1)
    expect(body.total).toBe(1)
  })

  it('filters by niche', async () => {
    vi.mocked(getApiSession).mockResolvedValue(null)
    vi.mocked(prisma.influencerProfile.findMany).mockResolvedValue([])

    await GET(new NextRequest('http://localhost/api/influencer-discovery?niche=fitness'))
    expect(prisma.influencerProfile.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ niche: 'fitness' }) })
    )
  })

  it('ignores niche=Todos filter', async () => {
    vi.mocked(getApiSession).mockResolvedValue(null)
    vi.mocked(prisma.influencerProfile.findMany).mockResolvedValue([])

    await GET(new NextRequest('http://localhost/api/influencer-discovery?niche=Todos'))
    expect(prisma.influencerProfile.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.not.objectContaining({ niche: expect.anything() }) })
    )
  })

  it('applies micro tier follower range', async () => {
    vi.mocked(getApiSession).mockResolvedValue(null)
    vi.mocked(prisma.influencerProfile.findMany).mockResolvedValue([])

    await GET(new NextRequest('http://localhost/api/influencer-discovery?tier=Micro'))
    expect(prisma.influencerProfile.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ followers: { gte: 10000, lte: 99999 } }),
      })
    )
  })

  it('applies search filter across name/handle/niche', async () => {
    vi.mocked(getApiSession).mockResolvedValue(null)
    vi.mocked(prisma.influencerProfile.findMany).mockResolvedValue([])

    await GET(new NextRequest('http://localhost/api/influencer-discovery?search=fitness'))
    expect(prisma.influencerProfile.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ OR: expect.any(Array) }) })
    )
  })
})

describe('POST /api/influencer-discovery', () => {
  it('returns 401 when not authenticated', async () => {
    vi.mocked(getApiSession).mockResolvedValue(null)
    const res = await POST(new NextRequest('http://localhost/api/influencer-discovery', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test', handle: 'test', platform: 'instagram' }),
    }))
    expect(res.status).toBe(401)
  })

  it('returns 403 when user is not pro', async () => {
    vi.mocked(getApiSession).mockResolvedValue({ ...SESSION, plan: 'free' } as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ ...SESSION, plan: 'free' } as any)

    const res = await POST(new NextRequest('http://localhost/api/influencer-discovery', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test', handle: 'test', platform: 'instagram' }),
    }))
    expect(res.status).toBe(403)
  })

  it('returns 400 when required fields are missing', async () => {
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'user_1', plan: 'pro' } as any)

    const res = await POST(new NextRequest('http://localhost/api/influencer-discovery', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ platform: 'instagram' }),
    }))
    expect(res.status).toBe(400)
  })

  it('creates profile and returns 201', async () => {
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'user_1', plan: 'pro' } as any)
    vi.mocked(prisma.influencerProfile.create).mockResolvedValue(PROFILE as any)

    const res = await POST(new NextRequest('http://localhost/api/influencer-discovery', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'FitnessGuru', handle: 'fitnessguru', platform: 'instagram' }),
    }))
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.profile.id).toBe('inf_1')
  })

  it('adds @ prefix to handle when missing', async () => {
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'user_1', plan: 'pro' } as any)
    vi.mocked(prisma.influencerProfile.create).mockResolvedValue(PROFILE as any)

    await POST(new NextRequest('http://localhost/api/influencer-discovery', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'FitnessGuru', handle: 'fitnessguru', platform: 'instagram' }),
    }))

    expect(prisma.influencerProfile.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ handle: '@fitnessguru' }) })
    )
  })

  it('returns 409 on duplicate handle', async () => {
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'user_1', plan: 'pro' } as any)
    const err: any = new Error('Unique constraint'); err.code = 'P2002'
    vi.mocked(prisma.influencerProfile.create).mockRejectedValue(err)

    const res = await POST(new NextRequest('http://localhost/api/influencer-discovery', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'FitnessGuru', handle: '@fitnessguru', platform: 'instagram' }),
    }))
    expect(res.status).toBe(409)
  })
})
