import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '../route'

const { mockCreate } = vi.hoisted(() => ({ mockCreate: vi.fn() }))

vi.mock('@anthropic-ai/sdk', () => ({
  default: function MockAnthropic() {
    return { messages: { create: mockCreate } }
  },
}))

vi.mock('@/lib/session',     () => ({ getApiSession: vi.fn() }))
vi.mock('@/lib/email',       () => ({ sendAiLimitWarning: vi.fn().mockResolvedValue(undefined) }))

vi.mock('@/lib/rate-limit', () => ({
  rateLimit:    vi.fn().mockResolvedValue({ ok: true, remaining: 19, retryAfter: 0 }),
  rateLimitKey: vi.fn().mockReturnValue('key'),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user:    { findUnique: vi.fn(), update: vi.fn() },
    aiUsage: { create: vi.fn() },
    $transaction: vi.fn().mockResolvedValue([]),
  },
}))

import { getApiSession }       from '@/lib/session'
import { rateLimit }           from '@/lib/rate-limit'
import { prisma }              from '@/lib/prisma'
import { sendAiLimitWarning }  from '@/lib/email'

const SESSION = { id: 'user_1', email: 'test@example.com', name: 'Test', plan: 'creator' }
const USER    = { id: 'user_1', plan: 'creator', aiUsageThisMonth: 5, aiUsageResetAt: null }

function makeReq(body: unknown) {
  return new NextRequest('http://localhost/api/ai/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.resetAllMocks()
  process.env.ANTHROPIC_API_KEY = 'test-api-key'
  mockCreate.mockResolvedValue({ content: [{ type: 'text', text: 'Generated content here' }] })
  vi.mocked(rateLimit).mockResolvedValue({ ok: true, remaining: 19, retryAfter: 0 })
  vi.mocked(prisma.$transaction).mockResolvedValue([])
})

describe('POST /api/ai/generate', () => {
  it('returns 401 when not authenticated', async () => {
    vi.mocked(getApiSession).mockResolvedValue(null)
    const res = await POST(makeReq({ type: 'caption', fields: { topic: 'test' } }))
    expect(res.status).toBe(401)
  })

  it('returns 429 when rate limited', async () => {
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    vi.mocked(rateLimit).mockResolvedValue({ ok: false, remaining: 0, retryAfter: 30 })

    const res = await POST(makeReq({ type: 'caption', fields: { topic: 'test' } }))
    expect(res.status).toBe(429)
    expect(res.headers.get('Retry-After')).toBe('30')
  })

  it('returns 400 when topic is missing', async () => {
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    const res = await POST(makeReq({ type: 'caption', fields: {} }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when fields is missing', async () => {
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    const res = await POST(makeReq({ type: 'caption' }))
    expect(res.status).toBe(400)
  })

  it('returns 503 when ANTHROPIC_API_KEY is not set', async () => {
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    delete process.env.ANTHROPIC_API_KEY
    const res = await POST(makeReq({ type: 'caption', fields: { topic: 'fitness' } }))
    expect(res.status).toBe(503)
  })

  it('returns 429 when user has hit their monthly limit', async () => {
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ ...USER, plan: 'free', aiUsageThisMonth: 10 } as any)
    const res  = await POST(makeReq({ type: 'caption', fields: { topic: 'fitness' } }))
    const body = await res.json()
    expect(res.status).toBe(429)
    expect(body.limitReached).toBe(true)
  })

  it('generates content and returns result', async () => {
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue(USER as any)
    const res  = await POST(makeReq({ type: 'caption', fields: { topic: 'my fitness journey', platform: 'instagram' } }))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.result).toBe('Generated content here')
  })

  it('returns 500 when Anthropic API throws', async () => {
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue(USER as any)
    mockCreate.mockRejectedValue(new Error('Network error'))
    const res = await POST(makeReq({ type: 'caption', fields: { topic: 'test' } }))
    expect(res.status).toBe(500)
  })

  it('records AI usage after generation', async () => {
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue(USER as any)
    await POST(makeReq({ type: 'hashtags', fields: { topic: 'cooking tips', platform: 'tiktok' } }))
    expect(prisma.$transaction).toHaveBeenCalledOnce()
  })

  it('fires warning email when crossing 80% of plan limit', async () => {
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    const thisMonthReset = new Date()
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      ...USER, plan: 'creator', aiUsageThisMonth: 159, aiUsageResetAt: thisMonthReset,
    } as any)

    await POST(makeReq({ type: 'caption', fields: { topic: 'test' } }))
    expect(sendAiLimitWarning).toHaveBeenCalledOnce()
  })

  it('does not fire warning email below 80% threshold', async () => {
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    const thisMonthReset = new Date()
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      ...USER, plan: 'creator', aiUsageThisMonth: 140, aiUsageResetAt: thisMonthReset,
    } as any)

    await POST(makeReq({ type: 'caption', fields: { topic: 'test' } }))
    expect(sendAiLimitWarning).not.toHaveBeenCalled()
  })

  it('resets monthly counter when in new month', async () => {
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    const lastMonth = new Date()
    lastMonth.setMonth(lastMonth.getMonth() - 1)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      ...USER, aiUsageThisMonth: 95, aiUsageResetAt: lastMonth,
    } as any)

    const res = await POST(makeReq({ type: 'caption', fields: { topic: 'test' } }))
    expect(res.status).toBe(200)
    expect(prisma.$transaction).toHaveBeenCalled()
  })
})
