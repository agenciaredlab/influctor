import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { OWNER_PERMS, memberSession } from '@/test-utils/team'
import { POST } from '../route'

vi.mock('@/lib/session', () => ({ getApiSession: vi.fn() }))

vi.mock('@/lib/config', () => ({
  getCronSecret:         vi.fn().mockResolvedValue(null),
  getTikTokClientKey:    vi.fn().mockResolvedValue('ck'),
  getTikTokClientSecret: vi.fn().mockResolvedValue('cs'),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    contentPost:   { findUnique: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
    socialAccount: { findFirst: vi.fn() },
    user:          { findUnique: vi.fn() },
  },
}))

import { getApiSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'

const OWNER = { id: 'user_1', email: 'o@x.com', name: 'O', plan: 'creator', accountId: 'user_1', permissions: OWNER_PERMS }
const POST_RECORD = {
  id: 'post_1', userId: 'user_1', title: 'Clip', status: 'idea',
  imageUrl: 'https://example.com/v.mp4', caption: 'c', hashtags: '#x',
}
const req = (body: unknown = { postId: 'post_1' }) => new NextRequest('http://localhost/api/social/tiktok/publish', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
})

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(prisma.user.findUnique).mockResolvedValue({ plan: 'creator' } as any)
})

describe('POST /api/social/tiktok/publish', () => {
  it('returns 401 when not authenticated', async () => {
    vi.mocked(getApiSession).mockResolvedValue(null)
    const res = await POST(req())
    expect(res.status).toBe(401)
  })

  it('returns 400 when postId is missing', async () => {
    vi.mocked(getApiSession).mockResolvedValue(OWNER as any)
    const res = await POST(req({}))
    expect(res.status).toBe(400)
  })

  it('returns 403 when the plan does not allow publishing', async () => {
    vi.mocked(getApiSession).mockResolvedValue(OWNER as any)
    vi.mocked(prisma.contentPost.findFirst).mockResolvedValue(POST_RECORD as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ plan: 'free' } as any)
    const res = await POST(req())
    expect(res.status).toBe(403)
  })

  describe('team member (shared workspace)', () => {
    it('without canManageContent -> 403, no post lookup and nothing written', async () => {
      vi.mocked(getApiSession).mockResolvedValue(memberSession({ canConnectSocialAccounts: true }) as any)
      const res = await POST(req())
      expect(res.status).toBe(403)
      expect(prisma.contentPost.findFirst).not.toHaveBeenCalled()
      expect(prisma.contentPost.update).not.toHaveBeenCalled()
      expect(prisma.user.findUnique).not.toHaveBeenCalled()
    })

    it('with canManageContent: post, plan gate and social account all use the OWNER account', async () => {
      vi.mocked(getApiSession).mockResolvedValue(memberSession({ canManageContent: true }, { plan: 'free' }) as any)
      vi.mocked(prisma.contentPost.findFirst).mockResolvedValue({ ...POST_RECORD, userId: 'owner_1' } as any)
      vi.mocked(prisma.socialAccount.findFirst).mockResolvedValue(null)   // stop before calling TikTok
      const res = await POST(req())
      expect(res.status).toBe(404)
      expect(prisma.contentPost.findFirst).toHaveBeenCalledWith({ where: { id: 'post_1', userId: 'owner_1' } })
      expect(prisma.user.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'owner_1' } }))
      expect(prisma.socialAccount.findFirst).toHaveBeenCalledWith({
        where: { userId: 'owner_1', platform: 'tiktok', isActive: true },
      })
    })

    it('canPublish comes from the OWNER plan: owner free -> 403 even if the member session says pro', async () => {
      vi.mocked(getApiSession).mockResolvedValue(memberSession({ canManageContent: true }, { plan: 'pro' }) as any)
      vi.mocked(prisma.contentPost.findFirst).mockResolvedValue({ ...POST_RECORD, userId: 'owner_1' } as any)
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ plan: 'free' } as any)
      const res = await POST(req())
      expect(res.status).toBe(403)
      expect(prisma.contentPost.update).not.toHaveBeenCalled()
    })
  })
})
