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
import { prisma }             from '@/lib/prisma'
import { getStripeSecretKey } from '@/lib/config'

const SESSION = { id: 'user_1', email: 'test@example.com', name: 'Test', plan: 'creator' }

function makeReq() {
  return new NextRequest('http://localhost/api/stripe/portal', { method: 'POST' })
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(getStripeSecretKey).mockResolvedValue('sk_test_key')
  mockCreatePortalSession.mockResolvedValue({ url: 'https://billing.stripe.com/session/bps_test' })
})

describe('POST /api/stripe/portal', () => {
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
