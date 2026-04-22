import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '../route'

vi.mock('@/lib/session', () => ({ getApiSession: vi.fn() }))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
  },
}))

vi.mock('stripe', () => {
  const StripeMock = function () {
    return {
      billingPortal: {
        sessions: {
          create: vi.fn().mockResolvedValue({ url: 'https://billing.stripe.com/session/bps_test' }),
        },
      },
    }
  }
  return { default: StripeMock }
})

import { getApiSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'

const SESSION = { id: 'user_1', email: 'test@example.com', name: 'Test', plan: 'creator' }

function makeReq() {
  return new NextRequest('http://localhost/api/stripe/portal', { method: 'POST' })
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.STRIPE_SECRET_KEY = 'sk_test_key'
})

describe('POST /api/stripe/portal', () => {
  it('returns 503 when STRIPE_SECRET_KEY is not set', async () => {
    delete process.env.STRIPE_SECRET_KEY
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

    const res = await POST(makeReq())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.url).toContain('stripe.com')
  })
})
