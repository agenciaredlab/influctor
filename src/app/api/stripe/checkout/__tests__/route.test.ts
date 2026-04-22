import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '../route'

vi.mock('@/lib/session', () => ({ getApiSession: vi.fn() }))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn(), update: vi.fn() },
  },
}))

vi.mock('@/lib/plans', () => ({
  PLANS: {
    creator: { name: 'Creator', priceId: 'price_creator' },
    pro:     { name: 'Pro',     priceId: 'price_pro' },
    free:    { name: 'Free',    priceId: null },
  },
}))

vi.mock('stripe', () => {
  const StripeMock = function () {
    return {
      customers: {
        create: vi.fn().mockResolvedValue({ id: 'cus_test123' }),
      },
      checkout: {
        sessions: {
          create: vi.fn().mockResolvedValue({ url: 'https://checkout.stripe.com/pay/cs_test' }),
        },
      },
    }
  }
  return { default: StripeMock }
})

import { getApiSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'

const SESSION = { id: 'user_1', email: 'test@example.com', name: 'Test', plan: 'free' }
const USER    = { id: 'user_1', email: 'test@example.com', name: 'Test', plan: 'free', stripeCustomerId: null }

function makeReq(body: unknown) {
  return new NextRequest('http://localhost/api/stripe/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.STRIPE_SECRET_KEY = 'sk_test_key'
})

describe('POST /api/stripe/checkout', () => {
  it('returns 401 when not authenticated', async () => {
    vi.mocked(getApiSession).mockResolvedValue(null)
    const res = await POST(makeReq({ planId: 'creator' }))
    expect(res.status).toBe(401)
  })

  it('returns 400 when planId is free', async () => {
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    const res = await POST(makeReq({ planId: 'free' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when planId is missing', async () => {
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    const res = await POST(makeReq({}))
    expect(res.status).toBe(400)
  })

  it('returns 503 when STRIPE_SECRET_KEY is not configured', async () => {
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    delete process.env.STRIPE_SECRET_KEY

    const res = await POST(makeReq({ planId: 'creator' }))
    expect(res.status).toBe(503)
  })

  it('returns checkout URL for creator plan', async () => {
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue(USER as any)
    vi.mocked(prisma.user.update).mockResolvedValue({ ...USER, stripeCustomerId: 'cus_test123' } as any)

    const res = await POST(makeReq({ planId: 'creator' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.url).toContain('stripe.com')
  })

  it('reuses existing stripeCustomerId without creating new customer', async () => {
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ ...USER, stripeCustomerId: 'cus_existing' } as any)

    const Stripe = await import('stripe')
    const stripeInstance = new (Stripe.default as any)()

    await POST(makeReq({ planId: 'creator' }))
    expect(stripeInstance.customers.create).not.toHaveBeenCalled()
  })
})
