import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST, DELETE } from '../route'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    viralAnalysis: {
      findMany:  vi.fn(),
      create:    vi.fn(),
      findFirst: vi.fn(),
      delete:    vi.fn(),
    },
  },
}))

vi.mock('@/lib/session', () => ({
  getApiSession: vi.fn(),
}))

import { prisma } from '@/lib/prisma'
import { getApiSession } from '@/lib/session'

const SESSION = { id: 'user_1', email: 'creator@test.com', name: 'Ana' }

const FACTORS = { hookPower: 22, formatFit: 18, emotionFactor: 15, shareability: 17, trendAlignment: 10 }

function makeAnalysis(overrides = {}) {
  return {
    id:          'va_1',
    platform:    'instagram',
    format:      'Reel (7-15s)',
    hook:        'Nadie te dice esto sobre el algoritmo...',
    score:       82,
    factors:     JSON.stringify(FACTORS),
    suggestions: JSON.stringify(['¡Excelente! Alto potencial viral']),
    createdAt:   new Date(),
    ...overrides,
  }
}

function makeReq(method = 'GET', body?: unknown, url = 'http://localhost/api/viral-lab') {
  return new NextRequest(url, {
    method,
    ...(body ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}),
  })
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
})

// ─── GET ──────────────────────────────────────────────────────────────────────

describe('GET /api/viral-lab', () => {
  it('returns 401 when not authenticated', async () => {
    vi.mocked(getApiSession).mockResolvedValue(null)
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('returns empty list when no analyses', async () => {
    vi.mocked(prisma.viralAnalysis.findMany).mockResolvedValue([])
    const res  = await GET()
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.analyses).toEqual([])
  })

  it('returns list of analyses for user', async () => {
    vi.mocked(prisma.viralAnalysis.findMany).mockResolvedValue([makeAnalysis()] as any)
    const res  = await GET()
    const body = await res.json()
    expect(body.analyses).toHaveLength(1)
    expect(body.analyses[0].id).toBe('va_1')
    expect(body.analyses[0].score).toBe(82)
  })

  it('queries only user analyses', async () => {
    vi.mocked(prisma.viralAnalysis.findMany).mockResolvedValue([])
    await GET()
    expect(prisma.viralAnalysis.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: SESSION.id } })
    )
  })
})

// ─── POST ─────────────────────────────────────────────────────────────────────

describe('POST /api/viral-lab', () => {
  it('returns 401 when not authenticated', async () => {
    vi.mocked(getApiSession).mockResolvedValue(null)
    const res = await POST(makeReq('POST', {}))
    expect(res.status).toBe(401)
  })

  it('creates and returns analysis id', async () => {
    vi.mocked(prisma.viralAnalysis.create).mockResolvedValue(makeAnalysis() as any)

    const res  = await POST(makeReq('POST', {
      platform: 'instagram', format: 'Reel (7-15s)',
      hook: 'Nadie te dice esto...', score: 82,
      factors: FACTORS, suggestions: ['Excelente'],
    }))
    const body = await res.json()

    expect(res.status).toBe(201)
    expect(body.id).toBe('va_1')
  })

  it('passes userId from session to create', async () => {
    vi.mocked(prisma.viralAnalysis.create).mockResolvedValue(makeAnalysis() as any)

    await POST(makeReq('POST', {
      platform: 'tiktok', format: '', hook: 'Test hook', score: 55,
      factors: FACTORS, suggestions: [],
    }))

    expect(prisma.viralAnalysis.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ userId: SESSION.id }) })
    )
  })
})

// ─── DELETE ───────────────────────────────────────────────────────────────────

describe('DELETE /api/viral-lab', () => {
  it('returns 401 when not authenticated', async () => {
    vi.mocked(getApiSession).mockResolvedValue(null)
    const res = await DELETE(makeReq('DELETE', undefined, 'http://localhost/api/viral-lab?id=va_1'))
    expect(res.status).toBe(401)
  })

  it('returns 400 when no id param', async () => {
    const res = await DELETE(makeReq('DELETE'))
    expect(res.status).toBe(400)
  })

  it('returns 404 when analysis not found or not owned', async () => {
    vi.mocked(prisma.viralAnalysis.findFirst).mockResolvedValue(null)
    const res = await DELETE(makeReq('DELETE', undefined, 'http://localhost/api/viral-lab?id=va_999'))
    expect(res.status).toBe(404)
  })

  it('deletes analysis and returns success', async () => {
    vi.mocked(prisma.viralAnalysis.findFirst).mockResolvedValue(makeAnalysis() as any)
    vi.mocked(prisma.viralAnalysis.delete).mockResolvedValue(makeAnalysis() as any)

    const res  = await DELETE(makeReq('DELETE', undefined, 'http://localhost/api/viral-lab?id=va_1'))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(prisma.viralAnalysis.delete).toHaveBeenCalledWith({ where: { id: 'va_1' } })
  })
})
