import { describe, it, expect, vi, beforeEach } from 'vitest'
import { OWNER_PERMS, NO_PERMS, memberSession } from '@/test-utils/team'
import { POST } from '../route'

vi.mock('@/lib/session', () => ({ getApiSession: vi.fn() }))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    socialAccount: {
      updateMany: vi.fn(),
    },
  },
}))

import { getApiSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'

const SESSION = { id: 'user_1', email: 'test@example.com', name: 'Test', plan: 'creator', accountId: 'user_1', permissions: OWNER_PERMS }

beforeEach(() => {
  vi.clearAllMocks()
})

describe('POST /api/social/tiktok/disconnect', () => {
  it('returns 401 when not authenticated', async () => {
    vi.mocked(getApiSession).mockResolvedValue(null)
    const res = await POST()
    expect(res.status).toBe(401)
  })

  it('deactivates tiktok accounts for the user', async () => {
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.socialAccount.updateMany).mockResolvedValue({ count: 1 })

    const res = await POST()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })

  it('scopes updateMany to userId and tiktok platform', async () => {
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.socialAccount.updateMany).mockResolvedValue({ count: 1 })

    await POST()

    expect(prisma.socialAccount.updateMany).toHaveBeenCalledWith({
      where: { userId: 'user_1', platform: 'tiktok' },
      data: { isActive: false },
    })
  })
})

describe('team member (shared workspace) — tiktok disconnect', () => {
  it('without canConnectSocialAccounts -> 403, nothing updated', async () => {
    vi.mocked(getApiSession).mockResolvedValue(memberSession({ canManageContent: true }) as any)
    const res = await POST()
    expect(res.status).toBe(403)
    expect(prisma.socialAccount.updateMany).not.toHaveBeenCalled()
  })

  it('with canConnectSocialAccounts disconnects the OWNER account', async () => {
    vi.mocked(getApiSession).mockResolvedValue(memberSession({ canConnectSocialAccounts: true }) as any)
    vi.mocked(prisma.socialAccount.updateMany).mockResolvedValue({ count: 1 })
    const res = await POST()
    expect(res.status).toBe(200)
    expect(prisma.socialAccount.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'owner_1', platform: 'tiktok' } })
    )
  })
})
