import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { OWNER_PERMS, memberSession } from '@/test-utils/team'
import { GET } from '../route'

vi.mock('@/lib/session', () => ({ getApiSession: vi.fn() }))

vi.mock('@/lib/config', () => ({
  getInstagramAppId:     vi.fn().mockResolvedValue('app-id'),
  getInstagramAppSecret: vi.fn().mockResolvedValue('app-secret'),
  getAppUrl:             vi.fn().mockResolvedValue('http://localhost:3000'),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user:          { findUnique: vi.fn() },
    socialAccount: { count: vi.fn(), findUnique: vi.fn(), upsert: vi.fn() },
  },
}))

import { getApiSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'

const mockFetch = vi.fn()
global.fetch = mockFetch as any

/** Routes every Meta Graph call the callback makes. */
function mockMeta() {
  mockFetch.mockImplementation(async (url: string, init?: any) => {
    const u = String(url)
    const ok = (body: unknown) => ({ ok: true, json: async () => body })
    if (u.includes('/oauth/access_token') && init?.method === 'POST') return ok({ access_token: 'short', token_type: 'bearer' })
    if (u.includes('fb_exchange_token'))                              return ok({ access_token: 'long', token_type: 'bearer', expires_in: 5184000 })
    if (u.includes('/me/accounts'))                                    return ok({ data: [{ id: 'page_1', name: 'P', access_token: 'pt' }] })
    if (u.includes('instagram_business_account'))                      return ok({ instagram_business_account: { id: 'ig_1' } })
    return ok({ username: 'brand', name: 'Brand', followers_count: 10, follows_count: 1, media_count: 2 })
  })
}

const req = () => new NextRequest('http://localhost:3000/api/auth/instagram/callback?code=abc')
const location = (res: Response) => decodeURIComponent(res.headers.get('location') ?? '')

beforeEach(() => {
  vi.clearAllMocks()
  mockFetch.mockReset()
  mockMeta()
  vi.mocked(prisma.socialAccount.count).mockResolvedValue(0)
  vi.mocked(prisma.socialAccount.findUnique).mockResolvedValue(null)
  vi.mocked(prisma.socialAccount.upsert).mockResolvedValue({} as any)
})

describe('GET /api/auth/instagram/callback', () => {
  it('redirects with not_authenticated when there is no session', async () => {
    vi.mocked(getApiSession).mockResolvedValue(null)
    const res = await GET(req())
    expect(location(res)).toContain('instagram_error=not_authenticated')
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('owner connects: account is upserted under their own id', async () => {
    vi.mocked(getApiSession).mockResolvedValue({ id: 'user_1', plan: 'free', accountId: 'user_1', permissions: OWNER_PERMS } as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'user_1', plan: 'pro' } as any)
    const res = await GET(req())
    expect(location(res)).toContain('instagram_connected=1')
    expect(prisma.socialAccount.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ create: expect.objectContaining({ userId: 'user_1' }) })
    )
  })

  describe('team member (shared workspace)', () => {
    it('without canConnectSocialAccounts -> redirected with an error, no Meta call, nothing written', async () => {
      vi.mocked(getApiSession).mockResolvedValue(memberSession({ canManageContent: true }) as any)
      const res = await GET(req())
      expect(location(res)).toContain('instagram_error=No tienes permiso')
      expect(mockFetch).not.toHaveBeenCalled()
      expect(prisma.user.findUnique).not.toHaveBeenCalled()
      expect(prisma.socialAccount.upsert).not.toHaveBeenCalled()
    })

    it('with the flag: SocialAccount is upserted under the OWNER account', async () => {
      vi.mocked(getApiSession).mockResolvedValue(memberSession({ canConnectSocialAccounts: true }, { plan: 'free' }) as any)
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'owner_1', plan: 'pro' } as any)
      const res = await GET(req())
      expect(location(res)).toContain('instagram_connected=1')
      expect(prisma.socialAccount.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where:  { userId_platform_platformUserId: { userId: 'owner_1', platform: 'instagram', platformUserId: 'ig_1' } },
          create: expect.objectContaining({ userId: 'owner_1' }),
        })
      )
    })

    it('limit comes from the OWNER plan: owner free with 1 account -> blocked even if the member session says pro', async () => {
      vi.mocked(getApiSession).mockResolvedValue(memberSession({ canConnectSocialAccounts: true }, { plan: 'pro' }) as any)
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'owner_1', plan: 'free' } as any)
      vi.mocked(prisma.socialAccount.count).mockResolvedValue(1)
      const res = await GET(req())
      expect(location(res)).toContain('instagram_error=Tu plan permite hasta 1')
      expect(prisma.socialAccount.count).toHaveBeenCalledWith({ where: { userId: 'owner_1', isActive: true } })
      expect(prisma.socialAccount.upsert).not.toHaveBeenCalled()
    })
  })
})
