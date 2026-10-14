import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getAccountUser } from '../account'

vi.mock('@/lib/prisma', () => ({
  prisma: { user: { findUnique: vi.fn() } },
}))

import { prisma } from '@/lib/prisma'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('getAccountUser', () => {
  it('loads the user row of the given account id (the OWNER, not the logged-in member)', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'owner_1', plan: 'pro' } as any)
    const u = await getAccountUser('owner_1')
    expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: 'owner_1' } })
    expect(u?.plan).toBe('pro')
  })

  it('returns null when the account does not exist (callers fail closed)', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null)
    expect(await getAccountUser('ghost')).toBeNull()
  })
})
