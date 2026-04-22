import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '../route'

const { mockConstructEvent, mockRetrieve } = vi.hoisted(() => ({
  mockConstructEvent: vi.fn(),
  mockRetrieve:       vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    subscription: {
      upsert:      vi.fn(),
      updateMany:  vi.fn(),
    },
    user: {
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

const MOCK_EVENT_CREATED = {
  type: 'customer.subscription.created',
  data: {
    object: {
      id: 'sub_test',
      status: 'active',
      customer: 'cus_test',
      cancel_at_period_end: false,
      canceled_at: null,
      trial_start: null,
      trial_end: null,
      metadata: { userId: 'user_1', plan: 'creator' },
      items: { data: [{ price: { id: 'price_creator' }, current_period_start: 1700000000, current_period_end: 1702592000 }] },
    },
  },
}

const MOCK_EVENT_DELETED = {
  type: 'customer.subscription.deleted',
  data: {
    object: {
      id: 'sub_test',
      status: 'canceled',
      customer: 'cus_test',
      cancel_at_period_end: false,
      canceled_at: 1700000000,
      trial_start: null,
      trial_end: null,
      metadata: { userId: 'user_1' },
      items: { data: [{ price: { id: 'price_creator' } }] },
    },
  },
}

const MOCK_EVENT_PAYMENT_FAILED = {
  type: 'invoice.payment_failed',
  data: {
    object: {
      subscription: 'sub_test',
      subscription_details: { metadata: { userId: 'user_1' } },
      metadata: {},
    },
  },
}

vi.mock('stripe', () => {
  const StripeMock = function () {
    return {
      webhooks:      { constructEvent: mockConstructEvent },
      subscriptions: { retrieve: mockRetrieve },
    }
  }
  return { default: StripeMock }
})

import { prisma } from '@/lib/prisma'

function makeReq(body: string, sig?: string) {
  return new NextRequest('http://localhost/api/stripe/webhook', {
    method: 'POST',
    headers: sig ? { 'stripe-signature': sig } : {},
    body,
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.STRIPE_SECRET_KEY     = 'sk_test_key'
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test'
  process.env.STRIPE_PRICE_CREATOR  = 'price_creator'
  process.env.STRIPE_PRICE_PRO      = 'price_pro'
  vi.mocked(prisma.$transaction).mockResolvedValue([])
  vi.mocked(prisma.user.update).mockResolvedValue({} as any)
  vi.mocked(prisma.subscription.updateMany).mockResolvedValue({ count: 1 })
})

describe('POST /api/stripe/webhook', () => {
  it('returns 503 when STRIPE_SECRET_KEY is not set', async () => {
    delete process.env.STRIPE_SECRET_KEY
    const res = await POST(makeReq('{}'))
    expect(res.status).toBe(503)
  })

  it('returns 400 when signature verification fails', async () => {
    mockConstructEvent.mockImplementation(() => {
      throw new Error('Invalid signature')
    })

    const res = await POST(makeReq('{}', 'bad-sig'))
    expect(res.status).toBe(400)
  })

  it('processes event without signature in dev mode', async () => {
    delete process.env.STRIPE_WEBHOOK_SECRET
    const body = JSON.stringify(MOCK_EVENT_CREATED)

    const res = await POST(makeReq(body))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.received).toBe(true)
  })

  it('processes subscription.created and upserts plan', async () => {
    delete process.env.STRIPE_WEBHOOK_SECRET
    const body = JSON.stringify(MOCK_EVENT_CREATED)

    await POST(makeReq(body))

    expect(prisma.$transaction).toHaveBeenCalledOnce()
    const [ops] = vi.mocked(prisma.$transaction).mock.calls[0]
    expect(ops).toHaveLength(2)
  })

  it('processes subscription.deleted and resets user to free', async () => {
    delete process.env.STRIPE_WEBHOOK_SECRET
    const body = JSON.stringify(MOCK_EVENT_DELETED)

    await POST(makeReq(body))

    expect(prisma.$transaction).toHaveBeenCalledOnce()
  })

  it('processes invoice.payment_failed and sets past_due status', async () => {
    delete process.env.STRIPE_WEBHOOK_SECRET
    const body = JSON.stringify(MOCK_EVENT_PAYMENT_FAILED)

    await POST(makeReq(body))

    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { planStatus: 'past_due' } })
    )
  })

  it('returns received:true on success', async () => {
    delete process.env.STRIPE_WEBHOOK_SECRET
    const body = JSON.stringify({ type: 'unknown.event', data: { object: {} } })

    const res = await POST(makeReq(body))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.received).toBe(true)
  })
})

describe('invoice.payment_succeeded (via webhook)', () => {
  it('retrieves subscription and upserts when payment succeeds', async () => {
    delete process.env.STRIPE_WEBHOOK_SECRET
    const event = {
      type: 'invoice.payment_succeeded',
      data: { object: { subscription: 'sub_test', subscription_details: { metadata: {} }, metadata: {} } },
    }
    mockRetrieve.mockResolvedValue({
      ...MOCK_EVENT_CREATED.data.object,
      items: { data: [{ price: { id: 'price_creator' }, current_period_start: 1700000000, current_period_end: 1702592000 }] },
    })

    await POST(makeReq(JSON.stringify(event)))
    expect(mockRetrieve).toHaveBeenCalledWith('sub_test', { expand: ['items.data'] })
    expect(prisma.$transaction).toHaveBeenCalled()
  })
})
