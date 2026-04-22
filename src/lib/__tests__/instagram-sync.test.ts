import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    socialAccount:  { update: vi.fn() },
    instagramMedia: { upsert: vi.fn() },
    socialSnapshot: { upsert: vi.fn() },
  },
}))

import { syncInstagramAccount, type AccountForSync } from '@/lib/instagram-sync'
import { prisma } from '@/lib/prisma'

const BASE_ACCOUNT: AccountForSync = {
  id:             'acct_1',
  platformUserId: 'ig_user_1',
  accessToken:    'token_abc',
  tokenExpiresAt: null,
  followersCount: 1000,
  followingCount: 200,
  mediaCount:     50,
  biography:      'Original bio',
  website:        null,
  profilePicture: null,
}

const PROFILE_RESPONSE = {
  followers_count:     1100,
  follows_count:       210,
  media_count:         52,
  biography:           'Updated bio',
  website:             'https://creator.com',
  profile_picture_url: 'https://cdn.example.com/pic.jpg',
}

const INSIGHTS_RESPONSE = {
  data: [
    { name: 'reach',        values: [{ value: 500 }, { value: 600 }] },
    { name: 'impressions',  values: [{ value: 1200 }, { value: 1300 }] },
    { name: 'profile_views', values: [{ value: 80 }, { value: 90 }] },
  ],
}

function mockFetchOk(body: object) {
  return Promise.resolve({ ok: true, json: () => Promise.resolve(body) } as Response)
}

function mockFetchFail() {
  return Promise.resolve({
    ok: false,
    json: () => Promise.resolve({ error: { message: 'Token invalid' } }),
  } as Response)
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(prisma.socialAccount.update).mockResolvedValue({} as any)
  vi.mocked(prisma.instagramMedia.upsert).mockResolvedValue({} as any)
  vi.mocked(prisma.socialSnapshot.upsert).mockResolvedValue({} as any)
})

// ─── Profile refresh ──────────────────────────────────────────────────────────

describe('syncInstagramAccount — profile refresh', () => {
  it('updates the social account with fresh profile data', async () => {
    vi.spyOn(global, 'fetch').mockImplementation((url: any) => {
      const u = String(url)
      if (u.includes('/insights'))      return mockFetchOk(INSIGHTS_RESPONSE)
      if (u.includes('/media'))         return mockFetchOk({ data: [] })
      return mockFetchOk(PROFILE_RESPONSE) // profile endpoint
    })

    await syncInstagramAccount(BASE_ACCOUNT, 'user_1')

    expect(prisma.socialAccount.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'acct_1' },
        data:  expect.objectContaining({
          followersCount: 1100,
          biography:      'Updated bio',
          website:        'https://creator.com',
        }),
      })
    )
  })

  it('still creates a snapshot when profile fetch fails', async () => {
    vi.spyOn(global, 'fetch').mockImplementation((url: any) => {
      const u = String(url)
      if (u.includes('/insights')) return mockFetchOk(INSIGHTS_RESPONSE)
      if (u.includes('/media'))    return mockFetchOk({ data: [] })
      return mockFetchFail() // profile endpoint fails
    })

    const result = await syncInstagramAccount(BASE_ACCOUNT, 'user_1')

    expect(result.profile).toBe(false)
    expect(prisma.socialSnapshot.upsert).toHaveBeenCalled()
  })
})

// ─── Insights ─────────────────────────────────────────────────────────────────

describe('syncInstagramAccount — insights', () => {
  it('extracts last value for each metric', async () => {
    vi.spyOn(global, 'fetch').mockImplementation((url: any) => {
      const u = String(url)
      if (u.includes('/insights')) return mockFetchOk(INSIGHTS_RESPONSE)
      if (u.includes('/media'))    return mockFetchOk({ data: [] })
      return mockFetchOk(PROFILE_RESPONSE)
    })

    const result = await syncInstagramAccount(BASE_ACCOUNT, 'user_1')

    expect(result.reach).toBe(600)
    expect(result.impressions).toBe(1300)
    expect(result.insights).toBe(true)
  })

  it('does not throw when account insights fetch fails (logged as warning)', async () => {
    vi.spyOn(global, 'fetch').mockImplementation((url: any) => {
      const u = String(url)
      if (u.includes('/insights')) {
        // simulate API error body
        return Promise.resolve({
          ok: false,
          json: () => Promise.resolve({ error: { message: 'Permission denied' } }),
        } as Response)
      }
      if (u.includes('/media')) return mockFetchOk({ data: [] })
      return mockFetchOk(PROFILE_RESPONSE)
    })

    const result = await syncInstagramAccount(BASE_ACCOUNT, 'user_1')

    expect(result.insights).toBe(false)
    expect(prisma.socialSnapshot.upsert).toHaveBeenCalled()
  })
})

// ─── Media sync ───────────────────────────────────────────────────────────────

describe('syncInstagramAccount — media sync', () => {
  it('upserts each post and accumulates engagement', async () => {
    const media = [
      { id: 'med_1', media_type: 'IMAGE', caption: 'Post 1', like_count: 120, comments_count: 30,
        media_url: 'https://img/1.jpg', thumbnail_url: null, permalink: 'https://ig/1', timestamp: '2024-01-01T00:00:00Z' },
      { id: 'med_2', media_type: 'REEL',  caption: 'Post 2', like_count: 300, comments_count: 50,
        media_url: null, thumbnail_url: 'https://thumb/2.jpg', permalink: 'https://ig/2', timestamp: '2024-01-02T00:00:00Z' },
    ]
    const mediaInsights = {
      data: [
        { name: 'impressions',       value: 800 },
        { name: 'reach',             value: 500 },
        { name: 'saved',             value: 20 },
        { name: 'total_interactions', value: 150 },
      ],
    }

    vi.spyOn(global, 'fetch').mockImplementation((url: any) => {
      const u = String(url)
      if (u.includes('/med_') && u.includes('/insights')) return mockFetchOk(mediaInsights)
      if (u.includes('/insights'))                         return mockFetchOk({ data: [] })
      if (u.includes('/media'))                            return mockFetchOk({ data: media })
      return mockFetchOk(PROFILE_RESPONSE)
    })

    const result = await syncInstagramAccount(BASE_ACCOUNT, 'user_1')

    expect(prisma.instagramMedia.upsert).toHaveBeenCalledTimes(2)
    expect(result.mediaSynced).toBe(2)
  })

  it('caps media processing at 10 posts', async () => {
    const media = Array.from({ length: 15 }, (_, i) => ({
      id: `med_${i}`, media_type: 'IMAGE', caption: `Post ${i}`,
      like_count: 10, comments_count: 2,
      media_url: null, thumbnail_url: null, permalink: null, timestamp: '2024-01-01T00:00:00Z',
    }))

    vi.spyOn(global, 'fetch').mockImplementation((url: any) => {
      const u = String(url)
      if (u.includes('/insights')) return mockFetchOk({ data: [] })
      if (u.includes('/media'))    return mockFetchOk({ data: media })
      return mockFetchOk(PROFILE_RESPONSE)
    })

    await syncInstagramAccount(BASE_ACCOUNT, 'user_1')

    expect(prisma.instagramMedia.upsert).toHaveBeenCalledTimes(10)
  })
})

// ─── Snapshot ─────────────────────────────────────────────────────────────────

describe('syncInstagramAccount — snapshot', () => {
  it('upserts a snapshot keyed by socialAccountId + today', async () => {
    vi.spyOn(global, 'fetch').mockImplementation((url: any) => {
      const u = String(url)
      if (u.includes('/insights')) return mockFetchOk(INSIGHTS_RESPONSE)
      if (u.includes('/media'))    return mockFetchOk({ data: [] })
      return mockFetchOk(PROFILE_RESPONSE)
    })

    await syncInstagramAccount(BASE_ACCOUNT, 'user_1')

    expect(prisma.socialSnapshot.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { socialAccountId_date: { socialAccountId: 'acct_1', date: expect.any(Date) } },
        create: expect.objectContaining({ platform: 'instagram', userId: 'user_1' }),
      })
    )
  })

  it('calculates newFollowers as delta from previous count', async () => {
    vi.spyOn(global, 'fetch').mockImplementation((url: any) => {
      const u = String(url)
      if (u.includes('/insights')) return mockFetchOk({ data: [] })
      if (u.includes('/media'))    return mockFetchOk({ data: [] })
      return mockFetchOk({ ...PROFILE_RESPONSE, followers_count: 1250 })
    })

    const result = await syncInstagramAccount(BASE_ACCOUNT, 'user_1')

    expect(result.newFollowers).toBe(250) // 1250 - 1000
  })

  it('clamps newFollowers to 0 when followers decreased', async () => {
    vi.spyOn(global, 'fetch').mockImplementation((url: any) => {
      const u = String(url)
      if (u.includes('/insights')) return mockFetchOk({ data: [] })
      if (u.includes('/media'))    return mockFetchOk({ data: [] })
      return mockFetchOk({ ...PROFILE_RESPONSE, followers_count: 800 }) // less than 1000
    })

    const result = await syncInstagramAccount(BASE_ACCOUNT, 'user_1')

    expect(result.newFollowers).toBe(0)
  })
})
