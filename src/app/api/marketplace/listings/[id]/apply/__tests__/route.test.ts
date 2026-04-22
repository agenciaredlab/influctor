import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '../route'

vi.mock('@/lib/session', () => ({ getApiSession: vi.fn() }))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    marketplaceListing: { findUnique: vi.fn(), update: vi.fn() },
    marketplaceApplication: { upsert: vi.fn() },
  },
}))

import { getApiSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'

const SESSION = { id: 'user_1', email: 'test@example.com', name: 'Test', plan: 'creator' }
const LISTING = { id: 'lst_1', status: 'open', applicantsCount: 0 }
const APPLICATION = { id: 'app_1', listingId: 'lst_1', userId: 'user_1', message: 'I am interested', proposedRate: null, portfolio: null }
const params = { params: { id: 'lst_1' } }

beforeEach(() => {
  vi.clearAllMocks()
})

describe('POST /api/marketplace/listings/[id]/apply', () => {
  it('returns 401 when not authenticated', async () => {
    vi.mocked(getApiSession).mockResolvedValue(null)
    const res = await POST(new NextRequest('http://localhost/api/marketplace/listings/lst_1/apply', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Hello' }),
    }), params)
    expect(res.status).toBe(401)
  })

  it('returns 403 when user is on free plan', async () => {
    vi.mocked(getApiSession).mockResolvedValue({ ...SESSION, plan: 'free' } as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'user_1', plan: 'free' } as any)

    const res = await POST(new NextRequest('http://localhost/api/marketplace/listings/lst_1/apply', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Hello' }),
    }), params)
    expect(res.status).toBe(403)
  })

  it('returns 404 when listing not found', async () => {
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'user_1', plan: 'creator' } as any)
    vi.mocked(prisma.marketplaceListing.findUnique).mockResolvedValue(null)

    const res = await POST(new NextRequest('http://localhost/api/marketplace/listings/lst_1/apply', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Hello' }),
    }), params)
    expect(res.status).toBe(404)
  })

  it('returns 400 when listing is closed', async () => {
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'user_1', plan: 'creator' } as any)
    vi.mocked(prisma.marketplaceListing.findUnique).mockResolvedValue({ ...LISTING, status: 'closed' } as any)

    const res = await POST(new NextRequest('http://localhost/api/marketplace/listings/lst_1/apply', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Hello' }),
    }), params)
    expect(res.status).toBe(400)
  })

  it('returns 400 when message is missing', async () => {
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'user_1', plan: 'creator' } as any)
    vi.mocked(prisma.marketplaceListing.findUnique).mockResolvedValue(LISTING as any)

    const res = await POST(new NextRequest('http://localhost/api/marketplace/listings/lst_1/apply', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    }), params)
    expect(res.status).toBe(400)
  })

  it('creates application and increments applicants count', async () => {
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'user_1', plan: 'creator' } as any)
    vi.mocked(prisma.marketplaceListing.findUnique).mockResolvedValue(LISTING as any)
    vi.mocked(prisma.marketplaceApplication.upsert).mockResolvedValue(APPLICATION as any)
    vi.mocked(prisma.marketplaceListing.update).mockResolvedValue({ ...LISTING, applicantsCount: 1 } as any)

    const res = await POST(new NextRequest('http://localhost/api/marketplace/listings/lst_1/apply', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'I am interested', proposedRate: 500 }),
    }), params)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.application.id).toBe('app_1')
    expect(prisma.marketplaceListing.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { applicantsCount: { increment: 1 } } })
    )
  })

  it('returns 409 on duplicate application', async () => {
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'user_1', plan: 'creator' } as any)
    vi.mocked(prisma.marketplaceListing.findUnique).mockResolvedValue(LISTING as any)
    const err: any = new Error('Unique constraint'); err.code = 'P2002'
    vi.mocked(prisma.marketplaceApplication.upsert).mockRejectedValue(err)

    const res = await POST(new NextRequest('http://localhost/api/marketplace/listings/lst_1/apply', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Hello again' }),
    }), params)
    expect(res.status).toBe(409)
  })
})
