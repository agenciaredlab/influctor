import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { OWNER_PERMS, memberSession } from '@/test-utils/team'
import { GET } from '../route'

vi.mock('@/lib/session', () => ({ getApiSession: vi.fn() }))

vi.mock('@/lib/config', () => ({
  getTikTokClientKey:    vi.fn().mockResolvedValue('ck'),
  getTikTokClientSecret: vi.fn().mockResolvedValue('cs'),
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

function mockTikTok() {
  mockFetch.mockImplementation(async (url: string) => {
    const u = String(url)
    const ok = (body: unknown) => ({ ok: true, json: async () => body })
    if (u.includes('/oauth/token/')) {
      return ok({ access_token: 'at', refresh_token: 'rt', open_id: 'tt_1', expires_in: 86400, refresh_expires_in: 31536000, scope: 'video.publish' })
    }
    return ok({ data: { user: { open_id: 'tt_1', display_name: 'Brand', profile_deep_link: 'https://www.tiktok.com/@brand' } } })
  })
}

const req = () => new NextRequest('http://localhost:3000/api/auth/tiktok/callback?code=abc')
const location = (res: Response) => decodeURIComponent(res.headers.get('location') ?? '')

beforeEach(() => {
  vi.clearAllMocks()
  mockFetch.mockReset()
  mockTikTok()
  vi.mocked(prisma.socialAccount.count).mockResolvedValue(0)
  vi.mocked(prisma.socialAccount.findUnique).mockResolvedValue(null)
  vi.mocked(prisma.socialAccount.upsert).mockResolvedValue({} as any)
})

describe('GET /api/auth/tiktok/callback', () => {
  it('redirects with not_authenticated when there is no session', async () => {
    vi.mocked(getApiSession).mockResolvedValue(null)
    const res = await GET(req())
    expect(location(res)).toContain('tiktok_error=not_authenticated')
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('owner connects: account is upserted under their own id', async () => {
    vi.mocked(getApiSession).mockResolvedValue({ id: 'user_1', plan: 'free', accountId: 'user_1', permissions: OWNER_PERMS } as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'user_1', plan: 'pro' } as any)
    const res = await GET(req())
    expect(location(res)).toContain('tiktok_connected=1')
    expect(prisma.socialAccount.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ create: expect.objectContaining({ userId: 'user_1' }) })
    )
  })

  describe('team member (shared workspace)', () => {
    it('without canConnectSocialAccounts -> redirected with an error, no TikTok call, nothing written', async () => {
      vi.mocked(getApiSession).mockResolvedValue(memberSession({ canManageContent: true }) as any)
      const res = await GET(req())
      expect(location(res)).toContain('tiktok_error=No tienes permiso')
      expect(mockFetch).not.toHaveBeenCalled()
      expect(prisma.user.findUnique).not.toHaveBeenCalled()
      expect(prisma.socialAccount.upsert).not.toHaveBeenCalled()
    })

    it('with the flag: SocialAccount is upserted under the OWNER account', async () => {
      vi.mocked(getApiSession).mockResolvedValue(memberSession({ canConnectSocialAccounts: true }, { plan: 'free' }) as any)
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'owner_1', plan: 'pro' } as any)
      const res = await GET(req())
      expect(location(res)).toContain('tiktok_connected=1')
      expect(prisma.socialAccount.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where:  { userId_platform_platformUserId: { userId: 'owner_1', platform: 'tiktok', platformUserId: 'tt_1' } },
          create: expect.objectContaining({ userId: 'owner_1' }),
        })
      )
    })

    it('limit comes from the OWNER plan: owner free with 1 account -> blocked even if the member session says pro', async () => {
      vi.mocked(getApiSession).mockResolvedValue(memberSession({ canConnectSocialAccounts: true }, { plan: 'pro' }) as any)
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'owner_1', plan: 'free' } as any)
      vi.mocked(prisma.socialAccount.count).mockResolvedValue(1)
      const res = await GET(req())
      expect(location(res)).toContain('tiktok_error=Tu plan permite hasta 1')
      expect(prisma.socialAccount.count).toHaveBeenCalledWith({ where: { userId: 'owner_1', isActive: true } })
      expect(prisma.socialAccount.upsert).not.toHaveBeenCalled()
    })
  })
})
