import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '../route'

// vi.hoisted ensures mockCreate is defined before the vi.mock factory runs (hoisting)
const { mockCreate } = vi.hoisted(() => ({ mockCreate: vi.fn() }))

vi.mock('@anthropic-ai/sdk', () => ({
  // Regular function required — arrow functions are not valid constructors
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
  rateLimit:    vi.fn(),
  rateLimitKey: vi.fn().mockReturnValue('127.0.0.1:user_1'),
}))

import { getApiSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'

const mockSession = { id: 'user_1', email: 'test@example.com', name: 'Test', plan: 'creator' }
const mockUser    = { id: 'user_1', plan: 'creator', aiUsageThisMonth: 0, aiUsageResetAt: new Date() }

const GENERATE_RESPONSE = {
  captionA: { text: 'Caption A 🚀 #hashtag', scores: { Claridad: 85, Hook: 72, CTA: 80, Engagement: 77, Longitud: 70 } },
  captionB: { text: 'Caption B 💡 #growth',  scores: { Claridad: 90, Hook: 88, CTA: 85, Engagement: 92, Longitud: 80 } },
  winner: 'B',
  analysis: 'Caption B is more effective due to a stronger hook.',
}

const ANALYZE_RESPONSE = {
  captionA: { scores: { Claridad: 80, Hook: 75, CTA: 70, Engagement: 78, Longitud: 72 } },
  captionB: { scores: { Claridad: 88, Hook: 90, CTA: 85, Engagement: 91, Longitud: 80 } },
  winner: 'B',
  analysis: 'Caption B wins on every dimension.',
}

function aiText(json: object) {
  return { content: [{ type: 'text', text: JSON.stringify(json) }] }
}

function makeRequest(body: object) {
  return new NextRequest('http://localhost/api/ab-test', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

beforeEach(() => {
  vi.resetAllMocks()
  mockCreate.mockResolvedValue(aiText(GENERATE_RESPONSE))
  vi.mocked(getApiSession).mockResolvedValue(mockSession as any)
  vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any)
  vi.mocked(prisma.$transaction).mockResolvedValue([] as any)
  vi.mocked(rateLimit).mockResolvedValue({ ok: true, remaining: 9, retryAfter: 0 })
  process.env.ANTHROPIC_API_KEY = 'test-key'
})

// ─── Auth & rate limiting ─────────────────────────────────────────────────────

describe('POST /api/ab-test — auth & guards', () => {
  it('returns 401 when not authenticated', async () => {
    vi.mocked(getApiSession).mockResolvedValue(null)
    const res = await POST(makeRequest({ mode: 'generate', topic: 'fitness' }))
    expect(res.status).toBe(401)
  })

  it('returns 429 with Retry-After header when rate limited', async () => {
    vi.mocked(rateLimit).mockResolvedValue({ ok: false, remaining: 0, retryAfter: 45 })
    const res = await POST(makeRequest({ mode: 'generate', topic: 'fitness' }))
    expect(res.status).toBe(429)
    expect(res.headers.get('Retry-After')).toBe('45')
    const body = await res.json()
    expect(body.error).toContain('45')
  })

  it('returns 503 when ANTHROPIC_API_KEY is missing', async () => {
    delete process.env.ANTHROPIC_API_KEY
    const res = await POST(makeRequest({ mode: 'generate', topic: 'fitness' }))
    expect(res.status).toBe(503)
  })

  it('returns 429 with limitReached when free plan is exhausted', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      ...mockUser, plan: 'free', aiUsageThisMonth: 5,
    } as any)
    const res = await POST(makeRequest({ mode: 'generate', topic: 'fitness' }))
    expect(res.status).toBe(429)
    const body = await res.json()
    expect(body.limitReached).toBe(true)
    expect(body.plan).toBe('free')
  })
})

// ─── Generate mode ────────────────────────────────────────────────────────────

describe('POST /api/ab-test — generate mode', () => {
  it('returns 400 when topic is missing', async () => {
    const res = await POST(makeRequest({ mode: 'generate' }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('topic')
  })

  it('returns 400 when topic is blank whitespace', async () => {
    const res = await POST(makeRequest({ mode: 'generate', topic: '   ' }))
    expect(res.status).toBe(400)
  })

  it('calls Anthropic and returns parsed AI response', async () => {
    const res = await POST(makeRequest({ mode: 'generate', topic: 'fitness tips', platform: 'instagram' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.winner).toBe('B')
    expect(body.captionA.text).toContain('Caption A')
    expect(body.captionB.scores.Hook).toBe(88)
    expect(body.analysis).toBeTruthy()
  })

  it('strips markdown code fences from AI response', async () => {
    const withFences = `\`\`\`json\n${JSON.stringify(GENERATE_RESPONSE)}\n\`\`\``
    mockCreate.mockResolvedValue({ content: [{ type: 'text', text: withFences }] })

    const res = await POST(makeRequest({ mode: 'generate', topic: 'fitness' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.winner).toBe('B')
  })

  it('returns 500 when AI returns unparseable JSON', async () => {
    mockCreate.mockResolvedValue({ content: [{ type: 'text', text: 'not valid {{ json' }] })

    const res = await POST(makeRequest({ mode: 'generate', topic: 'fitness' }))
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toContain('parsear')
  })

  it('returns 500 when Anthropic API throws', async () => {
    mockCreate.mockRejectedValue(new Error('Connection refused'))

    const res = await POST(makeRequest({ mode: 'generate', topic: 'fitness' }))
    expect(res.status).toBe(500)
  })
})

// ─── Analyze mode ─────────────────────────────────────────────────────────────

describe('POST /api/ab-test — analyze mode', () => {
  it('returns 400 when captionA is missing', async () => {
    const res = await POST(makeRequest({ mode: 'analyze', captionB: 'Some caption B' }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('captionA')
  })

  it('returns 400 when captionB is missing', async () => {
    const res = await POST(makeRequest({ mode: 'analyze', captionA: 'Some caption A' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when both captions are empty strings', async () => {
    const res = await POST(makeRequest({ mode: 'analyze', captionA: '', captionB: '' }))
    expect(res.status).toBe(400)
  })

  it('calls Anthropic and returns scores for both captions', async () => {
    mockCreate.mockResolvedValue(aiText(ANALYZE_RESPONSE))

    const res = await POST(makeRequest({
      mode: 'analyze',
      captionA: 'Buy now — limited offer!',
      captionB: 'Transform your life in 30 days 🚀',
      platform: 'tiktok',
    }))

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.winner).toBe('B')
    expect(body.captionA.scores.Claridad).toBe(80)
    expect(body.captionB.scores.Hook).toBe(90)
  })
})

// ─── AI usage tracking ────────────────────────────────────────────────────────

describe('POST /api/ab-test — AI usage tracking', () => {
  it('calls $transaction to track usage after successful generation', async () => {
    await POST(makeRequest({ mode: 'generate', topic: 'fitness' }))
    expect(prisma.$transaction).toHaveBeenCalled()
  })

  it('still returns 200 even if usage tracking throws', async () => {
    vi.mocked(prisma.$transaction).mockRejectedValue(new Error('DB down'))

    const res = await POST(makeRequest({ mode: 'generate', topic: 'fitness' }))
    expect(res.status).toBe(200)
  })

  it('skips limit check and still calls AI when user is not found in DB', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null)

    const res = await POST(makeRequest({ mode: 'generate', topic: 'fitness' }))
    expect(res.status).toBe(200)
    expect(mockCreate).toHaveBeenCalled()
  })

  it('pro plan bypasses AI limit despite high usage count', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      ...mockUser, plan: 'pro', aiUsageThisMonth: 999999,
    } as any)

    const res = await POST(makeRequest({ mode: 'generate', topic: 'fitness' }))
    expect(res.status).toBe(200)
  })
})
