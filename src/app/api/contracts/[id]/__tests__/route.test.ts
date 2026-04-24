import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, DELETE } from '../route'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    contract: { findFirst: vi.fn(), delete: vi.fn() },
  },
}))

vi.mock('@/lib/session', () => ({
  getApiSession: vi.fn(),
}))

import { prisma } from '@/lib/prisma'
import { getApiSession } from '@/lib/session'

const SESSION  = { id: 'user_1', email: 'creator@test.com', name: 'Ana' }
const CONTRACT = { id: 'c1', title: 'Nike Deal', type: 'sponsored', fields: '{}', content: 'text', userId: 'user_1', createdAt: new Date() }

function req(method = 'GET') {
  return new NextRequest('http://localhost/api/contracts/c1', { method })
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
  vi.mocked(prisma.contract.findFirst).mockResolvedValue(CONTRACT as any)
  vi.mocked(prisma.contract.delete).mockResolvedValue(CONTRACT as any)
})

describe('GET /api/contracts/[id]', () => {
  it('returns 401 when not authenticated', async () => {
    vi.mocked(getApiSession).mockResolvedValue(null)
    const res = await GET(req(), { params: { id: 'c1' } })
    expect(res.status).toBe(401)
  })

  it('returns 404 when contract not found or not owned', async () => {
    vi.mocked(prisma.contract.findFirst).mockResolvedValue(null)
    const res = await GET(req(), { params: { id: 'c1' } })
    expect(res.status).toBe(404)
  })

  it('returns the contract when found', async () => {
    const res  = await GET(req(), { params: { id: 'c1' } })
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.id).toBe('c1')
    expect(body.title).toBe('Nike Deal')
  })

  it('scopes query to authenticated user', async () => {
    await GET(req(), { params: { id: 'c1' } })
    expect(prisma.contract.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'c1', userId: 'user_1' } })
    )
  })
})

describe('DELETE /api/contracts/[id]', () => {
  it('returns 401 when not authenticated', async () => {
    vi.mocked(getApiSession).mockResolvedValue(null)
    const res = await DELETE(req('DELETE'), { params: { id: 'c1' } })
    expect(res.status).toBe(401)
  })

  it('returns 404 when contract not found or not owned', async () => {
    vi.mocked(prisma.contract.findFirst).mockResolvedValue(null)
    const res = await DELETE(req('DELETE'), { params: { id: 'c1' } })
    expect(res.status).toBe(404)
  })

  it('deletes the contract and returns success', async () => {
    const res  = await DELETE(req('DELETE'), { params: { id: 'c1' } })
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(prisma.contract.delete).toHaveBeenCalledWith({ where: { id: 'c1' } })
  })

  it('returns 500 when DB throws', async () => {
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.contract.findFirst).mockRejectedValue(new Error('DB error'))
    const res = await DELETE(req('DELETE'), { params: { id: 'c1' } })
    expect(res.status).toBe(500)
  })
})
