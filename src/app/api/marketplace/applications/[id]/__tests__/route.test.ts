import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { OWNER_PERMS, memberSession } from '@/test-utils/team'
import { PATCH } from '../route'

vi.mock('@/lib/session', () => ({ getApiSession: vi.fn() }))

vi.mock('@/lib/config', () => ({
  getStripeSecretKey: vi.fn().mockResolvedValue(null),   // stop right after the ownership check (-> 503)
  getAppUrl:          vi.fn().mockResolvedValue('http://localhost:3000'),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    marketplaceApplication: { findUnique: vi.fn(), update: vi.fn() },
  },
}))

import { getApiSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { getStripeSecretKey } from '@/lib/config'

const OWNER = { id: 'user_1', email: 'o@x.com', name: 'O', plan: 'pro', accountId: 'user_1', permissions: OWNER_PERMS }
const params = { params: { id: 'app_1' } }
const req = () => new NextRequest('http://localhost/api/marketplace/applications/app_1', {
  method: 'PATCH', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ action: 'accept', agreedRate: 100 }),
})
const application = (postedById: string) => ({
  id: 'app_1', paymentStatus: 'none',
  listing: { id: 'lst_1', title: 'T', brandName: 'B', currency: 'USD', postedById },
  user: { id: 'creator_1', name: 'C', email: 'c@x.com' },
})

beforeEach(() => {
  vi.clearAllMocks()
})

describe('PATCH /api/marketplace/applications/[id]', () => {
  it('returns 401 when not authenticated', async () => {
    vi.mocked(getApiSession).mockResolvedValue(null)
    const res = await PATCH(req(), params)
    expect(res.status).toBe(401)
  })

  it('owner who posted the listing passes the ownership check', async () => {
    vi.mocked(getApiSession).mockResolvedValue(OWNER as any)
    vi.mocked(prisma.marketplaceApplication.findUnique).mockResolvedValue(application('user_1') as any)
    const res = await PATCH(req(), params)
    expect(res.status).toBe(503)   // got past ownership; Stripe not configured in this test
  })

  it('returns 403 when the listing was posted by someone else', async () => {
    vi.mocked(getApiSession).mockResolvedValue(OWNER as any)
    vi.mocked(prisma.marketplaceApplication.findUnique).mockResolvedValue(application('other') as any)
    const res = await PATCH(req(), params)
    expect(res.status).toBe(403)
    expect(prisma.marketplaceApplication.update).not.toHaveBeenCalled()
  })

  it('member without canManageDeals -> 403 before any DB read', async () => {
    vi.mocked(getApiSession).mockResolvedValue(memberSession({ canManageContent: true }) as any)
    const res = await PATCH(req(), params)
    expect(res.status).toBe(403)
    expect(prisma.marketplaceApplication.findUnique).not.toHaveBeenCalled()
    expect(prisma.marketplaceApplication.update).not.toHaveBeenCalled()
  })

  it('member WITH canManageDeals still gets 403 on accept: payments are owner-only (before DB and Stripe)', async () => {
    vi.mocked(getApiSession).mockResolvedValue(memberSession({ canManageDeals: true }) as any)
    const res = await PATCH(req(), params)
    const body = await res.json()
    expect(res.status).toBe(403)
    expect(body.error).toBe('Solo el dueño de la cuenta puede aceptar y pagar aplicaciones')
    expect(prisma.marketplaceApplication.findUnique).not.toHaveBeenCalled()
    expect(prisma.marketplaceApplication.update).not.toHaveBeenCalled()
    expect(getStripeSecretKey).not.toHaveBeenCalled()
  })

  it('member with every flag on is still not the owner -> 403, nothing touched', async () => {
    vi.mocked(getApiSession).mockResolvedValue(memberSession({ ...OWNER_PERMS }) as any)
    const res = await PATCH(req(), params)
    expect(res.status).toBe(403)
    expect(prisma.marketplaceApplication.findUnique).not.toHaveBeenCalled()
    expect(getStripeSecretKey).not.toHaveBeenCalled()
  })
})
