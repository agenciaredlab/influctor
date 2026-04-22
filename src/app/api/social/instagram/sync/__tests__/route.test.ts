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
    instagramMedia: {
      findMany: vi.fn(),
    },
  },
}))

vi.mock('@/lib/instagram-sync', () => ({
  syncInstagramAccount: vi.fn().mockResolvedValue({ snapshotsCreated: 1, mediaUpserted: 5 }),
}))

import { getApiSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { syncInstagramAccount } from '@/lib/instagram-sync'

const SESSION  = { id: 'user_1', email: 'test@example.com', name: 'Test', plan: 'creator' }
const ACCOUNT  = {
  id: 'acc_1', userId: 'user_1', platform: 'instagram', isActive: true,
  username: 'testuser', displayName: 'Test User', profilePicture: null,
  biography: null, website: null, followersCount: 5000, followingCount: 200,
  mediaCount: 120, accountType: 'BUSINESS', lastSyncAt: null, tokenExpiresAt: null,
  refreshToken: 'refresh_token', snapshots: [],
}

function makeReq() {
  return new NextRequest('http://localhost/api/social/instagram/sync', { method: 'POST' })
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('POST /api/social/instagram/sync', () => {
  it('returns 401 when not authenticated', async () => {
    vi.mocked(getApiSession).mockResolvedValue(null)
    const res = await POST(makeReq())
    expect(res.status).toBe(401)
  })

  it('returns 404 when no active instagram account connected', async () => {
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.socialAccount.findFirst).mockResolvedValue(null)

    const res = await POST(makeReq())
    expect(res.status).toBe(404)
  })

  it('returns 401 and deactivates account when token is expired', async () => {
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    const expiredAt = new Date(Date.now() - 86400_000)
    vi.mocked(prisma.socialAccount.findFirst).mockResolvedValue({
      ...ACCOUNT, tokenExpiresAt: expiredAt,
    } as any)
    vi.mocked(prisma.socialAccount.update).mockResolvedValue({} as any)

    const res = await POST(makeReq())
    expect(res.status).toBe(401)
    expect(prisma.socialAccount.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { isActive: false } })
    )
  })

  it('calls syncInstagramAccount and returns success', async () => {
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.socialAccount.findFirst).mockResolvedValue(ACCOUNT as any)

    const res = await POST(makeReq())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.synced).toBeDefined()
    expect(syncInstagramAccount).toHaveBeenCalledWith(ACCOUNT, 'user_1')
  })
})

describe('GET /api/social/instagram/sync', () => {
  it('returns connected:false when not authenticated', async () => {
    vi.mocked(getApiSession).mockResolvedValue(null)
    const res = await GET(makeReq())
    expect(res.status).toBe(200)
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
    vi.mocked(prisma.instagramMedia.findMany).mockResolvedValue([])

    const res = await GET(makeReq())
    const body = await res.json()
    expect(body.connected).toBe(true)
    expect(body.account.username).toBe('testuser')
    expect(body.account.followersCount).toBe(5000)
  })
})
