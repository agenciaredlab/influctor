import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { PUT, DELETE } from '../route'

vi.mock('@/lib/session', () => ({
  getApiSession: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    socialMetric: {
      findFirst: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
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

const params = { params: { id: 'metric_1' } }

beforeEach(() => {
  vi.clearAllMocks()
})

describe('PUT /api/metrics/[id]', () => {
  it('returns 401 when not authenticated', async () => {
    vi.mocked(getApiSession).mockResolvedValue(null)
    const req = new NextRequest('http://localhost/api/metrics/metric_1', {
      method: 'PUT',
      body: JSON.stringify({ platform: 'instagram', date: '2025-04-01', followers: 12000 }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await PUT(req, params)
    expect(res.status).toBe(401)
  })

  it('returns 404 when metric does not belong to user', async () => {
    vi.mocked(getApiSession).mockResolvedValue(mockSession as any)
    vi.mocked(prisma.socialMetric.findFirst).mockResolvedValue(null)

    const req = new NextRequest('http://localhost/api/metrics/metric_1', {
      method: 'PUT',
      body: JSON.stringify({ platform: 'instagram', date: '2025-04-01', followers: 12000 }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await PUT(req, params)
    expect(res.status).toBe(404)
  })

  it('updates metric and returns 200', async () => {
    vi.mocked(getApiSession).mockResolvedValue(mockSession as any)
    vi.mocked(prisma.socialMetric.findFirst).mockResolvedValue(mockMetric as any)
    vi.mocked(prisma.socialMetric.update).mockResolvedValue({ ...mockMetric, followers: 12000 } as any)

    const req = new NextRequest('http://localhost/api/metrics/metric_1', {
      method: 'PUT',
      body: JSON.stringify({ platform: 'instagram', date: '2025-04-01', followers: 12000, engagement: 3.5 }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await PUT(req, params)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.followers).toBe(12000)
  })

  it('ownership check uses session userId not body', async () => {
    vi.mocked(getApiSession).mockResolvedValue(mockSession as any)
    vi.mocked(prisma.socialMetric.findFirst).mockResolvedValue(mockMetric as any)
    vi.mocked(prisma.socialMetric.update).mockResolvedValue(mockMetric as any)

    const req = new NextRequest('http://localhost/api/metrics/metric_1', {
      method: 'PUT',
      body: JSON.stringify({ platform: 'instagram', date: '2025-04-01', followers: 5000 }),
      headers: { 'Content-Type': 'application/json' },
    })
    await PUT(req, params)

    expect(prisma.socialMetric.findFirst).toHaveBeenCalledWith({
      where: { id: 'metric_1', userId: 'user_1' },
    })
  })
})

describe('DELETE /api/metrics/[id]', () => {
  it('returns 401 when not authenticated', async () => {
    vi.mocked(getApiSession).mockResolvedValue(null)
    const req = new NextRequest('http://localhost/api/metrics/metric_1', { method: 'DELETE' })
    const res = await DELETE(req, params)
    expect(res.status).toBe(401)
  })

  it('returns 404 when metric does not belong to user', async () => {
    vi.mocked(getApiSession).mockResolvedValue(mockSession as any)
    vi.mocked(prisma.socialMetric.findFirst).mockResolvedValue(null)

    const req = new NextRequest('http://localhost/api/metrics/metric_1', { method: 'DELETE' })
    const res = await DELETE(req, params)
    expect(res.status).toBe(404)
  })

  it('deletes metric and returns success', async () => {
    vi.mocked(getApiSession).mockResolvedValue(mockSession as any)
    vi.mocked(prisma.socialMetric.findFirst).mockResolvedValue(mockMetric as any)
    vi.mocked(prisma.socialMetric.delete).mockResolvedValue(mockMetric as any)

    const req = new NextRequest('http://localhost/api/metrics/metric_1', { method: 'DELETE' })
    const res = await DELETE(req, params)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })

  it('only deletes the specific metric by id', async () => {
    vi.mocked(getApiSession).mockResolvedValue(mockSession as any)
    vi.mocked(prisma.socialMetric.findFirst).mockResolvedValue(mockMetric as any)
    vi.mocked(prisma.socialMetric.delete).mockResolvedValue(mockMetric as any)

    const req = new NextRequest('http://localhost/api/metrics/metric_1', { method: 'DELETE' })
    await DELETE(req, params)

    expect(prisma.socialMetric.delete).toHaveBeenCalledWith({ where: { id: 'metric_1' } })
  })

  it('returns 500 when DB throws', async () => {
    vi.mocked(getApiSession).mockResolvedValue(mockSession as any)
    vi.mocked(prisma.socialMetric.findFirst).mockRejectedValue(new Error('DB error'))
    const req = new NextRequest('http://localhost/api/metrics/metric_1', { method: 'DELETE' })
    const res = await DELETE(req, params)
    expect(res.status).toBe(500)
  })
})
