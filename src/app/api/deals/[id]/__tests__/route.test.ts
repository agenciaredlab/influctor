import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { PUT, PATCH, DELETE } from '../route'

vi.mock('@/lib/session', () => ({ getApiSession: vi.fn() }))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    brandDeal: {
      findFirst: vi.fn(),
      update:    vi.fn(),
      delete:    vi.fn(),
    },
  },
}))

vi.mock('@/lib/email', () => ({ sendDealStageNotification: vi.fn().mockReturnValue(null) }))

import { getApiSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { sendDealStageNotification } from '@/lib/email'

const SESSION = { id: 'user_1', email: 'test@example.com', name: 'Test', plan: 'free' }

const DEAL = {
  id: 'deal_1', userId: 'user_1', brand: 'Nike', contact: null, email: null,
  phone: null, platform: 'instagram', type: 'sponsored_post', stage: 'negotiation',
  value: 2000, commissionPct: null, currency: 'USD',
  dueDate: null, description: null, deliverables: null, notes: null, tags: null, niche: null,
  createdAt: new Date(), updatedAt: new Date(),
}

const params = { params: { id: 'deal_1' } }

const putBody = {
  brand: 'Nike', platform: 'instagram', type: 'sponsored_post', stage: 'negotiation',
  value: 2000,
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('PUT /api/deals/[id]', () => {
  it('returns 401 when not authenticated', async () => {
    vi.mocked(getApiSession).mockResolvedValue(null)
    const res = await PUT(new NextRequest('http://localhost/api/deals/deal_1', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(putBody),
    }), params)
    expect(res.status).toBe(401)
  })

  it('returns 404 when deal belongs to another user', async () => {
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.brandDeal.findFirst).mockResolvedValue(null)
    const res = await PUT(new NextRequest('http://localhost/api/deals/deal_1', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(putBody),
    }), params)
    expect(res.status).toBe(404)
  })

  it('updates deal and returns 200', async () => {
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.brandDeal.findFirst).mockResolvedValue(DEAL as any)
    vi.mocked(prisma.brandDeal.update).mockResolvedValue(DEAL as any)

    const res = await PUT(new NextRequest('http://localhost/api/deals/deal_1', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(putBody),
    }), params)
    expect(res.status).toBe(200)
  })

  it('sends stage notification when stage changes', async () => {
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.brandDeal.findFirst).mockResolvedValue({ ...DEAL, stage: 'outreach' } as any)
    vi.mocked(prisma.brandDeal.update).mockResolvedValue({ ...DEAL, stage: 'negotiation' } as any)

    await PUT(new NextRequest('http://localhost/api/deals/deal_1', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...putBody, stage: 'negotiation' }),
    }), params)

    expect(sendDealStageNotification).toHaveBeenCalledWith(expect.objectContaining({
      oldStage: 'outreach',
      newStage: 'negotiation',
      brand: 'Nike',
      userEmail: 'test@example.com',
    }))
  })

  it('does NOT send notification when stage is unchanged', async () => {
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.brandDeal.findFirst).mockResolvedValue(DEAL as any)
    vi.mocked(prisma.brandDeal.update).mockResolvedValue(DEAL as any)

    await PUT(new NextRequest('http://localhost/api/deals/deal_1', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(putBody),
    }), params)

    expect(sendDealStageNotification).not.toHaveBeenCalled()
  })
})

describe('PATCH /api/deals/[id]', () => {
  it('returns 401 when not authenticated', async () => {
    vi.mocked(getApiSession).mockResolvedValue(null)
    const res = await PATCH(new NextRequest('http://localhost/api/deals/deal_1', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage: 'signed' }),
    }), params)
    expect(res.status).toBe(401)
  })

  it('returns 404 when deal belongs to another user', async () => {
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.brandDeal.findFirst).mockResolvedValue(null)
    const res = await PATCH(new NextRequest('http://localhost/api/deals/deal_1', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage: 'signed' }),
    }), params)
    expect(res.status).toBe(404)
  })

  it('applies partial update and fires stage notification', async () => {
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.brandDeal.findFirst).mockResolvedValue(DEAL as any)
    vi.mocked(prisma.brandDeal.update).mockResolvedValue({ ...DEAL, stage: 'signed' } as any)

    const res = await PATCH(new NextRequest('http://localhost/api/deals/deal_1', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage: 'signed' }),
    }), params)
    expect(res.status).toBe(200)
    expect(sendDealStageNotification).toHaveBeenCalledWith(expect.objectContaining({
      oldStage: 'negotiation',
      newStage: 'signed',
    }))
  })
})

describe('DELETE /api/deals/[id]', () => {
  it('returns 401 when not authenticated', async () => {
    vi.mocked(getApiSession).mockResolvedValue(null)
    const res = await DELETE(new NextRequest('http://localhost/api/deals/deal_1', { method: 'DELETE' }), params)
    expect(res.status).toBe(401)
  })

  it('returns 404 when deal belongs to another user', async () => {
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.brandDeal.findFirst).mockResolvedValue(null)
    const res = await DELETE(new NextRequest('http://localhost/api/deals/deal_1', { method: 'DELETE' }), params)
    expect(res.status).toBe(404)
  })

  it('deletes deal and returns success', async () => {
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.brandDeal.findFirst).mockResolvedValue(DEAL as any)
    vi.mocked(prisma.brandDeal.delete).mockResolvedValue(DEAL as any)

    const res = await DELETE(new NextRequest('http://localhost/api/deals/deal_1', { method: 'DELETE' }), params)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })

  it('only deletes the specific deal by id', async () => {
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.brandDeal.findFirst).mockResolvedValue(DEAL as any)
    vi.mocked(prisma.brandDeal.delete).mockResolvedValue(DEAL as any)

    await DELETE(new NextRequest('http://localhost/api/deals/deal_1', { method: 'DELETE' }), params)
    expect(prisma.brandDeal.delete).toHaveBeenCalledWith({ where: { id: 'deal_1' } })
  })
})
