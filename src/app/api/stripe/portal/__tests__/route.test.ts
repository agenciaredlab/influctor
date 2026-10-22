import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '../route'

const { mockCreatePortalSession } = vi.hoisted(() => ({
  mockCreatePortalSession: vi.fn(),
}))

vi.mock('stripe', () => ({
  default: function MockStripe() {
    return {
      billingPortal: { sessions: { create: mockCreatePortalSession } },
    }
  },
}))

vi.mock('@/lib/session', () => ({ getApiSession: vi.fn() }))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
  },
}))

vi.mock('@/lib/config', () => ({
  getStripeSecretKey: vi.fn(),
  getAppUrl:          vi.fn().mockResolvedValue('http://localhost:3000'),
}))

import { getApiSession }      from '@/lib/session'
import { memberSession }      from '@/test-utils/team'
import { prisma }             from '@/lib/prisma'
import { getStripeSecretKey } from '@/lib/config'

const SESSION = { id: 'user_1', email: 'test@example.com', name: 'Test', plan: 'creator', accountId: 'user_1' }

function makeReq() {
  return new NextRequest('http://localhost/api/stripe/portal', { method: 'POST' })
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(getStripeSecretKey).mockResolvedValue('sk_test_key')
  mockCreatePortalSession.mockResolvedValue({ url: 'https://billing.stripe.com/session/bps_test' })
})

describe('POST /api/stripe/portal', () => {
  it('returns 403 for a team member even with every permission ticked, and touches nothing', async () => {
    vi.mocked(getApiSession).mockResolvedValue(memberSession({
      canManageContent: true, canManageDeals: true, canManageCompetitors: true,
      canConnectSocialAccounts: true, canUseAI: true, canViewIncome: true,
    }) as any)
    const res = await POST(makeReq())
    expect(res.status).toBe(403)
    expect(await res.json()).toEqual({ error: 'Solo el dueño de la cuenta puede gestionar el plan y la facturación' })
    expect(getStripeSecretKey).not.toHaveBeenCalled()
    expect(prisma.user.findUnique).not.toHaveBeenCalled()
    expect(mockCreatePortalSession).not.toHaveBeenCalled()
  })

  it('checks session before Stripe config: unauthenticated gets 401 even when Stripe is not configured', async () => {
    vi.mocked(getStripeSecretKey).mockResolvedValue('')
    vi.mocked(getApiSession).mockResolvedValue(null)
    const res = await POST(makeReq())
    expect(res.status).toBe(401)
  })

  it('returns 503 when Stripe key is not set', async () => {
    vi.mocked(getStripeSecretKey).mockResolvedValue('')
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    const res = await POST(makeReq())
    expect(res.status).toBe(503)
  })

  it('returns 401 when not authenticated', async () => {
    vi.mocked(getApiSession).mockResolvedValue(null)
    const res = await POST(makeReq())
    expect(res.status).toBe(401)
  })

  it('returns 404 when user has no stripeCustomerId', async () => {
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'user_1', stripeCustomerId: null } as any)
    const res = await POST(makeReq())
    expect(res.status).toBe(404)
  })

  it('returns billing portal URL for subscribed user', async () => {
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'user_1', stripeCustomerId: 'cus_123' } as any)

    const res  = await POST(makeReq())
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.url).toContain('stripe.com')
  })

  it('passes the correct customer ID to the portal session', async () => {
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'user_1', stripeCustomerId: 'cus_abc' } as any)

    await POST(makeReq())
    expect(mockCreatePortalSession).toHaveBeenCalledWith(
      expect.objectContaining({ customer: 'cus_abc' })
    )
  })
})
