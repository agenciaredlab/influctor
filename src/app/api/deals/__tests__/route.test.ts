import { describe, it, expect, vi, beforeEach } from 'vitest'
import { OWNER_PERMS, NO_PERMS, memberSession } from '@/test-utils/team'
import { NextRequest } from 'next/server'
import { GET, POST } from '../route'

vi.mock('@/lib/session', () => ({ getApiSession: vi.fn() }))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    brandDeal: {
      findMany: vi.fn(),
      create:   vi.fn(),
      count:    vi.fn(),
    },
  },
}))

import { getApiSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'

const SESSION = { id: 'user_1', email: 'test@example.com', name: 'Test', plan: 'free', accountId: 'user_1', permissions: OWNER_PERMS }

const DEAL = {
  id: 'deal_1', userId: 'user_1', brand: 'Nike', contact: 'Ana', email: 'ana@nike.com',
  phone: null, platform: 'instagram', type: 'sponsored_post', stage: 'negotiation',
  value: 2000, commissionPct: null, currency: 'USD',
  dueDate: null, description: null, deliverables: null, notes: null, tags: null, niche: null,
  createdAt: new Date(), updatedAt: new Date(),
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(prisma.brandDeal.count).mockResolvedValue(0)
  vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'user_1', plan: 'free' } as any)
})

describe('GET /api/deals', () => {
  it('returns 401 when not authenticated', async () => {
    vi.mocked(getApiSession).mockResolvedValue(null)
    const res = await GET(new NextRequest('http://localhost/api/deals'))
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBeDefined()
  })

  it('returns deals for authenticated user', async () => {
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.brandDeal.findMany).mockResolvedValue([DEAL] as any)

    const res = await GET(new NextRequest('http://localhost/api/deals'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveLength(1)
    expect(body[0].id).toBe('deal_1')
  })

  it('queries only records owned by the session user', async () => {
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.brandDeal.findMany).mockResolvedValue([])

    await GET(new NextRequest('http://localhost/api/deals'))
    expect(prisma.brandDeal.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ userId: 'user_1' }) })
    )
  })
})

describe('POST /api/deals', () => {
  it('returns 401 when not authenticated', async () => {
    vi.mocked(getApiSession).mockResolvedValue(null)
    const res = await POST(new NextRequest('http://localhost/api/deals', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brand: 'Nike', platform: 'instagram', type: 'sponsored_post' }),
    }))
    expect(res.status).toBe(401)
  })

  it('returns 400 when brand is missing', async () => {
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    const res = await POST(new NextRequest('http://localhost/api/deals', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ platform: 'instagram', type: 'sponsored_post' }),
    }))
    expect(res.status).toBe(400)
  })

  it('creates deal and returns 201', async () => {
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.brandDeal.create).mockResolvedValue(DEAL as any)

    const res = await POST(new NextRequest('http://localhost/api/deals', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brand: 'Nike', platform: 'instagram', type: 'sponsored_post', value: 2000 }),
    }))
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.id).toBe('deal_1')
    expect(body.brand).toBe('Nike')
  })

  it('always sets userId from session (ignores body userId)', async () => {
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.brandDeal.create).mockResolvedValue(DEAL as any)

    await POST(new NextRequest('http://localhost/api/deals', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brand: 'Nike', platform: 'instagram', type: 'ugc', userId: 'hacker' }),
    }))

    expect(prisma.brandDeal.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ userId: 'user_1' }) })
    )
  })

  it('defaults stage to "outreach" when not provided', async () => {
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.brandDeal.create).mockResolvedValue(DEAL as any)

    await POST(new NextRequest('http://localhost/api/deals', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brand: 'Adidas', platform: 'tiktok', type: 'ambassador' }),
    }))

    expect(prisma.brandDeal.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ stage: 'outreach' }) })
    )
  })

  it('returns 500 when DB throws on GET', async () => {
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.brandDeal.findMany).mockRejectedValue(new Error('DB error'))
    const res = await GET(new NextRequest('http://localhost/api/deals'))
    expect(res.status).toBe(500)
  })

  it('returns 500 when DB throws on POST', async () => {
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.brandDeal.create).mockRejectedValue(new Error('DB error'))
    const res = await POST(new NextRequest('http://localhost/api/deals', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brand: 'Nike', platform: 'instagram', type: 'post' }),
    }))
    expect(res.status).toBe(500)
  })
})

describe('POST /api/deals — plan limit', () => {
  it('returns 403 when a free user already has 3 brand deals', async () => {
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.brandDeal.count).mockResolvedValue(3)
    const res = await POST(new NextRequest('http://localhost/api/deals', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ brand: 'Nike' }),
    }))
    expect(res.status).toBe(403)
    expect(prisma.brandDeal.create).not.toHaveBeenCalled()
  })

  it('does not count deals for a plan with unlimited brand deals', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'user_1', plan: 'creator' } as any)
    vi.mocked(getApiSession).mockResolvedValue({ ...SESSION, plan: 'creator' } as any)
    vi.mocked(prisma.brandDeal.create).mockResolvedValue(DEAL as any)
    const res = await POST(new NextRequest('http://localhost/api/deals', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ brand: 'Nike' }),
    }))
    expect(res.status).toBe(201)
    expect(prisma.brandDeal.count).not.toHaveBeenCalled()
  })
})

describe('team member (shared workspace)', () => {
  const MEMBER = memberSession({ canManageDeals: true })
  const req = () => new NextRequest('http://localhost/api/deals', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ brand: 'Nike' }),
  })

  it('GET reads the owner account space (accountId), with no flag needed', async () => {
    vi.mocked(getApiSession).mockResolvedValue(memberSession() as any)
    vi.mocked(prisma.brandDeal.findMany).mockResolvedValue([])
    const res = await GET(new NextRequest('http://localhost/api/deals'))
    expect(res.status).toBe(200)
    expect(prisma.brandDeal.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ userId: 'owner_1' }) })
    )
  })

  it('POST creates the deal under the owner account', async () => {
    vi.mocked(getApiSession).mockResolvedValue(MEMBER as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'owner_1', plan: 'pro' } as any)
    vi.mocked(prisma.brandDeal.create).mockResolvedValue(DEAL as any)
    const res = await POST(req())
    expect(res.status).toBe(201)
    expect(prisma.brandDeal.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ userId: 'owner_1' }) })
    )
  })

  it('POST without canManageDeals -> 403 and nothing is read or written', async () => {
    vi.mocked(getApiSession).mockResolvedValue(memberSession({ canManageContent: true }) as any)
    const res = await POST(req())
    expect(res.status).toBe(403)
    expect(prisma.user.findUnique).not.toHaveBeenCalled()
    expect(prisma.brandDeal.count).not.toHaveBeenCalled()
    expect(prisma.brandDeal.create).not.toHaveBeenCalled()
  })

  it('plan limit comes from the OWNER plan, not the member plan (owner free -> blocked)', async () => {
    vi.mocked(getApiSession).mockResolvedValue(memberSession({ canManageDeals: true }, { plan: 'pro' }) as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'owner_1', plan: 'free' } as any)
    vi.mocked(prisma.brandDeal.count).mockResolvedValue(3)
    const res = await POST(req())
    expect(res.status).toBe(403)
    expect(prisma.brandDeal.count).toHaveBeenCalledWith({ where: { userId: 'owner_1' } })
    expect(prisma.brandDeal.create).not.toHaveBeenCalled()
  })

  it('plan limit comes from the OWNER plan (owner creator, member free -> allowed, no count)', async () => {
    vi.mocked(getApiSession).mockResolvedValue(memberSession({ canManageDeals: true }, { plan: 'free' }) as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'owner_1', plan: 'creator' } as any)
    vi.mocked(prisma.brandDeal.create).mockResolvedValue(DEAL as any)
    const res = await POST(req())
    expect(res.status).toBe(201)
    expect(prisma.brandDeal.count).not.toHaveBeenCalled()
  })
})
