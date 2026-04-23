import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '../route'

const { mockCreate } = vi.hoisted(() => ({ mockCreate: vi.fn() }))

vi.mock('@anthropic-ai/sdk', () => ({
  default: function MockAnthropic() {
    return { messages: { create: mockCreate } }
  },
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user:         { findUnique: vi.fn(), update: vi.fn() },
    aiUsage:      { create: vi.fn() },
    $transaction: vi.fn().mockResolvedValue([]),
  },
}))

vi.mock('@/lib/session', () => ({
  getApiSession: vi.fn(),
}))

vi.mock('@/lib/rate-limit', () => ({
  rateLimit:    vi.fn().mockResolvedValue({ ok: true, remaining: 9, retryAfter: 0 }),
  rateLimitKey: vi.fn().mockReturnValue('key'),
}))

import { prisma } from '@/lib/prisma'
import { getApiSession } from '@/lib/session'
import { rateLimit } from '@/lib/rate-limit'

const SESSION = { id: 'user_1', email: 'creator@test.com', name: 'Ana' }
const USER    = { id: 'user_1', plan: 'creator', aiUsageThisMonth: 5, aiUsageResetAt: null }

const MOCK_RESPONSE = {
  content: [{
    type: 'text',
    text: `=== FORMAT: instagram_caption ===
Hoy aprendí algo que cambió mi forma de ver el contenido... 📸 #marketing

=== FORMAT: tiktok_hook ===
Nadie te dice esto sobre crear contenido viral`,
  }],
}

function makeReq(body: unknown) {
  return new NextRequest('http://localhost/api/repurpose', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.resetAllMocks()
  mockCreate.mockResolvedValue(MOCK_RESPONSE)
  vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
  vi.mocked(prisma.user.findUnique).mockResolvedValue(USER as any)
  vi.mocked(prisma.$transaction).mockResolvedValue([])
  vi.mocked(rateLimit).mockResolvedValue({ ok: true, remaining: 9, retryAfter: 0 })
  process.env.ANTHROPIC_API_KEY = 'sk-test'
})

describe('POST /api/repurpose', () => {
  it('returns 401 when not authenticated', async () => {
    vi.mocked(getApiSession).mockResolvedValue(null)
    const res = await POST(makeReq({ sourceContent: 'text', selectedFormats: ['instagram_caption'] }))
    expect(res.status).toBe(401)
  })

  it('returns 400 when sourceContent is empty', async () => {
    const res = await POST(makeReq({ sourceContent: '', selectedFormats: ['instagram_caption'] }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when selectedFormats is empty', async () => {
    const res = await POST(makeReq({ sourceContent: 'some content', selectedFormats: [] }))
    expect(res.status).toBe(400)
  })

  it('returns 503 when ANTHROPIC_API_KEY is not set', async () => {
    delete process.env.ANTHROPIC_API_KEY
    const res = await POST(makeReq({ sourceContent: 'text', selectedFormats: ['instagram_caption'] }))
    expect(res.status).toBe(503)
  })

  it('returns parsed per-format results', async () => {
    const res  = await POST(makeReq({
      sourceContent:   'Hoy aprendí algo increíble sobre el contenido digital.',
      sourceType:      'video_script',
      selectedFormats: ['instagram_caption', 'tiktok_hook'],
    }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.results).toHaveLength(2)
    expect(body.results[0].formatId).toBe('instagram_caption')
    expect(body.results[0].content).toContain('📸')
    expect(body.results[1].formatId).toBe('tiktok_hook')
    expect(body.results[1].content).toContain('viral')
  })

  it('returns only formats present in AI response (partial result)', async () => {
    const res  = await POST(makeReq({
      sourceContent:   'Some content here.',
      sourceType:      'blog_post',
      selectedFormats: ['instagram_caption', 'tiktok_hook', 'linkedin_post'],
    }))
    const body = await res.json()

    // linkedin_post is absent from mock response, so only 2 results
    expect(res.status).toBe(200)
    expect(body.results).toHaveLength(2)
    expect(body.results.map((r: any) => r.formatId)).not.toContain('linkedin_post')
  })

  it('returns 500 when Anthropic API throws', async () => {
    mockCreate.mockRejectedValue(new Error('Rate limit exceeded'))

    const res  = await POST(makeReq({ sourceContent: 'Some content', selectedFormats: ['instagram_caption'] }))
    const body = await res.json()
    expect(res.status).toBe(500)
    expect(body.error).toContain('generar contenido')
  })

  it('returns 429 when plan limit is reached', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ ...USER, plan: 'free', aiUsageThisMonth: 10 } as any)

    const res = await POST(makeReq({ sourceContent: 'text', selectedFormats: ['instagram_caption'] }))
    expect(res.status).toBe(429)
  })

  it('calls $transaction to track AI usage after successful generation', async () => {
    await POST(makeReq({ sourceContent: 'content', selectedFormats: ['instagram_caption'] }))
    // fire-and-forget: $transaction is called without await
    await new Promise(resolve => setTimeout(resolve, 10))
    expect(prisma.$transaction).toHaveBeenCalled()
  })

  it('still returns 200 even if usage tracking throws', async () => {
    vi.mocked(prisma.$transaction).mockRejectedValue(new Error('DB down'))

    const res = await POST(makeReq({ sourceContent: 'content', selectedFormats: ['instagram_caption'] }))
    expect(res.status).toBe(200)
  })
})
