import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '../route'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    socialAccount: { findMany: vi.fn() },
  },
}))

vi.mock('@/lib/instagram-sync', () => ({
  syncInstagramAccount: vi.fn(),
}))

import { prisma } from '@/lib/prisma'
import { syncInstagramAccount } from '@/lib/instagram-sync'

function makeAccount(overrides: Partial<{
  id: string; username: string; userId: string;
  isActive: boolean; tokenExpiresAt: Date | null; lastSyncAt: Date | null;
}> = {}) {
  return {
    id:             'acc_1',
    username:       'creator_ig',
    userId:         'user_1',
    platform:       'instagram',
    isActive:       true,
    tokenExpiresAt: new Date(Date.now() + 60 * 24 * 3600 * 1000), // 60d from now
    lastSyncAt:     null,
    ...overrides,
  }
}

function cronReq(secret?: string) {
  const headers: Record<string, string> = {}
  if (secret) headers['authorization'] = `Bearer ${secret}`
  return new NextRequest('http://localhost/api/cron/sync-instagram', { headers })
}

beforeEach(() => {
  vi.resetAllMocks()
  delete process.env.CRON_SECRET
  vi.mocked(syncInstagramAccount).mockResolvedValue({
    profile: true, insights: true, mediaSynced: 5,
    followers: 1000, newFollowers: 10, reach: 5000, impressions: 8000,
  })
})

// ─── Auth ─────────────────────────────────────────────────────────────────────

describe('GET /api/cron/sync-instagram — auth', () => {
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

  it('returns 401 with wrong CRON_SECRET', async () => {
    process.env.CRON_SECRET = 'secret123'
    const res = await GET(cronReq('wrongsecret'))
    expect(res.status).toBe(401)
  })
})

// ─── No accounts ─────────────────────────────────────────────────────────────

describe('GET /api/cron/sync-instagram — no accounts', () => {
  it('returns processed=0 when no accounts found', async () => {
    vi.mocked(prisma.socialAccount.findMany).mockResolvedValue([])
    const res = await GET(cronReq())
    const body = await res.json()
    expect(body.processed).toBe(0)
    expect(body.succeeded).toBe(0)
    expect(body.failed).toBe(0)
  })

  it('does not call syncInstagramAccount when no accounts', async () => {
    vi.mocked(prisma.socialAccount.findMany).mockResolvedValue([])
    await GET(cronReq())
    expect(syncInstagramAccount).not.toHaveBeenCalled()
  })
})

// ─── Sync success ─────────────────────────────────────────────────────────────

describe('GET /api/cron/sync-instagram — success', () => {
  it('calls syncInstagramAccount with account and userId', async () => {
    const account = makeAccount()
    vi.mocked(prisma.socialAccount.findMany).mockResolvedValue([account as any])

    await GET(cronReq())

    expect(syncInstagramAccount).toHaveBeenCalledWith(account, account.userId)
  })

  it('returns succeeded=1 and failed=0 for one successful account', async () => {
    vi.mocked(prisma.socialAccount.findMany).mockResolvedValue([makeAccount() as any])

    const res = await GET(cronReq())
    const body = await res.json()
    expect(body.processed).toBe(1)
    expect(body.succeeded).toBe(1)
    expect(body.failed).toBe(0)
  })

  it('syncs multiple accounts and counts them', async () => {
    vi.mocked(prisma.socialAccount.findMany).mockResolvedValue([
      makeAccount({ id: 'acc_1', username: 'user1' }) as any,
      makeAccount({ id: 'acc_2', username: 'user2' }) as any,
      makeAccount({ id: 'acc_3', username: 'user3' }) as any,
    ])

    const res = await GET(cronReq())
    const body = await res.json()
    expect(body.processed).toBe(3)
    expect(body.succeeded).toBe(3)
    expect(syncInstagramAccount).toHaveBeenCalledTimes(3)
  })

  it('includes account username in results', async () => {
    vi.mocked(prisma.socialAccount.findMany).mockResolvedValue([
      makeAccount({ id: 'acc_1', username: 'myhandle' }) as any,
    ])

    const res = await GET(cronReq())
    const body = await res.json()
    expect(body.results[0]).toMatchObject({
      accountId: 'acc_1',
      username: 'myhandle',
      success: true,
    })
  })
})

// ─── Sync failures ────────────────────────────────────────────────────────────

describe('GET /api/cron/sync-instagram — failures', () => {
  it('returns failed=1 when syncInstagramAccount throws', async () => {
    vi.mocked(prisma.socialAccount.findMany).mockResolvedValue([makeAccount() as any])
    vi.mocked(syncInstagramAccount).mockRejectedValue(new Error('Token expired'))

    const res = await GET(cronReq())
    const body = await res.json()
    expect(res.status).toBe(200) // cron should never 500
    expect(body.failed).toBe(1)
    expect(body.succeeded).toBe(0)
  })

  it('includes error message in failed result', async () => {
    vi.mocked(prisma.socialAccount.findMany).mockResolvedValue([
      makeAccount({ username: 'failaccount' }) as any,
    ])
    vi.mocked(syncInstagramAccount).mockRejectedValue(new Error('Rate limit exceeded'))

    const res = await GET(cronReq())
    const body = await res.json()
    expect(body.results[0]).toMatchObject({
      success: false,
      error: 'Rate limit exceeded',
      username: 'failaccount',
    })
  })

  it('continues syncing remaining accounts after one fails', async () => {
    vi.mocked(prisma.socialAccount.findMany).mockResolvedValue([
      makeAccount({ id: 'acc_1', username: 'fails' }) as any,
      makeAccount({ id: 'acc_2', username: 'succeeds' }) as any,
    ])
    vi.mocked(syncInstagramAccount)
      .mockRejectedValueOnce(new Error('API error'))
      .mockResolvedValueOnce({
        profile: true, insights: true, mediaSynced: 3,
        followers: 500, newFollowers: 5, reach: 2000, impressions: 3000,
      })

    const res = await GET(cronReq())
    const body = await res.json()
    expect(body.succeeded).toBe(1)
    expect(body.failed).toBe(1)
    expect(syncInstagramAccount).toHaveBeenCalledTimes(2)
  })
})
