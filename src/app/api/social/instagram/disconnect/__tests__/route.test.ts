import { describe, it, expect, vi, beforeEach } from 'vitest'
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

const SESSION = { id: 'user_1', email: 'test@example.com', name: 'Test', plan: 'creator' }

beforeEach(() => {
  vi.clearAllMocks()
})

describe('POST /api/social/instagram/disconnect', () => {
  it('returns 401 when not authenticated', async () => {
    vi.mocked(getApiSession).mockResolvedValue(null)
    const res = await POST()
    expect(res.status).toBe(401)
  })

  it('deactivates instagram accounts for the user', async () => {
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.socialAccount.updateMany).mockResolvedValue({ count: 1 })

    const res = await POST()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })

  it('scopes updateMany to userId and instagram platform', async () => {
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.socialAccount.updateMany).mockResolvedValue({ count: 1 })

    await POST()

    expect(prisma.socialAccount.updateMany).toHaveBeenCalledWith({
      where: { userId: 'user_1', platform: 'instagram' },
      data: { isActive: false },
    })
  })
})
