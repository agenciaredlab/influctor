import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from '../route'

vi.mock('@/lib/session', () => ({ getApiSession: vi.fn() }))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    marketplaceListing: {
      findMany: vi.fn(),
      create:   vi.fn(),
    },
    marketplaceApplication: {
      findMany: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
  },
}))

import { getApiSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'

const SESSION = { id: 'user_1', email: 'test@example.com', name: 'Test', plan: 'pro' }

const LISTING = {
  id: 'lst_1', title: 'Nike Collab', brandName: 'Nike', budget: 2500,
  budgetMax: null, budgetType: 'fixed', currency: 'USD',
  type: 'reel', platforms: 'instagram', niche: 'fitness',
  description: 'Reel campaign', deliverables: null, requirements: null,
  deadline: null, location: null, status: 'open', featured: false,
  applicantsCount: 0, postedById: 'brand_1',
  createdAt: new Date(), updatedAt: new Date(),
  _count: { applications: 0 },
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/marketplace/listings', () => {
  it('returns listings without auth', async () => {
    vi.mocked(getApiSession).mockResolvedValue(null)
    vi.mocked(prisma.marketplaceListing.findMany).mockResolvedValue([LISTING] as any)

    const res = await GET(new NextRequest('http://localhost/api/marketplace/listings'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.listings).toHaveLength(1)
    expect(body.appliedIds).toEqual({})
  })

  it('includes appliedIds for authenticated user', async () => {
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.marketplaceListing.findMany).mockResolvedValue([LISTING] as any)
    vi.mocked(prisma.marketplaceApplication.findMany).mockResolvedValue([
      { listingId: 'lst_1', status: 'pending' },
    ] as any)

    const res = await GET(new NextRequest('http://localhost/api/marketplace/listings'))
    const body = await res.json()
    expect(body.appliedIds).toEqual({ lst_1: 'pending' })
  })

  it('filters by status=open by default', async () => {
    vi.mocked(getApiSession).mockResolvedValue(null)
    vi.mocked(prisma.marketplaceListing.findMany).mockResolvedValue([])

    await GET(new NextRequest('http://localhost/api/marketplace/listings'))
    expect(prisma.marketplaceListing.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ status: 'open' }) })
    )
  })

  it('filters by niche when provided', async () => {
    vi.mocked(getApiSession).mockResolvedValue(null)
    vi.mocked(prisma.marketplaceListing.findMany).mockResolvedValue([])

    await GET(new NextRequest('http://localhost/api/marketplace/listings?niche=fitness'))
    expect(prisma.marketplaceListing.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ niche: 'fitness' }) })
    )
  })

  it('filters by featured=1', async () => {
    vi.mocked(getApiSession).mockResolvedValue(null)
    vi.mocked(prisma.marketplaceListing.findMany).mockResolvedValue([])

    await GET(new NextRequest('http://localhost/api/marketplace/listings?featured=1'))
    expect(prisma.marketplaceListing.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ featured: true }) })
    )
  })
})

describe('POST /api/marketplace/listings', () => {
  it('returns 401 when not authenticated', async () => {
    vi.mocked(getApiSession).mockResolvedValue(null)
    const res = await POST(new NextRequest('http://localhost/api/marketplace/listings', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Test', brandName: 'Nike', type: 'reel', platforms: 'instagram', niche: 'fitness' }),
    }))
    expect(res.status).toBe(401)
  })

  it('returns 403 when user is not pro', async () => {
    vi.mocked(getApiSession).mockResolvedValue({ ...SESSION, plan: 'creator' } as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'user_1', plan: 'creator' } as any)

    const res = await POST(new NextRequest('http://localhost/api/marketplace/listings', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Test', brandName: 'Nike', type: 'reel', platforms: 'instagram', niche: 'fitness' }),
    }))
    expect(res.status).toBe(403)
  })

  it('creates listing and returns 200', async () => {
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'user_1', plan: 'pro' } as any)
    vi.mocked(prisma.marketplaceListing.create).mockResolvedValue(LISTING as any)

    const res = await POST(new NextRequest('http://localhost/api/marketplace/listings', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Nike Collab', brandName: 'Nike', budget: 2500, type: 'reel', platforms: 'instagram', niche: 'fitness' }),
    }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.listing.id).toBe('lst_1')
  })

  it('sets postedById from session', async () => {
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'user_1', plan: 'pro' } as any)
    vi.mocked(prisma.marketplaceListing.create).mockResolvedValue(LISTING as any)

    await POST(new NextRequest('http://localhost/api/marketplace/listings', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Test', brandName: 'Nike', type: 'reel', platforms: 'instagram', niche: 'fitness', postedById: 'hacker' }),
    }))

    expect(prisma.marketplaceListing.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ postedById: 'user_1' }) })
    )
  })
})
