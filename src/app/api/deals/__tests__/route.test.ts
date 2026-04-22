import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from '../route'

vi.mock('@/lib/session', () => ({ getApiSession: vi.fn() }))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    brandDeal: {
      findMany: vi.fn(),
      create:   vi.fn(),
    },
  },
}))

import { getApiSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'

const SESSION = { id: 'user_1', email: 'test@example.com', name: 'Test', plan: 'free' }

const DEAL = {
  id: 'deal_1', userId: 'user_1', brand: 'Nike', contact: 'Ana', email: 'ana@nike.com',
  phone: null, platform: 'instagram', type: 'sponsored_post', stage: 'negotiation',
  value: 2000, commissionPct: null, currency: 'USD',
  dueDate: null, description: null, deliverables: null, notes: null, tags: null, niche: null,
  createdAt: new Date(), updatedAt: new Date(),
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/deals', () => {
  it('returns 401 when not authenticated', async () => {
    vi.mocked(getApiSession).mockResolvedValue(null)
    const res = await GET(new NextRequest('http://localhost/api/deals'))
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBeDefined()
  })

  it('returns deals for authenticated user', async () => {
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.brandDeal.findMany).mockResolvedValue([DEAL] as any)

    const res = await GET(new NextRequest('http://localhost/api/deals'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveLength(1)
    expect(body[0].id).toBe('deal_1')
  })

  it('queries only records owned by the session user', async () => {
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.brandDeal.findMany).mockResolvedValue([])

    await GET(new NextRequest('http://localhost/api/deals'))
    expect(prisma.brandDeal.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ userId: 'user_1' }) })
    )
  })
})

describe('POST /api/deals', () => {
  it('returns 401 when not authenticated', async () => {
    vi.mocked(getApiSession).mockResolvedValue(null)
    const res = await POST(new NextRequest('http://localhost/api/deals', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brand: 'Nike', platform: 'instagram', type: 'sponsored_post' }),
    }))
    expect(res.status).toBe(401)
  })

  it('returns 400 when brand is missing', async () => {
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    const res = await POST(new NextRequest('http://localhost/api/deals', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ platform: 'instagram', type: 'sponsored_post' }),
    }))
    expect(res.status).toBe(400)
  })

  it('creates deal and returns 201', async () => {
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.brandDeal.create).mockResolvedValue(DEAL as any)

    const res = await POST(new NextRequest('http://localhost/api/deals', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brand: 'Nike', platform: 'instagram', type: 'sponsored_post', value: 2000 }),
    }))
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.id).toBe('deal_1')
    expect(body.brand).toBe('Nike')
  })

  it('always sets userId from session (ignores body userId)', async () => {
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.brandDeal.create).mockResolvedValue(DEAL as any)

    await POST(new NextRequest('http://localhost/api/deals', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brand: 'Nike', platform: 'instagram', type: 'ugc', userId: 'hacker' }),
    }))

    expect(prisma.brandDeal.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ userId: 'user_1' }) })
    )
  })

  it('defaults stage to "outreach" when not provided', async () => {
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.brandDeal.create).mockResolvedValue(DEAL as any)

    await POST(new NextRequest('http://localhost/api/deals', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brand: 'Adidas', platform: 'tiktok', type: 'ambassador' }),
    }))

    expect(prisma.brandDeal.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ stage: 'outreach' }) })
    )
  })
})
