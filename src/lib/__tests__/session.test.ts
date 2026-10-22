import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    teamMembership: { findUnique: vi.fn() },
    user:           { findUnique: vi.fn() },
    apiKey:         { findUnique: vi.fn(), update: vi.fn() },
  },
}))

vi.mock('next-auth', () => ({ getServerSession: vi.fn() }))
vi.mock('@/lib/auth', () => ({ authOptions: {} }))
vi.mock('next/headers', () => ({ headers: vi.fn() }))
// Same behavior as Next's redirect(): throws so execution stops.
vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => { throw new Error(`NEXT_REDIRECT:${url}`) }),
}))

import { getServerSession } from 'next-auth'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { resolveAccount, getApiSession, getSessionUser } from '../session'

const ALL_FLAGS_TRUE = {
  canManageContent: true, canManageDeals: true, canManageCompetitors: true,
  canConnectSocialAccounts: true, canUseAI: true, canViewIncome: true,
}

function activeMembership(memberId: string, ownerActive: boolean | undefined, over: Record<string, unknown> = {}) {
  return {
    id: 'tm_x', ownerId: 'owner_1', memberId, invitedEmail: 'x@y.com', status: 'active',
    ...ALL_FLAGS_TRUE, invitedAt: new Date(), acceptedAt: new Date(),
    owner: ownerActive === undefined ? undefined : { active: ownerActive },
    ...over,
  } as any
}

beforeEach(() => {
  vi.resetAllMocks()
})

describe('resolveAccount', () => {
  it('resolves a solo user (no membership row) to themselves with full permissions', async () => {
    vi.mocked(prisma.teamMembership.findUnique).mockResolvedValue(null)
    const { accountId, permissions } = (await resolveAccount('user_1'))!
    expect(accountId).toBe('user_1')
    expect(permissions).toEqual(ALL_FLAGS_TRUE)
  })

  it('resolves an active team member to the owner account with their exact permissions', async () => {
    vi.mocked(prisma.teamMembership.findUnique).mockResolvedValue({
      id: 'tm_1', ownerId: 'owner_1', memberId: 'user_2', invitedEmail: 'x@y.com', status: 'active',
      canManageContent: true, canManageDeals: false, canManageCompetitors: false,
      canConnectSocialAccounts: false, canUseAI: true, canViewIncome: false,
      invitedAt: new Date(), acceptedAt: new Date(),
      owner: { active: true },
    } as any)
    const { accountId, permissions } = (await resolveAccount('user_2'))!
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
    const { accountId, permissions } = (await resolveAccount('user_3'))!
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
    const { accountId } = (await resolveAccount('user_4'))!
    expect(accountId).toBe('user_4')
  })
})

describe('resolveAccount — deactivated team owner (fail-closed)', () => {
  it('returns null for an active member whose owner is inactive (no fallback to own account)', async () => {
    vi.mocked(prisma.teamMembership.findUnique).mockResolvedValue(activeMembership('user_5', false))
    expect(await resolveAccount('user_5')).toBeNull()
  })

  it('returns null if the owner relation is missing (fail-closed)', async () => {
    vi.mocked(prisma.teamMembership.findUnique).mockResolvedValue(activeMembership('user_5', undefined))
    expect(await resolveAccount('user_5')).toBeNull()
  })

  it('still resolves to the owner account when the owner is active', async () => {
    vi.mocked(prisma.teamMembership.findUnique).mockResolvedValue(activeMembership('user_5', true))
    const acc = await resolveAccount('user_5')
    expect(acc?.accountId).toBe('owner_1')
  })

  it('asks Prisma for the owner active flag in the same query', async () => {
    vi.mocked(prisma.teamMembership.findUnique).mockResolvedValue(null)
    await resolveAccount('user_6')
    expect(prisma.teamMembership.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { memberId: 'user_6' }, include: { owner: { select: { active: true } } } }),
    )
  })

  it('a revoked membership with an inactive owner does not block the person (still their own account)', async () => {
    vi.mocked(prisma.teamMembership.findUnique).mockResolvedValue(activeMembership('user_7', false, { status: 'revoked' }))
    const acc = await resolveAccount('user_7')
    expect(acc?.accountId).toBe('user_7')
  })
})

describe('getApiSession', () => {
  const cookieSession = { user: { id: 'user_1', email: 'a@b.com', name: 'A', plan: 'free', isAdmin: false } }

  beforeEach(() => {
    vi.mocked(headers).mockReturnValue({ get: () => null } as any)
    vi.mocked(getServerSession).mockResolvedValue(cookieSession as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ active: true } as any)
    vi.mocked(prisma.teamMembership.findUnique).mockResolvedValue(null)
  })

  it('solo active user with cookie: accountId is their own id, full permissions', async () => {
    const s = await getApiSession()
    expect(s).toMatchObject({ id: 'user_1', accountId: 'user_1', permissions: ALL_FLAGS_TRUE })
  })

  it('no cookie session -> null', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null)
    expect(await getApiSession()).toBeNull()
  })

  it('deactivated user with a still-valid JWT -> null', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ active: false } as any)
    expect(await getApiSession()).toBeNull()
  })

  it('user deleted from DB but JWT still valid -> null', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null)
    expect(await getApiSession()).toBeNull()
  })

  it('active member of an active owner -> owner accountId', async () => {
    vi.mocked(prisma.teamMembership.findUnique).mockResolvedValue(activeMembership('user_1', true))
    const s = await getApiSession()
    expect(s).toMatchObject({ id: 'user_1', accountId: 'owner_1' })
  })

  it('active member whose owner is deactivated -> null (not their own empty account)', async () => {
    vi.mocked(prisma.teamMembership.findUnique).mockResolvedValue(activeMembership('user_1', false))
    expect(await getApiSession()).toBeNull()
  })

  it('API key path: member of a deactivated owner -> null', async () => {
    vi.mocked(headers).mockReturnValue({ get: () => 'Bearer sk_test_abc' } as any)
    vi.mocked(prisma.apiKey.findUnique).mockResolvedValue({
      id: 'k1', revokedAt: null,
      user: { id: 'user_1', email: 'a@b.com', name: 'A', plan: 'free', isAdmin: false, active: true },
    } as any)
    vi.mocked(prisma.apiKey.update).mockResolvedValue({} as any)
    vi.mocked(prisma.teamMembership.findUnique).mockResolvedValue(activeMembership('user_1', false))
    expect(await getApiSession()).toBeNull()
  })

  it('API key path: solo active user -> session', async () => {
    vi.mocked(headers).mockReturnValue({ get: () => 'Bearer sk_test_abc' } as any)
    vi.mocked(prisma.apiKey.findUnique).mockResolvedValue({
      id: 'k1', revokedAt: null,
      user: { id: 'user_1', email: 'a@b.com', name: 'A', plan: 'free', isAdmin: false, active: true },
    } as any)
    vi.mocked(prisma.apiKey.update).mockResolvedValue({} as any)
    expect(await getApiSession()).toMatchObject({ id: 'user_1', accountId: 'user_1' })
  })
})

describe('getSessionUser', () => {
  const cookieSession = { user: { id: 'user_1' } }

  beforeEach(() => {
    vi.mocked(redirect).mockImplementation(((url: string) => { throw new Error(`NEXT_REDIRECT:${url}`) }) as any)
    vi.mocked(getServerSession).mockResolvedValue(cookieSession as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'user_1', active: true, plan: 'free' } as any)
    vi.mocked(prisma.teamMembership.findUnique).mockResolvedValue(null)
  })

  it('active solo user -> user row + own accountId', async () => {
    const u = await getSessionUser()
    expect(u).toMatchObject({ id: 'user_1', accountId: 'user_1', permissions: ALL_FLAGS_TRUE })
    expect(redirect).not.toHaveBeenCalled()
  })

  it('active member of an active owner -> owner accountId', async () => {
    vi.mocked(prisma.teamMembership.findUnique).mockResolvedValue(activeMembership('user_1', true))
    expect(await getSessionUser()).toMatchObject({ id: 'user_1', accountId: 'owner_1' })
  })

  it('active member whose owner is deactivated -> redirect(/login)', async () => {
    vi.mocked(prisma.teamMembership.findUnique).mockResolvedValue(activeMembership('user_1', false))
    await expect(getSessionUser()).rejects.toThrow('NEXT_REDIRECT:/login')
    expect(redirect).toHaveBeenCalledWith('/login')
  })

  it('deactivated user themselves -> redirect(/login) (existing behavior)', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'user_1', active: false } as any)
    await expect(getSessionUser()).rejects.toThrow('NEXT_REDIRECT:/login')
  })
})
