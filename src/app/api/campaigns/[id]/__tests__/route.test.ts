import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { PUT, PATCH, DELETE } from '../route'

vi.mock('@/lib/session', () => ({ getApiSession: vi.fn() }))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    campaign: {
      findFirst: vi.fn(),
      update:    vi.fn(),
      delete:    vi.fn(),
    },
  },
}))

import { getApiSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'

const SESSION = { id: 'user_1', email: 'test@example.com', name: 'Test', plan: 'free' }

const CAMPAIGN = {
  id: 'camp_1', userId: 'user_1', name: 'Spring Campaign', objective: 'awareness',
  platform: 'instagram', budget: 1000, spent: 200, status: 'active',
  startDate: new Date('2025-04-01'), endDate: null,
  impressions: 5000, reach: 3000, engagement: 250, conversions: 10, clicks: 400,
  tags: null, description: null,
}

const params = { params: { id: 'camp_1' } }

const putBody = {
  name: 'Spring Campaign', objective: 'awareness', platform: 'instagram',
  budget: 1000, spent: 200, status: 'active', startDate: '2025-04-01',
  impressions: 5000, reach: 3000, engagement: 250, conversions: 10, clicks: 400,
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('PUT /api/campaigns/[id]', () => {
  it('returns 401 when not authenticated', async () => {
    vi.mocked(getApiSession).mockResolvedValue(null)
    const res = await PUT(new NextRequest('http://localhost/api/campaigns/camp_1', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(putBody),
    }), params)
    expect(res.status).toBe(401)
  })

  it('returns 404 when campaign belongs to another user', async () => {
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.campaign.findFirst).mockResolvedValue(null)
    const res = await PUT(new NextRequest('http://localhost/api/campaigns/camp_1', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(putBody),
    }), params)
    expect(res.status).toBe(404)
  })

  it('updates campaign and returns 200', async () => {
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.campaign.findFirst).mockResolvedValue(CAMPAIGN as any)
    vi.mocked(prisma.campaign.update).mockResolvedValue(CAMPAIGN as any)

    const res = await PUT(new NextRequest('http://localhost/api/campaigns/camp_1', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(putBody),
    }), params)
    expect(res.status).toBe(200)
  })

  it('parses numeric fields correctly', async () => {
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.campaign.findFirst).mockResolvedValue(CAMPAIGN as any)
    vi.mocked(prisma.campaign.update).mockResolvedValue(CAMPAIGN as any)

    await PUT(new NextRequest('http://localhost/api/campaigns/camp_1', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...putBody, budget: '1500.50', spent: '350', impressions: '6000' }),
    }), params)

    expect(prisma.campaign.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ budget: 1500.50, spent: 350, impressions: 6000 }),
    }))
  })

  it('converts startDate string to Date object', async () => {
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.campaign.findFirst).mockResolvedValue(CAMPAIGN as any)
    vi.mocked(prisma.campaign.update).mockResolvedValue(CAMPAIGN as any)

    await PUT(new NextRequest('http://localhost/api/campaigns/camp_1', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(putBody),
    }), params)

    expect(prisma.campaign.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ startDate: expect.any(Date) }),
    }))
  })
})

describe('PATCH /api/campaigns/[id]', () => {
  it('returns 401 when not authenticated', async () => {
    vi.mocked(getApiSession).mockResolvedValue(null)
    const res = await PATCH(new NextRequest('http://localhost/api/campaigns/camp_1', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'completed' }),
    }), params)
    expect(res.status).toBe(401)
  })

  it('returns 404 when campaign belongs to another user', async () => {
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.campaign.findFirst).mockResolvedValue(null)
    const res = await PATCH(new NextRequest('http://localhost/api/campaigns/camp_1', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'completed' }),
    }), params)
    expect(res.status).toBe(404)
  })

  it('applies partial update and returns 200', async () => {
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.campaign.findFirst).mockResolvedValue(CAMPAIGN as any)
    vi.mocked(prisma.campaign.update).mockResolvedValue({ ...CAMPAIGN, status: 'completed' } as any)

    const res = await PATCH(new NextRequest('http://localhost/api/campaigns/camp_1', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'completed' }),
    }), params)
    expect(res.status).toBe(200)
  })

  it('strips userId and id from update payload (privilege escalation prevention)', async () => {
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.campaign.findFirst).mockResolvedValue(CAMPAIGN as any)
    vi.mocked(prisma.campaign.update).mockResolvedValue(CAMPAIGN as any)

    await PATCH(new NextRequest('http://localhost/api/campaigns/camp_1', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'active', userId: 'attacker_id', id: 'fake_id' }),
    }), params)

    const updateCall = vi.mocked(prisma.campaign.update).mock.calls[0][0]
    expect(updateCall.data).not.toHaveProperty('userId')
    expect(updateCall.data).not.toHaveProperty('id')
    expect(updateCall.data).toMatchObject({ status: 'active' })
  })
})

describe('DELETE /api/campaigns/[id]', () => {
  it('returns 401 when not authenticated', async () => {
    vi.mocked(getApiSession).mockResolvedValue(null)
    const res = await DELETE(new NextRequest('http://localhost/api/campaigns/camp_1', { method: 'DELETE' }), params)
    expect(res.status).toBe(401)
  })

  it('returns 404 when campaign belongs to another user', async () => {
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.campaign.findFirst).mockResolvedValue(null)
    const res = await DELETE(new NextRequest('http://localhost/api/campaigns/camp_1', { method: 'DELETE' }), params)
    expect(res.status).toBe(404)
  })

  it('deletes campaign and returns success', async () => {
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.campaign.findFirst).mockResolvedValue(CAMPAIGN as any)
    vi.mocked(prisma.campaign.delete).mockResolvedValue(CAMPAIGN as any)

    const res = await DELETE(new NextRequest('http://localhost/api/campaigns/camp_1', { method: 'DELETE' }), params)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })

  it('returns 500 when DB throws', async () => {
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.campaign.findFirst).mockRejectedValue(new Error('DB error'))
    const res = await DELETE(new NextRequest('http://localhost/api/campaigns/camp_1', { method: 'DELETE' }), params)
    expect(res.status).toBe(500)
  })
})
