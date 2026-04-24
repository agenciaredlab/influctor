import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from '../route'

vi.mock('@/lib/session', () => ({
  getApiSession: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    socialMetric: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}))

import { getApiSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'

const mockSession = { id: 'user_1', email: 'test@example.com', name: 'Test', plan: 'free' }

const mockMetric = {
  id: 'metric_1',
  userId: 'user_1',
  platform: 'instagram',
  date: new Date('2025-04-01'),
  followers: 10000,
  following: 500,
  posts: 120,
  engagement: 3.5,
  reach: 25000,
  impressions: 40000,
  views: 0,
  likes: 850,
  comments: 120,
  shares: 45,
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/metrics', () => {
  it('returns 401 when not authenticated', async () => {
    vi.mocked(getApiSession).mockResolvedValue(null)
    const res = await GET(new NextRequest('http://localhost/api/metrics'))
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBeDefined()
  })

  it('returns metrics for authenticated user', async () => {
    vi.mocked(getApiSession).mockResolvedValue(mockSession as any)
    vi.mocked(prisma.socialMetric.findMany).mockResolvedValue([mockMetric] as any)

    const res = await GET(new NextRequest('http://localhost/api/metrics'))
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body).toHaveLength(1)
    expect(body[0].id).toBe('metric_1')
  })

  it('queries only records owned by the session user', async () => {
    vi.mocked(getApiSession).mockResolvedValue(mockSession as any)
    vi.mocked(prisma.socialMetric.findMany).mockResolvedValue([])

    await GET(new NextRequest('http://localhost/api/metrics'))

    expect(prisma.socialMetric.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ userId: 'user_1' }) })
    )
  })
})

describe('POST /api/metrics', () => {
  it('returns 401 when not authenticated', async () => {
    vi.mocked(getApiSession).mockResolvedValue(null)
    const req = new NextRequest('http://localhost/api/metrics', {
      method: 'POST',
      body: JSON.stringify({ platform: 'instagram', date: '2025-04-01', followers: 5000 }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('returns 400 when platform is missing', async () => {
    vi.mocked(getApiSession).mockResolvedValue(mockSession as any)
    const req = new NextRequest('http://localhost/api/metrics', {
      method: 'POST',
      body: JSON.stringify({ date: '2025-04-01', followers: 5000 }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 400 when date is missing', async () => {
    vi.mocked(getApiSession).mockResolvedValue(mockSession as any)
    const req = new NextRequest('http://localhost/api/metrics', {
      method: 'POST',
      body: JSON.stringify({ platform: 'instagram', followers: 5000 }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('creates a metric and returns 201', async () => {
    vi.mocked(getApiSession).mockResolvedValue(mockSession as any)
    vi.mocked(prisma.socialMetric.create).mockResolvedValue(mockMetric as any)

    const req = new NextRequest('http://localhost/api/metrics', {
      method: 'POST',
      body: JSON.stringify({ platform: 'instagram', date: '2025-04-01', followers: 10000, engagement: 3.5 }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.id).toBe('metric_1')
    expect(body.followers).toBe(10000)
  })

  it('always sets userId from session (ignores body userId)', async () => {
    vi.mocked(getApiSession).mockResolvedValue(mockSession as any)
    vi.mocked(prisma.socialMetric.create).mockResolvedValue(mockMetric as any)

    const req = new NextRequest('http://localhost/api/metrics', {
      method: 'POST',
      body: JSON.stringify({ platform: 'tiktok', date: '2025-04-01', followers: 1000, userId: 'hacker' }),
      headers: { 'Content-Type': 'application/json' },
    })
    await POST(req)

    expect(prisma.socialMetric.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ userId: 'user_1' }) })
    )
  })

  it('defaults numeric fields to 0 when omitted', async () => {
    vi.mocked(getApiSession).mockResolvedValue(mockSession as any)
    vi.mocked(prisma.socialMetric.create).mockResolvedValue(mockMetric as any)

    const req = new NextRequest('http://localhost/api/metrics', {
      method: 'POST',
      body: JSON.stringify({ platform: 'instagram', date: '2025-04-01' }),
      headers: { 'Content-Type': 'application/json' },
    })
    await POST(req)

    expect(prisma.socialMetric.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          followers: 0,
          engagement: 0,
          reach: 0,
        }),
      })
    )
  })

  it('returns 500 when DB throws on GET', async () => {
    vi.mocked(getApiSession).mockResolvedValue(mockSession as any)
    vi.mocked(prisma.socialMetric.findMany).mockRejectedValue(new Error('DB error'))
    const res = await GET(new NextRequest('http://localhost/api/metrics'))
    expect(res.status).toBe(500)
  })

  it('returns 500 when DB throws on POST', async () => {
    vi.mocked(getApiSession).mockResolvedValue(mockSession as any)
    vi.mocked(prisma.socialMetric.create).mockRejectedValue(new Error('DB error'))
    const res = await POST(new NextRequest('http://localhost/api/metrics', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ platform: 'instagram', date: '2025-01-01' }),
    }))
    expect(res.status).toBe(500)
  })
})
