import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    socialAccount:  { update: vi.fn() },
    socialSnapshot: { upsert: vi.fn() },
  },
}))

import { syncTikTokAccount, type TikTokAccountForSync } from '@/lib/tiktok-sync'
import { prisma } from '@/lib/prisma'

const BASE_ACCOUNT: TikTokAccountForSync = {
  id:             'acct_tt',
  platformUserId: 'tt_open_1',
  accessToken:    'access_token',
  refreshToken:   'refresh_token',
  tokenExpiresAt: new Date(Date.now() + 10 * 3600 * 1000), // 10h from now — no refresh needed
  followersCount: 5000,
  followingCount: 300,
  mediaCount:     40,
  biography:      'TikTok bio',
  profilePicture: null,
}

const PROFILE_BODY = {
  data: {
    user: {
      open_id:        'tt_open_1',
      avatar_url:     'https://cdn.tiktok.com/avatar.jpg',
      display_name:   'Creator One',
      bio_description: 'Updated TikTok bio',
      is_verified:    false,
      follower_count: 5200,
      following_count: 310,
      likes_count:    100000,
      video_count:    45,
    },
  },
}

const VIDEO_BODY = {
  data: {
    videos: [
      { id: 'v1', like_count: 800,  comment_count: 60,  share_count: 120, view_count: 12000, create_time: 1700000000 },
      { id: 'v2', like_count: 1200, comment_count: 90,  share_count: 200, view_count: 18000, create_time: 1700100000 },
      { id: 'v3', like_count: 400,  comment_count: 30,  share_count:  50, view_count:  6000, create_time: 1700200000 },
    ],
  },
}

function mockFetch(body: object, ok = true) {
  return Promise.resolve({
    ok,
    json: () => Promise.resolve(body),
  } as Response)
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(prisma.socialAccount.update).mockResolvedValue({} as any)
  vi.mocked(prisma.socialSnapshot.upsert).mockResolvedValue({} as any)

  vi.spyOn(global, 'fetch').mockImplementation((url: any) => {
    const u = String(url)
    if (u.includes('/user/info'))  return mockFetch(PROFILE_BODY)
    if (u.includes('/video/list')) return mockFetch(VIDEO_BODY)
    return mockFetch({})
  })

  process.env.TIKTOK_CLIENT_KEY    = 'tt_key'
  process.env.TIKTOK_CLIENT_SECRET = 'tt_secret'
})

// ─── Token refresh ────────────────────────────────────────────────────────────

describe('syncTikTokAccount — token refresh', () => {
  it('does NOT refresh when token has more than 2h remaining', async () => {
    await syncTikTokAccount(BASE_ACCOUNT, 'user_1')

    // Refresh endpoint should not have been called
    const refreshCall = vi.mocked(global.fetch).mock.calls.find(
      ([url]) => String(url).includes('/oauth/token/')
    )
    expect(refreshCall).toBeUndefined()
  })

  it('refreshes when token expires within 2h', async () => {
    const expiringSoon: TikTokAccountForSync = {
      ...BASE_ACCOUNT,
      tokenExpiresAt: new Date(Date.now() + 1 * 3600 * 1000), // 1h — below 2h threshold
    }

    vi.spyOn(global, 'fetch').mockImplementation((url: any) => {
      const u = String(url)
      if (u.includes('/oauth/token/')) return mockFetch({
        access_token:  'new_access',
        refresh_token: 'new_refresh',
        expires_in:    86400,
      })
      if (u.includes('/user/info'))  return mockFetch(PROFILE_BODY)
      if (u.includes('/video/list')) return mockFetch(VIDEO_BODY)
      return mockFetch({})
    })

    await syncTikTokAccount(expiringSoon, 'user_1')

    expect(prisma.socialAccount.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ accessToken: 'new_access' }),
      })
    )
  })

  it('uses original token when refresh has no refresh_token (no-op)', async () => {
    const noRefresh: TikTokAccountForSync = {
      ...BASE_ACCOUNT,
      refreshToken:   null,
      tokenExpiresAt: new Date(Date.now() + 1 * 3600 * 1000), // needs refresh
    }

    // Should not call refresh endpoint and should proceed normally
    await syncTikTokAccount(noRefresh, 'user_1')

    const refreshCall = vi.mocked(global.fetch).mock.calls.find(
      ([url]) => String(url).includes('/oauth/token/')
    )
    expect(refreshCall).toBeUndefined()
  })
})

// ─── Profile update ───────────────────────────────────────────────────────────

describe('syncTikTokAccount — profile update', () => {
  it('updates the social account with fresh profile data', async () => {
    await syncTikTokAccount(BASE_ACCOUNT, 'user_1')

    expect(prisma.socialAccount.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'acct_tt' },
        data:  expect.objectContaining({
          followersCount: 5200,
          followingCount: 310,
          mediaCount:     45,
          biography:      'Updated TikTok bio',
          profilePicture: 'https://cdn.tiktok.com/avatar.jpg',
        }),
      })
    )
  })

  it('sets accountType to VERIFIED when profile.is_verified is true', async () => {
    vi.spyOn(global, 'fetch').mockImplementation((url: any) => {
      const u = String(url)
      if (u.includes('/user/info'))  return mockFetch({ data: { user: { ...PROFILE_BODY.data.user, is_verified: true } } })
      if (u.includes('/video/list')) return mockFetch(VIDEO_BODY)
      return mockFetch({})
    })

    await syncTikTokAccount(BASE_ACCOUNT, 'user_1')

    expect(prisma.socialAccount.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ accountType: 'VERIFIED' }),
      })
    )
  })

  it('sets accountType to CREATOR when not verified', async () => {
    await syncTikTokAccount(BASE_ACCOUNT, 'user_1')

    expect(prisma.socialAccount.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ accountType: 'CREATOR' }),
      })
    )
  })
})

// ─── Engagement & metrics ─────────────────────────────────────────────────────

describe('syncTikTokAccount — engagement calculation', () => {
  it('returns correct follower and newFollowers counts', async () => {
    const result = await syncTikTokAccount(BASE_ACCOUNT, 'user_1')

    expect(result.followers).toBe(5200)
    expect(result.newFollowers).toBe(200) // 5200 - 5000
  })

  it('clamps newFollowers to 0 when followers decreased', async () => {
    vi.spyOn(global, 'fetch').mockImplementation((url: any) => {
      const u = String(url)
      if (u.includes('/user/info'))  return mockFetch({ data: { user: { ...PROFILE_BODY.data.user, follower_count: 4800 } } })
      if (u.includes('/video/list')) return mockFetch({ data: { videos: [] } })
      return mockFetch({})
    })

    const result = await syncTikTokAccount(BASE_ACCOUNT, 'user_1')

    expect(result.newFollowers).toBe(0)
  })

  it('calculates totalViews from all videos', async () => {
    const result = await syncTikTokAccount(BASE_ACCOUNT, 'user_1')

    expect(result.totalViews).toBe(12000 + 18000 + 6000)
  })

  it('returns videosProcessed as count of videos', async () => {
    const result = await syncTikTokAccount(BASE_ACCOUNT, 'user_1')
    expect(result.videosProcessed).toBe(3)
  })

  it('returns zero engagement with empty video list', async () => {
    vi.spyOn(global, 'fetch').mockImplementation((url: any) => {
      const u = String(url)
      if (u.includes('/user/info'))  return mockFetch(PROFILE_BODY)
      if (u.includes('/video/list')) return mockFetch({ data: { videos: [] } })
      return mockFetch({})
    })

    const result = await syncTikTokAccount(BASE_ACCOUNT, 'user_1')

    expect(result.engagement).toBe(0)
    expect(result.videosProcessed).toBe(0)
  })
})

// ─── Snapshot ─────────────────────────────────────────────────────────────────

describe('syncTikTokAccount — snapshot', () => {
  it('upserts snapshot keyed by socialAccountId + today', async () => {
    await syncTikTokAccount(BASE_ACCOUNT, 'user_1')

    expect(prisma.socialSnapshot.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { socialAccountId_date: { socialAccountId: 'acct_tt', date: expect.any(Date) } },
        create: expect.objectContaining({ platform: 'tiktok', userId: 'user_1' }),
      })
    )
  })

  it('uses totalViews as reach and impressions (TikTok approximation)', async () => {
    await syncTikTokAccount(BASE_ACCOUNT, 'user_1')

    const upsertCall = vi.mocked(prisma.socialSnapshot.upsert).mock.calls[0][0]
    const expectedViews = 12000 + 18000 + 6000

    expect(upsertCall.update).toMatchObject({ reach: expectedViews, impressions: expectedViews })
  })

  it('sets snapshot date to midnight (start of day)', async () => {
    await syncTikTokAccount(BASE_ACCOUNT, 'user_1')

    const upsertCall = vi.mocked(prisma.socialSnapshot.upsert).mock.calls[0][0]
    const snapshotDate = upsertCall.where.socialAccountId_date.date as Date

    expect(snapshotDate.getHours()).toBe(0)
    expect(snapshotDate.getMinutes()).toBe(0)
    expect(snapshotDate.getSeconds()).toBe(0)
  })
})
