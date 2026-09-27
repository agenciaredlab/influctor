import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from '../route'

vi.mock('@/lib/session', () => ({ getApiSession: vi.fn() }))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user:           { findUnique: vi.fn() },
    teamMembership: { findMany: vi.fn(), count: vi.fn(), findUnique: vi.fn(), create: vi.fn() },
  },
}))

vi.mock('@/lib/email', () => ({ sendTeamInviteEmail: vi.fn().mockResolvedValue(undefined) }))
vi.mock('@/lib/config', () => ({ getAppUrl: vi.fn().mockResolvedValue('https://app.test') }))

import { getApiSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { sendTeamInviteEmail } from '@/lib/email'

const OWNER_SESSION = { id: 'owner_1', email: 'owner@x.com', accountId: 'owner_1', permissions: {} }
const MEMBER_SESSION = { id: 'member_1', email: 'member@x.com', accountId: 'owner_1', permissions: {} }
const OWNER_USER = { id: 'owner_1', name: 'Ana Dueña', email: 'owner@x.com', plan: 'pro' }

function inviteReq(body: unknown) {
  return new NextRequest('http://localhost/api/team', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(prisma.user.findUnique).mockImplementation(async ({ where }: any) => {
    if (where.id === 'owner_1') return OWNER_USER as any
    return null
  })
  vi.mocked(prisma.teamMembership.count).mockResolvedValue(0)
  vi.mocked(prisma.teamMembership.findUnique).mockResolvedValue(null)
  vi.mocked(prisma.teamMembership.create).mockResolvedValue({ id: 'tm_1', invitedEmail: 'new@x.com' } as any)
})

describe('GET /api/team', () => {
  it('returns 403 for a team member (not the owner)', async () => {
    vi.mocked(getApiSession).mockResolvedValue(MEMBER_SESSION as any)
    const res = await GET()
    expect(res.status).toBe(403)
    expect(prisma.teamMembership.findMany).not.toHaveBeenCalled()
  })

  it('lists the owner\'s team', async () => {
    vi.mocked(getApiSession).mockResolvedValue(OWNER_SESSION as any)
    vi.mocked(prisma.teamMembership.findMany).mockResolvedValue([{ id: 'tm_1' }] as any)
    const res = await GET()
    expect(res.status).toBe(200)
    expect(prisma.teamMembership.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { ownerId: 'owner_1' } })
    )
  })
})

describe('POST /api/team — invite', () => {
  it('returns 403 when the caller is a team member, not the owner', async () => {
    vi.mocked(getApiSession).mockResolvedValue(MEMBER_SESSION as any)
    const res = await POST(inviteReq({ email: 'new@x.com' }))
    expect(res.status).toBe(403)
  })

  it('returns 403 when the plan has no team seats (free/creator)', async () => {
    vi.mocked(getApiSession).mockResolvedValue(OWNER_SESSION as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ ...OWNER_USER, plan: 'creator' } as any)
    const res = await POST(inviteReq({ email: 'new@x.com' }))
    expect(res.status).toBe(403)
    expect(prisma.teamMembership.create).not.toHaveBeenCalled()
  })

  it('returns 403 when the team is already at the plan limit', async () => {
    vi.mocked(getApiSession).mockResolvedValue(OWNER_SESSION as any)
    vi.mocked(prisma.teamMembership.count).mockResolvedValue(5) // pro limit
    const res = await POST(inviteReq({ email: 'new@x.com' }))
    expect(res.status).toBe(403)
    expect(prisma.teamMembership.create).not.toHaveBeenCalled()
  })

  it('returns 409 when the invited email already has an Influctor account', async () => {
    vi.mocked(getApiSession).mockResolvedValue(OWNER_SESSION as any)
    vi.mocked(prisma.user.findUnique).mockImplementation(async ({ where }: any) => {
      if (where.id === 'owner_1') return OWNER_USER as any
      if (where.email === 'existing@x.com') return { id: 'someone' } as any
      return null
    })
    const res = await POST(inviteReq({ email: 'existing@x.com' }))
    expect(res.status).toBe(409)
    expect(prisma.teamMembership.create).not.toHaveBeenCalled()
  })

  it('creates the membership with the ticked permissions and emails the invite', async () => {
    vi.mocked(getApiSession).mockResolvedValue(OWNER_SESSION as any)
    const res = await POST(inviteReq({ email: 'new@x.com', canManageContent: true, canManageDeals: false }))
    expect(res.status).toBe(201)
    expect(prisma.teamMembership.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        ownerId: 'owner_1', invitedEmail: 'new@x.com',
        canManageContent: true, canManageDeals: false, canManageCompetitors: false,
        canConnectSocialAccounts: false, canUseAI: false, canViewIncome: false,
      }),
    })
    expect(sendTeamInviteEmail).toHaveBeenCalledWith(expect.objectContaining({ invitedEmail: 'new@x.com', ownerName: 'Ana Dueña' }))
  })
})
