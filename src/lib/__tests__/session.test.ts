import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    teamMembership: { findUnique: vi.fn() },
  },
}))

import { prisma } from '@/lib/prisma'
import { resolveAccount } from '../session'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('resolveAccount', () => {
  it('resolves a solo user (no membership row) to themselves with full permissions', async () => {
    vi.mocked(prisma.teamMembership.findUnique).mockResolvedValue(null)
    const { accountId, permissions } = await resolveAccount('user_1')
    expect(accountId).toBe('user_1')
    expect(permissions).toEqual({
      canManageContent: true, canManageDeals: true, canManageCompetitors: true,
      canConnectSocialAccounts: true, canUseAI: true, canViewIncome: true,
    })
  })

  it('resolves an active team member to the owner account with their exact permissions', async () => {
    vi.mocked(prisma.teamMembership.findUnique).mockResolvedValue({
      id: 'tm_1', ownerId: 'owner_1', memberId: 'user_2', invitedEmail: 'x@y.com', status: 'active',
      canManageContent: true, canManageDeals: false, canManageCompetitors: false,
      canConnectSocialAccounts: false, canUseAI: true, canViewIncome: false,
      invitedAt: new Date(), acceptedAt: new Date(),
    } as any)
    const { accountId, permissions } = await resolveAccount('user_2')
    expect(accountId).toBe('owner_1')
    expect(permissions).toEqual({
      canManageContent: true, canManageDeals: false, canManageCompetitors: false,
      canConnectSocialAccounts: false, canUseAI: true, canViewIncome: false,
    })
  })

  it('falls back to solo/self when the membership row exists but is not active yet (pending)', async () => {
    vi.mocked(prisma.teamMembership.findUnique).mockResolvedValue({
      id: 'tm_2', ownerId: 'owner_1', memberId: 'user_3', invitedEmail: 'x@y.com', status: 'pending',
      canManageContent: true, canManageDeals: true, canManageCompetitors: true,
      canConnectSocialAccounts: true, canUseAI: true, canViewIncome: true,
      invitedAt: new Date(), acceptedAt: null,
    } as any)
    const { accountId, permissions } = await resolveAccount('user_3')
    expect(accountId).toBe('user_3')
    expect(permissions.canManageDeals).toBe(true) // solo/self always has full permissions on themselves
  })

  it('falls back to solo/self when the membership was revoked', async () => {
    vi.mocked(prisma.teamMembership.findUnique).mockResolvedValue({
      id: 'tm_3', ownerId: 'owner_1', memberId: 'user_4', invitedEmail: 'x@y.com', status: 'revoked',
      canManageContent: false, canManageDeals: false, canManageCompetitors: false,
      canConnectSocialAccounts: false, canUseAI: false, canViewIncome: false,
      invitedAt: new Date(), acceptedAt: new Date(),
    } as any)
    const { accountId } = await resolveAccount('user_4')
    expect(accountId).toBe('user_4')
  })
})
