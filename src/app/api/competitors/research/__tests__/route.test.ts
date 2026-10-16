import { describe, it, expect, vi, beforeEach } from 'vitest'
import { OWNER_PERMS, NO_PERMS, memberSession } from '@/test-utils/team'
import { NextRequest } from 'next/server'
import { POST } from '../route'

const { mockCreate } = vi.hoisted(() => ({ mockCreate: vi.fn() }))

vi.mock('@anthropic-ai/sdk', () => ({
  default: function MockAnthropic() {
    return { messages: { create: mockCreate } }
  },
}))

vi.mock('@/lib/session', () => ({ getApiSession: vi.fn() }))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user:    { findUnique: vi.fn(), update: vi.fn() },
    aiUsage: { create: vi.fn() },
    $transaction: vi.fn(),
  },
}))

vi.mock('@/lib/rate-limit', () => ({
  rateLimit:    vi.fn().mockResolvedValue({ ok: true, remaining: 4, retryAfter: 0 }),
  rateLimitKey: vi.fn().mockReturnValue('key'),
}))

import { getApiSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'

const SESSION = { id: 'user_1', email: 'test@example.com', name: 'Test', plan: 'free', accountId: 'user_1', permissions: OWNER_PERMS }

const mockUser = { id: 'user_1', plan: 'free', aiUsageThisMonth: 0, aiUsageResetAt: new Date() }

const AI_RESULT = {
  found: true,
  companyName: 'Nike',
  website: 'nike.com',
  description: 'Global sportswear brand',
  profiles: [
    { platform: 'instagram', handle: '@nike', profileUrl: 'https://instagram.com/nike', estimatedFollowers: 300000000, followersNote: 'as of 2024' },
  ],
}

function makeReq(body: unknown) {
  return new NextRequest('http://localhost/api/competitors/research', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(rateLimit).mockResolvedValue({ ok: true, remaining: 4, retryAfter: 0 })
  vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
  vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any)
  vi.mocked(prisma.$transaction).mockResolvedValue([] as any)
  mockCreate.mockResolvedValue({
    content: [{ type: 'text', text: JSON.stringify(AI_RESULT) }],
  })
  process.env.ANTHROPIC_API_KEY = 'sk-test'
})

describe('POST /api/competitors/research', () => {
  it('returns 401 when not authenticated', async () => {
    vi.mocked(getApiSession).mockResolvedValue(null)
    const res = await POST(makeReq({ query: 'Nike' }))
    expect(res.status).toBe(401)
  })

  it('returns 429 when rate limited', async () => {
    vi.mocked(rateLimit).mockResolvedValue({ ok: false, remaining: 0, retryAfter: 55 })
    const res = await POST(makeReq({ query: 'Nike' }))
    expect(res.status).toBe(429)
  })

  it('returns 503 when ANTHROPIC_API_KEY is missing', async () => {
    delete process.env.ANTHROPIC_API_KEY
    const res = await POST(makeReq({ query: 'Nike' }))
    expect(res.status).toBe(503)
  })

  it('returns 400 when query is empty', async () => {
    const res = await POST(makeReq({ query: '   ' }))
    expect(res.status).toBe(400)
  })

  it('returns research results for valid query', async () => {
    const res = await POST(makeReq({ query: 'Nike' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.found).toBe(true)
    expect(body.companyName).toBe('Nike')
    expect(body.profiles).toHaveLength(1)
    expect(body.profiles[0].platform).toBe('instagram')
  })

  it('returns found=false when brand is unknown', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: JSON.stringify({ found: false }) }],
    })
    const res  = await POST(makeReq({ query: 'UnknownBrandXYZ123' }))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.found).toBe(false)
  })

  it('returns 500 when Anthropic API throws', async () => {
    mockCreate.mockRejectedValue(new Error('Rate limit exceeded'))
    const res  = await POST(makeReq({ query: 'Nike' }))
    const body = await res.json()
    expect(res.status).toBe(500)
    expect(body.error).toContain('investigar')
  })

  it('returns 500 when AI response is not valid JSON', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: 'not json at all' }],
    })
    const res = await POST(makeReq({ query: 'Nike' }))
    expect(res.status).toBe(500)
  })
})

describe('POST /api/competitors/research — plan AI limit gating', () => {
  it('returns 429 with limitReached when free plan is at its limit, and does not call Anthropic', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      ...mockUser, plan: 'free', aiUsageThisMonth: 5,
    } as any)

    const res = await POST(makeReq({ query: 'Nike' }))
    expect(res.status).toBe(429)
    const body = await res.json()
    expect(body.limitReached).toBe(true)
    expect(body.plan).toBe('free')
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('allows the request and tracks usage when the user is under the limit', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      ...mockUser, plan: 'free', aiUsageThisMonth: 2,
    } as any)

    const res = await POST(makeReq({ query: 'Nike' }))
    expect(res.status).toBe(200)
    expect(mockCreate).toHaveBeenCalled()
    expect(prisma.$transaction).toHaveBeenCalled()
  })

  it('tracks usage even when the brand is not found (found: false still cost an AI call)', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      ...mockUser, plan: 'free', aiUsageThisMonth: 2,
    } as any)
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: JSON.stringify({ found: false }) }],
    })

    const res = await POST(makeReq({ query: 'UnknownBrandXYZ123' }))
    expect(res.status).toBe(200)
    expect(prisma.$transaction).toHaveBeenCalled()
  })

  it('does not track usage when the AI response is unparseable', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      ...mockUser, plan: 'free', aiUsageThisMonth: 2,
    } as any)
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: 'not json at all' }],
    })

    const res = await POST(makeReq({ query: 'Nike' }))
    expect(res.status).toBe(500)
    expect(prisma.$transaction).not.toHaveBeenCalled()
  })

  it('pro plan (unlimited) bypasses the limit despite high usage', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      ...mockUser, plan: 'pro', aiUsageThisMonth: 999999,
    } as any)

    const res = await POST(makeReq({ query: 'Nike' }))
    expect(res.status).toBe(200)
    expect(mockCreate).toHaveBeenCalled()
  })
})

describe('team member — shared AI quota (competitors/research)', () => {
  it('without canUseAI -> 403 before anything else (no rate limit, no owner read, no AI call, no usage)', async () => {
    vi.mocked(getApiSession).mockResolvedValue(memberSession({ canManageContent: true }) as any)
    const res = await POST(makeReq({ query: 'Nike' }))
    expect(res.status).toBe(403)
    expect(rateLimit).not.toHaveBeenCalled()
    expect(prisma.user.findUnique).not.toHaveBeenCalled()
    expect(mockCreate).not.toHaveBeenCalled()
    expect(prisma.user.update).not.toHaveBeenCalled()
    expect(prisma.aiUsage.create).not.toHaveBeenCalled()
    expect(prisma.$transaction).not.toHaveBeenCalled()
  })

  it('spends the OWNER counter and logs AiUsage under the owner (not the member)', async () => {
    vi.mocked(getApiSession).mockResolvedValue(memberSession({ canUseAI: true }, { plan: 'free' }) as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue(
      { id: 'owner_1', email: 'owner@example.com', name: 'Owner', plan: 'pro', aiUsageThisMonth: 7, aiUsageResetAt: new Date() } as any
    )
    const res = await POST(makeReq({ query: 'Nike' }))
    expect(res.status).toBe(200)
    expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: 'owner_1' } })
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'owner_1' }, data: expect.objectContaining({ aiUsageThisMonth: { increment: 1 } }) })
    )
    expect(prisma.aiUsage.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ userId: 'owner_1' }) })
    )
    // nothing is ever charged to the member's own user row
    for (const c of vi.mocked(prisma.user.update).mock.calls) {
      expect((c[0] as any).where.id).not.toBe('member_1')
    }
  })

  it('monthly reset is applied to the OWNER row', async () => {
    vi.mocked(getApiSession).mockResolvedValue(memberSession({ canUseAI: true }) as any)
    const lastMonth = new Date(); lastMonth.setMonth(lastMonth.getMonth() - 1)
    vi.mocked(prisma.user.findUnique).mockResolvedValue(
      { id: 'owner_1', email: 'o@x.com', name: 'O', plan: 'creator', aiUsageThisMonth: 150, aiUsageResetAt: lastMonth } as any
    )
    const res = await POST(makeReq({ query: 'Nike' }))
    expect(res.status).toBe(200)
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'owner_1' }, data: expect.objectContaining({ aiUsageThisMonth: 1 }) })
    )
  })

  it('limit comes from the OWNER plan: owner free at limit -> 429 even if member session says pro', async () => {
    vi.mocked(getApiSession).mockResolvedValue(memberSession({ canUseAI: true }, { plan: 'pro' }) as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue(
      { id: 'owner_1', email: 'o@x.com', name: 'O', plan: 'free', aiUsageThisMonth: 999, aiUsageResetAt: new Date() } as any
    )
    const res = await POST(makeReq({ query: 'Nike' }))
    const body = await res.json()
    expect(res.status).toBe(429)
    expect(body.limitReached).toBe(true)
    expect(body.plan).toBe('free')
    expect(mockCreate).not.toHaveBeenCalled()
    expect(prisma.user.update).not.toHaveBeenCalled()
  })

  it('limit comes from the OWNER plan: owner pro (unlimited) -> allowed even if member session says free', async () => {
    vi.mocked(getApiSession).mockResolvedValue(memberSession({ canUseAI: true }, { plan: 'free' }) as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue(
      { id: 'owner_1', email: 'o@x.com', name: 'O', plan: 'pro', aiUsageThisMonth: 5000, aiUsageResetAt: new Date() } as any
    )
    const res = await POST(makeReq({ query: 'Nike' }))
    expect(res.status).toBe(200)
  })
})

describe('fail-closed when the account owner row is missing (competitors/research)', () => {
  it('returns 404 and neither calls Anthropic nor tracks usage', async () => {
    vi.mocked(getApiSession).mockResolvedValue(memberSession({ canUseAI: true }) as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null)
    const res = await POST(makeReq({ query: 'Nike' }))
    expect(res.status).toBe(404)
    expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: 'owner_1' } })
    expect(mockCreate).not.toHaveBeenCalled()
    expect(prisma.$transaction).not.toHaveBeenCalled()
    expect(prisma.aiUsage.create).not.toHaveBeenCalled()
    expect(prisma.user.update).not.toHaveBeenCalled()
  })
})
