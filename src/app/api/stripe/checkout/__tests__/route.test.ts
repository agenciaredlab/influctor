import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '../route'

const { mockCreateCustomer, mockCreateSession } = vi.hoisted(() => ({
  mockCreateCustomer: vi.fn(),
  mockCreateSession:  vi.fn(),
}))

vi.mock('stripe', () => ({
  default: function MockStripe() {
    return {
      customers: { create: mockCreateCustomer },
      checkout:  { sessions: { create: mockCreateSession } },
    }
  },
}))

vi.mock('@/lib/session', () => ({ getApiSession: vi.fn() }))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn(), update: vi.fn() },
  },
}))

vi.mock('@/lib/config', () => ({
  getStripeSecretKey:    vi.fn(),
  getStripePriceCreator: vi.fn(),
  getStripePricePro:     vi.fn(),
  getAppUrl:             vi.fn().mockResolvedValue('http://localhost:3000'),
}))

import { getApiSession }                                from '@/lib/session'
import { prisma }                                       from '@/lib/prisma'
import { getStripeSecretKey, getStripePriceCreator, getStripePricePro } from '@/lib/config'

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
  vi.resetAllMocks()
  vi.mocked(getStripeSecretKey).mockResolvedValue('sk_test_key')
  vi.mocked(getStripePriceCreator).mockResolvedValue('price_creator')
  vi.mocked(getStripePricePro).mockResolvedValue('price_pro')
  mockCreateCustomer.mockResolvedValue({ id: 'cus_test123' })
  mockCreateSession.mockResolvedValue({ url: 'https://checkout.stripe.com/pay/cs_test' })
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

  it('returns 503 when Stripe key is not configured', async () => {
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    vi.mocked(getStripeSecretKey).mockResolvedValue('')
    const res = await POST(makeReq({ planId: 'creator' }))
    expect(res.status).toBe(503)
  })

  it('returns 503 when price ID is not configured', async () => {
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    vi.mocked(getStripePriceCreator).mockResolvedValue('')
    const res = await POST(makeReq({ planId: 'creator' }))
    expect(res.status).toBe(503)
  })

  it('returns checkout URL for creator plan', async () => {
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue(USER as any)
    vi.mocked(prisma.user.update).mockResolvedValue({ ...USER, stripeCustomerId: 'cus_test123' } as any)

    const res  = await POST(makeReq({ planId: 'creator' }))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.url).toContain('stripe.com')
  })

  it('creates a new Stripe customer when none exists', async () => {
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue(USER as any)
    vi.mocked(prisma.user.update).mockResolvedValue({ ...USER, stripeCustomerId: 'cus_test123' } as any)

    await POST(makeReq({ planId: 'creator' }))
    expect(mockCreateCustomer).toHaveBeenCalledOnce()
    expect(mockCreateCustomer).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'test@example.com', metadata: { userId: 'user_1' } })
    )
  })

  it('reuses existing stripeCustomerId without creating new customer', async () => {
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ ...USER, stripeCustomerId: 'cus_existing' } as any)

    await POST(makeReq({ planId: 'creator' }))
    expect(mockCreateCustomer).not.toHaveBeenCalled()
    expect(mockCreateSession).toHaveBeenCalledWith(
      expect.objectContaining({ customer: 'cus_existing' })
    )
  })
})
