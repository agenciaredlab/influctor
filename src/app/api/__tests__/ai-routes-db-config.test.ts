import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Regression: ab-test, repurpose and competitors/research used to read
// process.env.ANTHROPIC_API_KEY directly, so an admin who configured the key
// only in Admin → Configuración de servicios (SystemConfig, DB-first) got a
// 503 on these three routes while ai/generate kept working.

const { mockCreate, anthropicKeys } = vi.hoisted(() => ({
  mockCreate: vi.fn(),
  anthropicKeys: [] as (string | undefined)[],
}))

vi.mock('@anthropic-ai/sdk', () => ({
  default: function MockAnthropic(opts: { apiKey?: string }) {
    anthropicKeys.push(opts?.apiKey)
    return { messages: { create: mockCreate } }
  },
}))

vi.mock('@/lib/config', () => ({
  getAnthropicKey:       vi.fn(),
  getInstagramAppId:     vi.fn(),
  getInstagramAppSecret: vi.fn(),
}))

vi.mock('@/lib/session', () => ({ getApiSession: vi.fn() }))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user:       { findUnique: vi.fn(), update: vi.fn() },
    aiUsage:    { create: vi.fn() },
    competitor: { findFirst: vi.fn(), findMany: vi.fn() },
    $transaction: vi.fn(),
  },
}))

vi.mock('@/lib/rate-limit', () => ({
  rateLimit:    vi.fn(),
  rateLimitKey: vi.fn().mockReturnValue('127.0.0.1:user_1'),
}))

import { getAnthropicKey, getInstagramAppId, getInstagramAppSecret } from '@/lib/config'
import { getApiSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import { POST as abTest } from '../ab-test/route'
import { POST as repurpose } from '../repurpose/route'
import { POST as research } from '../competitors/research/route'

const post = (body: unknown) =>
  new NextRequest('http://localhost/api/x', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

beforeEach(() => {
  vi.clearAllMocks()
  anthropicKeys.length = 0
  delete process.env.ANTHROPIC_API_KEY
  delete process.env.INSTAGRAM_APP_ID
  delete process.env.INSTAGRAM_APP_SECRET
  vi.mocked(getApiSession).mockResolvedValue({ id: 'user_1', email: 'a@b.c' } as any)
  vi.mocked(rateLimit).mockResolvedValue({ ok: true, remaining: 9, retryAfter: 0 })
  vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'user_1', plan: 'pro', aiUsageThisMonth: 0 } as any)
  vi.mocked(prisma.$transaction).mockResolvedValue([] as any)
  mockCreate.mockResolvedValue({ content: [{ type: 'text', text: '{}' }], usage: { input_tokens: 1, output_tokens: 1 } })
})

describe('AI routes read the Anthropic key DB-first (no process.env)', () => {
  it('ab-test does not 503 and uses the DB key', async () => {
    vi.mocked(getAnthropicKey).mockResolvedValue('db-key')
    const res = await abTest(post({ mode: 'generate', topic: 'fitness' }))
    expect(res.status).not.toBe(503)
    expect(anthropicKeys).toContain('db-key')
  })

  it('repurpose does not 503 and uses the DB key', async () => {
    vi.mocked(getAnthropicKey).mockResolvedValue('db-key')
    const res = await repurpose(post({ sourceContent: 'hola', selectedFormats: ['tweet'] }))
    expect(res.status).not.toBe(503)
    expect(anthropicKeys).toContain('db-key')
  })

  it('competitors/research does not 503 and uses the DB key', async () => {
    vi.mocked(getAnthropicKey).mockResolvedValue('db-key')
    vi.mocked(getInstagramAppId).mockResolvedValue('')
    vi.mocked(getInstagramAppSecret).mockResolvedValue('')
    const res = await research(post({ query: 'test competitor' }))
    expect(res.status).not.toBe(503)
    expect(anthropicKeys).toContain('db-key')
  })

  it.each([
    ['ab-test',              () => abTest(post({ mode: 'generate', topic: 'x' }))],
    ['repurpose',            () => repurpose(post({ sourceContent: 'hola', selectedFormats: ['tweet'] }))],
    ['competitors/research', () => research(post({ query: 'x' }))],
  ])('%s still returns 503 when the key is set neither in DB nor env', async (_name, call) => {
    vi.mocked(getAnthropicKey).mockResolvedValue('')
    const res = await call()
    expect(res.status).toBe(503)
    expect(anthropicKeys).toHaveLength(0)
  })
})
