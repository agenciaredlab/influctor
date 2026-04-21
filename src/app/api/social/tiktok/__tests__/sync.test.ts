import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from '../sync/route'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    socialAccount: { findFirst: vi.fn(), update: vi.fn() },
  },
}))

vi.mock('@/lib/session', () => ({
  getApiSession: vi.fn(),
}))

vi.mock('@/lib/tiktok-sync', () => ({
  syncTikTokAccount: vi.fn(),
}))

import { prisma } from '@/lib/prisma'
import { getApiSession } from '@/lib/session'
import { syncTikTokAccount } from '@/lib/tiktok-sync'

const SESSION = { id: 'user_1', email: 'creator@test.com', name: 'Ana' }

function makeAccount(overrides: Partial<{
  id: string; tokenExpiresAt: Date | null; refreshToken: string | null; isActive: boolean
}> = {}) {
  return {
    id:             'acc_tiktok',
    platform:       'tiktok',
    isActive:       true,
    tokenExpiresAt: new Date(Date.now() + 10 * 3600 * 1000), // 10h from now
    refreshToken:   'refresh_token_123',
    followersCount: 5000,
    followingCount: 200,
    mediaCount:     80,
    biography:      null,
    profilePicture: null,
    userId:         'user_1',
    snapshots:      [],
    ...overrides,
  }
}

function req(method = 'GET') {
  return new NextRequest('http://localhost/api/social/tiktok/sync', { method })
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
  vi.mocked(prisma.socialAccount.update).mockResolvedValue({} as any)
  vi.mocked(syncTikTokAccount).mockResolvedValue({
    profile: true, videosProcessed: 12,
    followers: 5100, newFollowers: 100, totalViews: 50000, engagement: 3.2,
  })
})

// ─── GET (status) ─────────────────────────────────────────────────────────────

describe('GET /api/social/tiktok/sync', () => {
  it('returns connected:false when not authenticated', async () => {
    vi.mocked(getApiSession).mockResolvedValue(null)
    const res  = await GET(req())
    const body = await res.json()
    expect(body.connected).toBe(false)
  })

  it('returns connected:false when no account', async () => {
    vi.mocked(prisma.socialAccount.findFirst).mockResolvedValue(null)
    const res  = await GET(req())
    const body = await res.json()
    expect(body.connected).toBe(false)
  })

  it('returns connected:true with account data', async () => {
    vi.mocked(prisma.socialAccount.findFirst).mockResolvedValue(makeAccount() as any)
    const res  = await GET(req())
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.connected).toBe(true)
    expect(body.account.id).toBe('acc_tiktok')
  })
})

// ─── POST (sync) ─────────────────────────────────────────────────────────────

describe('POST /api/social/tiktok/sync', () => {
  it('returns 401 when not authenticated', async () => {
    vi.mocked(getApiSession).mockResolvedValue(null)
    const res = await POST(req('POST'))
    expect(res.status).toBe(401)
  })

  it('returns 404 when no account connected', async () => {
    vi.mocked(prisma.socialAccount.findFirst).mockResolvedValue(null)
    const res = await POST(req('POST'))
    expect(res.status).toBe(404)
  })

  it('calls syncTikTokAccount with account and userId', async () => {
    const account = makeAccount()
    vi.mocked(prisma.socialAccount.findFirst).mockResolvedValue(account as any)

    await POST(req('POST'))

    expect(syncTikTokAccount).toHaveBeenCalledWith(account, SESSION.id)
  })

  it('returns success result from syncTikTokAccount', async () => {
    vi.mocked(prisma.socialAccount.findFirst).mockResolvedValue(makeAccount() as any)

    const res  = await POST(req('POST'))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.synced.followers).toBe(5100)
    expect(body.synced.videosProcessed).toBe(12)
  })

  it('returns 401 when no refresh token and token is expired', async () => {
    const expired = makeAccount({
      tokenExpiresAt: new Date(Date.now() - 1000), // expired
      refreshToken:   null,
    })
    vi.mocked(prisma.socialAccount.findFirst).mockResolvedValue(expired as any)

    const res = await POST(req('POST'))
    expect(res.status).toBe(401)
  })

  it('returns 500 on sync error', async () => {
    vi.mocked(prisma.socialAccount.findFirst).mockResolvedValue(makeAccount() as any)
    vi.mocked(syncTikTokAccount).mockRejectedValue(new Error('API rate limit'))

    const res  = await POST(req('POST'))
    const body = await res.json()
    expect(res.status).toBe(500)
    expect(body.error).toBe('API rate limit')
  })
})
