import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from '../route'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    contract: { findMany: vi.fn(), create: vi.fn() },
    user:     { findUnique: vi.fn() },
  },
}))

vi.mock('@/lib/session', () => ({
  getApiSession: vi.fn(),
}))

vi.mock('@/lib/plans', () => ({
  getPlan: vi.fn(),
}))

import { prisma } from '@/lib/prisma'
import { getApiSession } from '@/lib/session'
import { getPlan } from '@/lib/plans'

const SESSION = { id: 'user_1', email: 'creator@example.com', name: 'Ana' }
const CREATOR_PLAN = { name: 'Creator', limits: { canAccessContracts: true } }
const FREE_PLAN    = { name: 'Free',    limits: { canAccessContracts: false } }

function jsonReq(body: unknown) {
  return new NextRequest('http://localhost/api/contracts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
  vi.mocked(getPlan).mockReturnValue(CREATOR_PLAN as any)
  vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'user_1', plan: 'creator' } as any)
})

// ─── GET ─────────────────────────────────────────────────────────────────────

describe('GET /api/contracts', () => {
  it('returns 401 when not authenticated', async () => {
    vi.mocked(getApiSession).mockResolvedValue(null)
    const res = await GET(new NextRequest('http://localhost/api/contracts'))
    expect(res.status).toBe(401)
  })

  it('returns list of contracts for the user', async () => {
    const contracts = [
      { id: 'c1', title: 'Nike Deal', type: 'sponsored', createdAt: new Date('2025-01-01') },
      { id: 'c2', title: 'Adidas',    type: 'ambassador', createdAt: new Date('2025-01-02') },
    ]
    vi.mocked(prisma.contract.findMany).mockResolvedValue(contracts as any)

    const res  = await GET(new NextRequest('http://localhost/api/contracts'))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body).toHaveLength(2)
    expect(body[0].title).toBe('Nike Deal')
  })

  it('queries only the authenticated user contracts', async () => {
    vi.mocked(prisma.contract.findMany).mockResolvedValue([])
    await GET(new NextRequest('http://localhost/api/contracts'))
    expect(prisma.contract.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'user_1' } })
    )
  })
})

// ─── POST ─────────────────────────────────────────────────────────────────────

describe('POST /api/contracts', () => {
  it('returns 401 when not authenticated', async () => {
    vi.mocked(getApiSession).mockResolvedValue(null)
    const res = await POST(jsonReq({ title: 'Test', type: 'sponsored', content: 'text' }))
    expect(res.status).toBe(401)
  })

  it('returns 403 for free plan users', async () => {
    vi.mocked(getPlan).mockReturnValue(FREE_PLAN as any)
    const res = await POST(jsonReq({ title: 'Test', type: 'sponsored', content: 'text' }))
    expect(res.status).toBe(403)
  })

  it('returns 400 when title is missing', async () => {
    const res = await POST(jsonReq({ type: 'sponsored', content: 'text' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when content is missing', async () => {
    const res = await POST(jsonReq({ title: 'My Contract', type: 'sponsored' }))
    expect(res.status).toBe(400)
  })

  it('creates contract and returns 201', async () => {
    const created = { id: 'c1', title: 'Nike Deal', type: 'sponsored', createdAt: new Date() }
    vi.mocked(prisma.contract.create).mockResolvedValue(created as any)

    const res  = await POST(jsonReq({ title: 'Nike Deal', type: 'sponsored', content: 'CONTRACT TEXT', fields: {} }))
    const body = await res.json()
    expect(res.status).toBe(201)
    expect(body.id).toBe('c1')
  })

  it('stores userId from session', async () => {
    vi.mocked(prisma.contract.create).mockResolvedValue({ id: 'c1' } as any)
    await POST(jsonReq({ title: 'Test', type: 'ugc', content: 'text', fields: {} }))
    expect(prisma.contract.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ userId: 'user_1' }) })
    )
  })

  it('serialises fields object to JSON string', async () => {
    vi.mocked(prisma.contract.create).mockResolvedValue({ id: 'c1' } as any)
    await POST(jsonReq({
      title: 'Test', type: 'sponsored', content: 'text',
      fields: { creatorName: 'Ana', brandName: 'Nike' },
    }))
    const callData = vi.mocked(prisma.contract.create).mock.calls[0][0].data
    expect(typeof callData.fields).toBe('string')
    expect(JSON.parse(callData.fields)).toMatchObject({ creatorName: 'Ana', brandName: 'Nike' })
  })

  it('trims whitespace from title', async () => {
    vi.mocked(prisma.contract.create).mockResolvedValue({ id: 'c1' } as any)
    await POST(jsonReq({ title: '  My Contract  ', type: 'sponsored', content: 'text' }))
    const callData = vi.mocked(prisma.contract.create).mock.calls[0][0].data
    expect(callData.title).toBe('My Contract')
  })
})
