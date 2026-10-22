import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { PATCH, DELETE } from '../route'

vi.mock('@/lib/session', () => ({ getApiSession: vi.fn() }))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    teamMembership: { findUnique: vi.fn(), update: vi.fn(), delete: vi.fn() },
  },
}))

import { getApiSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { memberSession } from '@/test-utils/team'

const OWNER_SESSION  = { id: 'owner_1', accountId: 'owner_1' }
const MEMBER_SESSION = { id: 'member_1', accountId: 'owner_1' }
const MEMBERSHIP = { id: 'tm_1', ownerId: 'owner_1', invitedEmail: 'x@y.com' }

function patchReq(body: unknown) {
  return new NextRequest('http://localhost/api/team/tm_1', {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(prisma.teamMembership.findUnique).mockResolvedValue(MEMBERSHIP as any)
})

const ALL_PERMS_TRUE = {
  canManageContent: true, canManageDeals: true, canManageCompetitors: true,
  canConnectSocialAccounts: true, canUseAI: true, canViewIncome: true,
}

describe('/api/team/[id] — never delegable: a member with ALL six permissions is still blocked', () => {
  it('PATCH (edit permissions, e.g. self-escalation) returns 403 with no writes', async () => {
    vi.mocked(getApiSession).mockResolvedValue(memberSession(ALL_PERMS_TRUE) as any)
    const res = await PATCH(patchReq(ALL_PERMS_TRUE), { params: { id: 'tm_1' } })
    expect(res.status).toBe(403)
    expect(prisma.teamMembership.findUnique).not.toHaveBeenCalled()
    expect(prisma.teamMembership.update).not.toHaveBeenCalled()
  })

  it('DELETE (remove a member / cancel an invite) returns 403 with no writes', async () => {
    vi.mocked(getApiSession).mockResolvedValue(memberSession(ALL_PERMS_TRUE) as any)
    const res = await DELETE(new NextRequest('http://localhost/api/team/tm_1'), { params: { id: 'tm_1' } })
    expect(res.status).toBe(403)
    expect(prisma.teamMembership.findUnique).not.toHaveBeenCalled()
    expect(prisma.teamMembership.delete).not.toHaveBeenCalled()
  })
})

describe('PATCH /api/team/[id]', () => {
  it('returns 403 for a team member (only the owner manages permissions)', async () => {
    vi.mocked(getApiSession).mockResolvedValue(MEMBER_SESSION as any)
    const res = await PATCH(patchReq({ canManageDeals: true }), { params: { id: 'tm_1' } })
    expect(res.status).toBe(403)
    expect(prisma.teamMembership.update).not.toHaveBeenCalled()
  })

  it('returns 404 when the membership does not belong to this owner', async () => {
    vi.mocked(getApiSession).mockResolvedValue({ id: 'other_owner', accountId: 'other_owner' } as any)
    const res = await PATCH(patchReq({ canManageDeals: true }), { params: { id: 'tm_1' } })
    expect(res.status).toBe(404)
    expect(prisma.teamMembership.update).not.toHaveBeenCalled()
  })

  it('updates only the recognized permission keys', async () => {
    vi.mocked(getApiSession).mockResolvedValue(OWNER_SESSION as any)
    vi.mocked(prisma.teamMembership.update).mockResolvedValue({ ...MEMBERSHIP, canManageDeals: true } as any)
    const res = await PATCH(patchReq({ canManageDeals: true, notARealField: 'x' }), { params: { id: 'tm_1' } })
    expect(res.status).toBe(200)
    expect(prisma.teamMembership.update).toHaveBeenCalledWith({ where: { id: 'tm_1' }, data: { canManageDeals: true } })
  })
})

describe('DELETE /api/team/[id]', () => {
  it('returns 403 for a team member', async () => {
    vi.mocked(getApiSession).mockResolvedValue(MEMBER_SESSION as any)
    const res = await DELETE(new NextRequest('http://localhost/api/team/tm_1'), { params: { id: 'tm_1' } })
    expect(res.status).toBe(403)
    expect(prisma.teamMembership.delete).not.toHaveBeenCalled()
  })

  it('removes the membership when called by its owner', async () => {
    vi.mocked(getApiSession).mockResolvedValue(OWNER_SESSION as any)
    const res = await DELETE(new NextRequest('http://localhost/api/team/tm_1'), { params: { id: 'tm_1' } })
    expect(res.status).toBe(200)
    expect(prisma.teamMembership.delete).toHaveBeenCalledWith({ where: { id: 'tm_1' } })
  })
})
