import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, PATCH, DELETE } from '../route'

vi.mock('@/lib/session', () => ({ getApiSession: vi.fn() }))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn(), update: vi.fn(), delete: vi.fn() },
  },
}))

import { getApiSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { memberSession } from '@/test-utils/team'

const ALL_TRUE = {
  canManageContent: true, canManageDeals: true, canManageCompetitors: true,
  canConnectSocialAccounts: true, canUseAI: true, canViewIncome: true,
}

const ADMIN_SESSION = { id: 'admin_1', accountId: 'admin_1' }

function patchReq(body: unknown) {
  return new NextRequest('http://localhost/api/admin/users/u_2', {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  })
}
const delReq = () => new NextRequest('http://localhost/api/admin/users/u_2', { method: 'DELETE' })
const ctx = { params: { id: 'u_2' } }

beforeEach(() => {
  vi.resetAllMocks()
})

describe('/api/admin/users/[id] — admin only, read from DB (not from the session/JWT)', () => {
  it('401-equivalent: no session -> 403 and no writes', async () => {
    vi.mocked(getApiSession).mockResolvedValue(null)
    expect((await PATCH(patchReq({ plan: 'pro' }), ctx)).status).toBe(403)
    expect((await DELETE(delReq(), ctx)).status).toBe(403)
    expect(prisma.user.update).not.toHaveBeenCalled()
    expect(prisma.user.delete).not.toHaveBeenCalled()
  })

  it('non-admin user -> 403 on GET, PATCH (change plan) and DELETE, no writes', async () => {
    vi.mocked(getApiSession).mockResolvedValue({ id: 'u_1', accountId: 'u_1', isAdmin: false } as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ isAdmin: false } as any)
    expect((await GET(delReq(), ctx)).status).toBe(403)
    expect((await PATCH(patchReq({ plan: 'pro' }), ctx)).status).toBe(403)
    expect((await DELETE(delReq(), ctx)).status).toBe(403)
    expect(prisma.user.update).not.toHaveBeenCalled()
    expect(prisma.user.delete).not.toHaveBeenCalled()
  })

  it('team member with ALL six permissions is still not admin -> 403 on PATCH and DELETE', async () => {
    vi.mocked(getApiSession).mockResolvedValue(memberSession(ALL_TRUE) as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ isAdmin: false } as any)
    expect((await PATCH(patchReq({ plan: 'pro', active: false }), ctx)).status).toBe(403)
    expect((await DELETE(delReq(), ctx)).status).toBe(403)
    expect(prisma.user.update).not.toHaveBeenCalled()
    expect(prisma.user.delete).not.toHaveBeenCalled()
  })

  it('a forged isAdmin on the session object is ignored: isAdmin is re-read from the DB', async () => {
    vi.mocked(getApiSession).mockResolvedValue({ id: 'u_1', accountId: 'u_1', isAdmin: true } as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ isAdmin: false } as any)
    expect((await PATCH(patchReq({ plan: 'pro' }), ctx)).status).toBe(403)
    expect(prisma.user.update).not.toHaveBeenCalled()
  })

  it('admin (per DB) can change a plan', async () => {
    vi.mocked(getApiSession).mockResolvedValue(ADMIN_SESSION as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ isAdmin: true } as any)
    vi.mocked(prisma.user.update).mockResolvedValue({ id: 'u_2', name: 'N', email: 'e@x.com', plan: 'pro', active: true } as any)
    const res = await PATCH(patchReq({ plan: 'pro' }), ctx)
    expect(res.status).toBe(200)
    expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'u_2' }, data: { plan: 'pro' } }))
  })

  it('admin cannot delete themselves', async () => {
    vi.mocked(getApiSession).mockResolvedValue(ADMIN_SESSION as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ isAdmin: true } as any)
    const res = await DELETE(delReq(), { params: { id: 'admin_1' } })
    expect(res.status).toBe(400)
    expect(prisma.user.delete).not.toHaveBeenCalled()
  })
})
