import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '../route'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    socialAccount: { findMany: vi.fn() },
  },
}))

vi.mock('@/lib/tiktok-sync', () => ({
  syncTikTokAccount: vi.fn(),
}))

import { prisma } from '@/lib/prisma'
import { syncTikTokAccount } from '@/lib/tiktok-sync'

function makeAccount(overrides: Partial<{
  id: string; username: string; userId: string;
  isActive: boolean; tokenExpiresAt: Date | null;
  refreshToken: string | null; lastSyncAt: Date | null;
}> = {}) {
  return {
    id:             'acc_tt1',
    username:       'creator_tt',
    userId:         'user_1',
    platform:       'tiktok',
    isActive:       true,
    tokenExpiresAt: new Date(Date.now() + 20 * 3600 * 1000), // 20h from now
    refreshToken:   'refresh_abc',
    lastSyncAt:     null,
    ...overrides,
  }
}

function cronReq(secret?: string) {
  const headers: Record<string, string> = {}
  if (secret) headers['authorization'] = `Bearer ${secret}`
  return new NextRequest('http://localhost/api/cron/sync-tiktok', { headers })
}

beforeEach(() => {
  vi.resetAllMocks()
  delete process.env.CRON_SECRET
  vi.mocked(syncTikTokAccount).mockResolvedValue({
    profile: true, videosProcessed: 10,
    followers: 5000, newFollowers: 50, totalViews: 40000, engagement: 3.1,
  })
})

// ─── Auth ─────────────────────────────────────────────────────────────────────

describe('GET /api/cron/sync-tiktok — auth', () => {
  it('allows request when CRON_SECRET is not set', async () => {
    vi.mocked(prisma.socialAccount.findMany).mockResolvedValue([])
    const res = await GET(cronReq())
    expect(res.status).toBe(200)
  })

  it('returns 401 when CRON_SECRET is set but header is missing', async () => {
    process.env.CRON_SECRET = 'secret123'
    const res = await GET(cronReq())
    expect(res.status).toBe(401)
  })

  it('allows request with correct CRON_SECRET', async () => {
    process.env.CRON_SECRET = 'secret123'
    vi.mocked(prisma.socialAccount.findMany).mockResolvedValue([])
    const res = await GET(cronReq('secret123'))
    expect(res.status).toBe(200)
  })

  it('returns 401 with wrong secret', async () => {
    process.env.CRON_SECRET = 'secret123'
    const res = await GET(cronReq('wrongsecret'))
    expect(res.status).toBe(401)
  })
})

// ─── No accounts ──────────────────────────────────────────────────────────────

describe('GET /api/cron/sync-tiktok — no accounts', () => {
  it('returns processed=0 when no accounts found', async () => {
    vi.mocked(prisma.socialAccount.findMany).mockResolvedValue([])
    const res  = await GET(cronReq())
    const body = await res.json()
    expect(body.processed).toBe(0)
    expect(body.succeeded).toBe(0)
    expect(body.failed).toBe(0)
  })

  it('does not call syncTikTokAccount when no accounts', async () => {
    vi.mocked(prisma.socialAccount.findMany).mockResolvedValue([])
    await GET(cronReq())
    expect(syncTikTokAccount).not.toHaveBeenCalled()
  })
})

// ─── Sync success ─────────────────────────────────────────────────────────────

describe('GET /api/cron/sync-tiktok — success', () => {
  it('calls syncTikTokAccount with account and userId', async () => {
    const account = makeAccount()
    vi.mocked(prisma.socialAccount.findMany).mockResolvedValue([account as any])

    await GET(cronReq())

    expect(syncTikTokAccount).toHaveBeenCalledWith(account, account.userId)
  })

  it('returns succeeded=1 and failed=0 for one successful account', async () => {
    vi.mocked(prisma.socialAccount.findMany).mockResolvedValue([makeAccount() as any])

    const res  = await GET(cronReq())
    const body = await res.json()
    expect(body.processed).toBe(1)
    expect(body.succeeded).toBe(1)
    expect(body.failed).toBe(0)
  })

  it('syncs multiple accounts and counts them all', async () => {
    vi.mocked(prisma.socialAccount.findMany).mockResolvedValue([
      makeAccount({ id: 'acc_1', username: 'user1' }) as any,
      makeAccount({ id: 'acc_2', username: 'user2' }) as any,
    ])

    const res  = await GET(cronReq())
    const body = await res.json()
    expect(body.processed).toBe(2)
    expect(body.succeeded).toBe(2)
    expect(syncTikTokAccount).toHaveBeenCalledTimes(2)
  })

  it('includes account username in results', async () => {
    vi.mocked(prisma.socialAccount.findMany).mockResolvedValue([
      makeAccount({ id: 'acc_1', username: 'mytiktok' }) as any,
    ])

    const res  = await GET(cronReq())
    const body = await res.json()
    expect(body.results[0]).toMatchObject({
      accountId: 'acc_1',
      username:  'mytiktok',
      success:   true,
    })
  })
})

// ─── Sync failures ────────────────────────────────────────────────────────────

describe('GET /api/cron/sync-tiktok — failures', () => {
  it('returns failed=1 when syncTikTokAccount throws', async () => {
    vi.mocked(prisma.socialAccount.findMany).mockResolvedValue([makeAccount() as any])
    vi.mocked(syncTikTokAccount).mockRejectedValue(new Error('Token refresh failed'))

    const res  = await GET(cronReq())
    const body = await res.json()
    expect(res.status).toBe(200) // cron must never return 500
    expect(body.failed).toBe(1)
    expect(body.succeeded).toBe(0)
  })

  it('includes error message in failed result', async () => {
    vi.mocked(prisma.socialAccount.findMany).mockResolvedValue([
      makeAccount({ username: 'failaccount' }) as any,
    ])
    vi.mocked(syncTikTokAccount).mockRejectedValue(new Error('Rate limit exceeded'))

    const res  = await GET(cronReq())
    const body = await res.json()
    expect(body.results[0]).toMatchObject({
      success:  false,
      error:    'Rate limit exceeded',
      username: 'failaccount',
    })
  })

  it('continues syncing remaining accounts after one fails', async () => {
    vi.mocked(prisma.socialAccount.findMany).mockResolvedValue([
      makeAccount({ id: 'acc_1', username: 'fails' })    as any,
      makeAccount({ id: 'acc_2', username: 'succeeds' }) as any,
    ])
    vi.mocked(syncTikTokAccount)
      .mockRejectedValueOnce(new Error('API error'))
      .mockResolvedValueOnce({
        profile: true, videosProcessed: 5,
        followers: 3000, newFollowers: 20, totalViews: 15000, engagement: 2.8,
      })

    const res  = await GET(cronReq())
    const body = await res.json()
    expect(body.succeeded).toBe(1)
    expect(body.failed).toBe(1)
    expect(syncTikTokAccount).toHaveBeenCalledTimes(2)
  })
})
