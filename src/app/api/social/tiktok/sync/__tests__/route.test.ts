import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST, GET } from '../route'

vi.mock('@/lib/session', () => ({ getApiSession: vi.fn() }))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    socialAccount: {
      findFirst: vi.fn(),
      update:    vi.fn(),
    },
  },
}))

vi.mock('@/lib/tiktok-sync', () => ({
  syncTikTokAccount: vi.fn().mockResolvedValue({ snapshotsCreated: 1 }),
}))

import { getApiSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { syncTikTokAccount } from '@/lib/tiktok-sync'

const SESSION = { id: 'user_1', email: 'test@example.com', name: 'Test', plan: 'creator' }
const ACCOUNT = {
  id: 'acc_1', userId: 'user_1', platform: 'tiktok', isActive: true,
  username: 'tiktoker', displayName: 'TikTok User', profilePicture: null,
  biography: null, followersCount: 10000, followingCount: 500,
  mediaCount: 80, accountType: 'creator', lastSyncAt: null,
  tokenExpiresAt: null, refreshToken: 'refresh_token', snapshots: [],
}

function makeReq() {
  return new NextRequest('http://localhost/api/social/tiktok/sync', { method: 'POST' })
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('POST /api/social/tiktok/sync', () => {
  it('returns 401 when not authenticated', async () => {
    vi.mocked(getApiSession).mockResolvedValue(null)
    const res = await POST(makeReq())
    expect(res.status).toBe(401)
  })

  it('returns 404 when no active tiktok account connected', async () => {
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.socialAccount.findFirst).mockResolvedValue(null)

    const res = await POST(makeReq())
    expect(res.status).toBe(404)
  })

  it('returns 401 and deactivates when token is expired and no refresh token', async () => {
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    const expiredAt = new Date(Date.now() - 86400_000)
    vi.mocked(prisma.socialAccount.findFirst).mockResolvedValue({
      ...ACCOUNT, tokenExpiresAt: expiredAt, refreshToken: null,
    } as any)
    vi.mocked(prisma.socialAccount.update).mockResolvedValue({} as any)

    const res = await POST(makeReq())
    expect(res.status).toBe(401)
    expect(prisma.socialAccount.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { isActive: false } })
    )
  })

  it('calls syncTikTokAccount and returns success', async () => {
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.socialAccount.findFirst).mockResolvedValue(ACCOUNT as any)

    const res = await POST(makeReq())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(syncTikTokAccount).toHaveBeenCalledWith(ACCOUNT, 'user_1')
  })

  it('does NOT expire account that has a refresh token even if tokenExpiresAt is old', async () => {
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    const expiredAt = new Date(Date.now() - 86400_000)
    vi.mocked(prisma.socialAccount.findFirst).mockResolvedValue({
      ...ACCOUNT, tokenExpiresAt: expiredAt, refreshToken: 'still_valid_refresh',
    } as any)

    const res = await POST(makeReq())
    // Should proceed to sync, not deactivate
    expect(res.status).toBe(200)
    expect(prisma.socialAccount.update).not.toHaveBeenCalled()
  })
})

describe('GET /api/social/tiktok/sync', () => {
  it('returns connected:false when not authenticated', async () => {
    vi.mocked(getApiSession).mockResolvedValue(null)
    const res = await GET(makeReq())
    const body = await res.json()
    expect(body.connected).toBe(false)
  })

  it('returns connected:false when no active account', async () => {
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.socialAccount.findFirst).mockResolvedValue(null)

    const res = await GET(makeReq())
    const body = await res.json()
    expect(body.connected).toBe(false)
  })

  it('returns account data and snapshots when connected', async () => {
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.socialAccount.findFirst).mockResolvedValue({
      ...ACCOUNT, snapshots: [],
    } as any)

    const res = await GET(makeReq())
    const body = await res.json()
    expect(body.connected).toBe(true)
    expect(body.account.username).toBe('tiktoker')
    expect(body.account.followersCount).toBe(10000)
  })
})
