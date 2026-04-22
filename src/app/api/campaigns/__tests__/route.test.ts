import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from '../route'

vi.mock('@/lib/session', () => ({ getApiSession: vi.fn() }))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    campaign: {
      findMany: vi.fn(),
      count:    vi.fn(),
      create:   vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

import { getApiSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'

const SESSION = { id: 'user_1', email: 'test@example.com', name: 'Test', plan: 'free' }

const CAMPAIGN = {
  id: 'camp_1', userId: 'user_1', name: 'Spring Launch', objective: 'awareness',
  platform: 'instagram', budget: 1000, spent: 0, status: 'active',
  startDate: new Date('2025-04-01'), endDate: null,
  impressions: 0, reach: 0, engagement: 0, conversions: 0, clicks: 0,
  tags: null, description: null, createdAt: new Date(), updatedAt: new Date(),
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/campaigns', () => {
  it('returns 401 when not authenticated', async () => {
    vi.mocked(getApiSession).mockResolvedValue(null)
    const res = await GET(new NextRequest('http://localhost/api/campaigns'))
    expect(res.status).toBe(401)
  })

  it('returns paginated campaigns for authenticated user', async () => {
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.$transaction).mockResolvedValue([[CAMPAIGN], 1] as any)

    const res = await GET(new NextRequest('http://localhost/api/campaigns'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toHaveLength(1)
    expect(body.total).toBe(1)
    expect(body.page).toBe(1)
    expect(body.limit).toBe(20)
    expect(body.pages).toBe(1)
  })

  it('respects page and limit query params', async () => {
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.$transaction).mockResolvedValue([[], 40] as any)

    const res = await GET(new NextRequest('http://localhost/api/campaigns?page=2&limit=10'))
    const body = await res.json()
    expect(body.page).toBe(2)
    expect(body.limit).toBe(10)
    expect(body.pages).toBe(4)
  })

  it('clamps limit to max 100', async () => {
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.$transaction).mockResolvedValue([[], 0] as any)

    const res = await GET(new NextRequest('http://localhost/api/campaigns?limit=999'))
    const body = await res.json()
    expect(body.limit).toBe(100)
  })
})

describe('POST /api/campaigns', () => {
  it('returns 401 when not authenticated', async () => {
    vi.mocked(getApiSession).mockResolvedValue(null)
    const res = await POST(new NextRequest('http://localhost/api/campaigns', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test', platform: 'instagram', startDate: '2025-04-01' }),
    }))
    expect(res.status).toBe(401)
  })

  it('returns 400 when name is missing', async () => {
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    const res = await POST(new NextRequest('http://localhost/api/campaigns', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ platform: 'instagram', startDate: '2025-04-01' }),
    }))
    expect(res.status).toBe(400)
  })

  it('creates campaign and returns 201', async () => {
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.campaign.create).mockResolvedValue(CAMPAIGN as any)

    const res = await POST(new NextRequest('http://localhost/api/campaigns', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Spring Launch', platform: 'instagram', startDate: '2025-04-01' }),
    }))
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.id).toBe('camp_1')
  })

  it('always sets userId from session', async () => {
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.campaign.create).mockResolvedValue(CAMPAIGN as any)

    await POST(new NextRequest('http://localhost/api/campaigns', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test', platform: 'tiktok', startDate: '2025-04-01', userId: 'hacker' }),
    }))

    expect(prisma.campaign.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ userId: 'user_1' }) })
    )
  })

  it('defaults objective to "growth" when not provided', async () => {
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.campaign.create).mockResolvedValue(CAMPAIGN as any)

    await POST(new NextRequest('http://localhost/api/campaigns', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Campaign', platform: 'youtube', startDate: '2025-04-01' }),
    }))

    expect(prisma.campaign.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ objective: 'growth' }) })
    )
  })
})
