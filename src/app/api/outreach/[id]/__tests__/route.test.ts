import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { OWNER_PERMS, memberSession } from '@/test-utils/team'
import { PATCH, DELETE } from '../route'

vi.mock('@/lib/session', () => ({ getApiSession: vi.fn() }))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    outreachEntry: { findFirst: vi.fn(), update: vi.fn(), delete: vi.fn() },
  },
}))

import { getApiSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'

const OWNER = { id: 'user_1', email: 'o@x.com', name: 'O', plan: 'creator', accountId: 'user_1', permissions: OWNER_PERMS }
const params = { params: { id: 'out_1' } }
const patch  = () => PATCH(new NextRequest('http://localhost/api/outreach/out_1', {
  method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'replied' }),
}), params)
const del    = () => DELETE(new NextRequest('http://localhost/api/outreach/out_1', { method: 'DELETE' }), params)
const mutations: Array<[string, () => Promise<Response>]> = [['PATCH', patch], ['DELETE', del]]

beforeEach(() => {
  vi.clearAllMocks()
})

describe('outreach/[id]', () => {
  it.each(mutations)('%s returns 401 when not authenticated', async (_n, run) => {
    vi.mocked(getApiSession).mockResolvedValue(null)
    const res = await run()
    expect(res.status).toBe(401)
  })

  it.each(mutations)('%s returns 404 when the entry is not in the account', async (_n, run) => {
    vi.mocked(getApiSession).mockResolvedValue(OWNER as any)
    vi.mocked(prisma.outreachEntry.findFirst).mockResolvedValue(null)
    const res = await run()
    expect(res.status).toBe(404)
    expect(prisma.outreachEntry.findFirst).toHaveBeenCalledWith({ where: { id: 'out_1', userId: 'user_1' } })
  })

  it.each(mutations)('%s without canManageDeals -> 403, nothing read or written', async (_n, run) => {
    vi.mocked(getApiSession).mockResolvedValue(memberSession({ canManageContent: true }) as any)
    const res = await run()
    expect(res.status).toBe(403)
    expect(prisma.outreachEntry.findFirst).not.toHaveBeenCalled()
    expect(prisma.outreachEntry.update).not.toHaveBeenCalled()
    expect(prisma.outreachEntry.delete).not.toHaveBeenCalled()
  })

  it.each(mutations)('%s with canManageDeals resolves the entry under the OWNER accountId', async (_n, run) => {
    vi.mocked(getApiSession).mockResolvedValue(memberSession({ canManageDeals: true }) as any)
    vi.mocked(prisma.outreachEntry.findFirst).mockResolvedValue({ id: 'out_1' } as any)
    vi.mocked(prisma.outreachEntry.update).mockResolvedValue({ id: 'out_1' } as any)
    vi.mocked(prisma.outreachEntry.delete).mockResolvedValue({ id: 'out_1' } as any)
    const res = await run()
    expect(res.status).toBe(200)
    expect(prisma.outreachEntry.findFirst).toHaveBeenCalledWith({ where: { id: 'out_1', userId: 'owner_1' } })
  })
})
