import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from '../route'

vi.mock('bcryptjs', () => ({ default: { hash: vi.fn().mockResolvedValue('hashed') } }))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    teamMembership: { findUnique: vi.fn(), update: vi.fn() },
    user:           { findUnique: vi.fn(), create: vi.fn() },
    $transaction:   vi.fn(),
  },
}))

import { prisma } from '@/lib/prisma'

const PENDING = { id: 'tm_1', status: 'pending', invitedEmail: 'joins@x.com', owner: { name: 'Ana Dueña' } }

function acceptReq(body: unknown) {
  return new NextRequest('http://localhost/api/team/accept/tm_1', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(prisma.$transaction).mockImplementation((async (fn: any) => fn(prisma)) as any)
})

describe('GET /api/team/accept/[id]', () => {
  it('returns 404 for a non-existent or already-used invite', async () => {
    vi.mocked(prisma.teamMembership.findUnique).mockResolvedValue(null)
    const res = await GET(new NextRequest('http://localhost/x'), { params: { id: 'tm_1' } })
    expect(res.status).toBe(404)
  })

  it('returns 404 when the invite was already accepted', async () => {
    vi.mocked(prisma.teamMembership.findUnique).mockResolvedValue({ ...PENDING, status: 'active' } as any)
    const res = await GET(new NextRequest('http://localhost/x'), { params: { id: 'tm_1' } })
    expect(res.status).toBe(404)
  })

  it('returns the invited email and owner name for a pending invite', async () => {
    vi.mocked(prisma.teamMembership.findUnique).mockResolvedValue(PENDING as any)
    const res = await GET(new NextRequest('http://localhost/x'), { params: { id: 'tm_1' } })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({ invitedEmail: 'joins@x.com', ownerName: 'Ana Dueña' })
  })
})

describe('POST /api/team/accept/[id]', () => {
  beforeEach(() => {
    vi.mocked(prisma.teamMembership.findUnique).mockResolvedValue(PENDING as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.user.create).mockResolvedValue({ id: 'new_user' } as any)
  })

  it('returns 404 for a non-pending invite', async () => {
    vi.mocked(prisma.teamMembership.findUnique).mockResolvedValue({ ...PENDING, status: 'revoked' } as any)
    const res = await POST(acceptReq({ name: 'X', password: 'password123' }), { params: { id: 'tm_1' } })
    expect(res.status).toBe(404)
  })

  it('returns 400 when the password is too short', async () => {
    const res = await POST(acceptReq({ name: 'X', password: 'short' }), { params: { id: 'tm_1' } })
    expect(res.status).toBe(400)
    expect(prisma.user.create).not.toHaveBeenCalled()
  })

  it('returns 409 if the invited email already has an account', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'already_here' } as any)
    const res = await POST(acceptReq({ name: 'X', password: 'password123' }), { params: { id: 'tm_1' } })
    expect(res.status).toBe(409)
    expect(prisma.user.create).not.toHaveBeenCalled()
  })

  it('creates the user and activates the membership together', async () => {
    const res = await POST(acceptReq({ name: 'Nuevo', password: 'password123' }), { params: { id: 'tm_1' } })
    expect(res.status).toBe(200)
    expect(prisma.user.create).toHaveBeenCalledWith({
      data: { name: 'Nuevo', email: 'joins@x.com', password: 'hashed' },
    })
    expect(prisma.teamMembership.update).toHaveBeenCalledWith({
      where: { id: 'tm_1' },
      data:  expect.objectContaining({ memberId: 'new_user', status: 'active' }),
    })
  })
})
