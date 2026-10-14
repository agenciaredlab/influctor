import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { OWNER_PERMS, memberSession } from '@/test-utils/team'
import { GET } from '../route'

vi.mock('@/lib/session', () => ({ getApiSession: vi.fn() }))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    marketplaceListing:     { findUnique: vi.fn() },
    marketplaceApplication: { findMany: vi.fn() },
  },
}))

import { getApiSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'

const OWNER = { id: 'user_1', email: 'o@x.com', name: 'O', plan: 'pro', accountId: 'user_1', permissions: OWNER_PERMS }
const params = { params: { id: 'lst_1' } }
const req = () => new NextRequest('http://localhost/api/marketplace/listings/lst_1/applications')

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(prisma.marketplaceApplication.findMany).mockResolvedValue([])
})

describe('GET /api/marketplace/listings/[id]/applications', () => {
  it('returns 401 when not authenticated', async () => {
    vi.mocked(getApiSession).mockResolvedValue(null)
    const res = await GET(req(), params)
    expect(res.status).toBe(401)
  })

  it('owner reads applications of a listing they posted', async () => {
    vi.mocked(getApiSession).mockResolvedValue(OWNER as any)
    vi.mocked(prisma.marketplaceListing.findUnique).mockResolvedValue({ postedById: 'user_1' } as any)
    const res = await GET(req(), params)
    expect(res.status).toBe(200)
  })

  it('returns 403 when the listing belongs to someone else', async () => {
    vi.mocked(getApiSession).mockResolvedValue(OWNER as any)
    vi.mocked(prisma.marketplaceListing.findUnique).mockResolvedValue({ postedById: 'other' } as any)
    const res = await GET(req(), params)
    expect(res.status).toBe(403)
    expect(prisma.marketplaceApplication.findMany).not.toHaveBeenCalled()
  })

  it('member without canManageDeals -> 403 before any DB read', async () => {
    vi.mocked(getApiSession).mockResolvedValue(memberSession({ canManageContent: true }) as any)
    const res = await GET(req(), params)
    expect(res.status).toBe(403)
    expect(prisma.marketplaceListing.findUnique).not.toHaveBeenCalled()
    expect(prisma.marketplaceApplication.findMany).not.toHaveBeenCalled()
  })

  it('member with canManageDeals sees listings posted by the OWNER account (postedById = accountId)', async () => {
    vi.mocked(getApiSession).mockResolvedValue(memberSession({ canManageDeals: true }) as any)
    vi.mocked(prisma.marketplaceListing.findUnique).mockResolvedValue({ postedById: 'owner_1' } as any)
    const res = await GET(req(), params)
    expect(res.status).toBe(200)
  })

  it('member cannot read applications of a listing posted by their OWN member user id', async () => {
    vi.mocked(getApiSession).mockResolvedValue(memberSession({ canManageDeals: true }) as any)
    vi.mocked(prisma.marketplaceListing.findUnique).mockResolvedValue({ postedById: 'member_1' } as any)
    const res = await GET(req(), params)
    expect(res.status).toBe(403)
  })
})
