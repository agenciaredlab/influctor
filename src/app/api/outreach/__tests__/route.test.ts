import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { OWNER_PERMS, memberSession } from '@/test-utils/team'
import { GET, POST } from '../route'

vi.mock('@/lib/session', () => ({ getApiSession: vi.fn() }))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    outreachEntry: { findMany: vi.fn(), create: vi.fn() },
  },
}))

import { getApiSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'

const OWNER = { id: 'user_1', email: 'o@x.com', name: 'O', plan: 'creator', accountId: 'user_1', permissions: OWNER_PERMS }
const postReq = (body: unknown = { brand: 'Nike' }) => new NextRequest('http://localhost/api/outreach', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
})

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/outreach', () => {
  it('returns 401 when not authenticated', async () => {
    vi.mocked(getApiSession).mockResolvedValue(null)
    const res = await GET(new NextRequest('http://localhost/api/outreach'))
    expect(res.status).toBe(401)
  })

  it('owner reads their own entries', async () => {
    vi.mocked(getApiSession).mockResolvedValue(OWNER as any)
    vi.mocked(prisma.outreachEntry.findMany).mockResolvedValue([])
    await GET(new NextRequest('http://localhost/api/outreach'))
    expect(prisma.outreachEntry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'user_1' } })
    )
  })

  it('member with no flags can read, scoped to the OWNER account', async () => {
    vi.mocked(getApiSession).mockResolvedValue(memberSession() as any)
    vi.mocked(prisma.outreachEntry.findMany).mockResolvedValue([])
    const res = await GET(new NextRequest('http://localhost/api/outreach'))
    expect(res.status).toBe(200)
    expect(prisma.outreachEntry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'owner_1' } })
    )
  })
})

describe('POST /api/outreach', () => {
  it('returns 401 when not authenticated', async () => {
    vi.mocked(getApiSession).mockResolvedValue(null)
    const res = await POST(postReq())
    expect(res.status).toBe(401)
  })

  it('returns 400 when brand is missing', async () => {
    vi.mocked(getApiSession).mockResolvedValue(OWNER as any)
    const res = await POST(postReq({ brand: '  ' }))
    expect(res.status).toBe(400)
  })

  it('member without canManageDeals -> 403, nothing written', async () => {
    vi.mocked(getApiSession).mockResolvedValue(memberSession({ canManageContent: true }) as any)
    const res = await POST(postReq())
    expect(res.status).toBe(403)
    expect(prisma.outreachEntry.create).not.toHaveBeenCalled()
  })

  it('member with canManageDeals creates the entry under the OWNER account', async () => {
    vi.mocked(getApiSession).mockResolvedValue(memberSession({ canManageDeals: true }) as any)
    vi.mocked(prisma.outreachEntry.create).mockResolvedValue({ id: 'o1' } as any)
    const res = await POST(postReq())
    expect(res.status).toBe(201)
    expect(prisma.outreachEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ userId: 'owner_1' }) })
    )
  })
})
