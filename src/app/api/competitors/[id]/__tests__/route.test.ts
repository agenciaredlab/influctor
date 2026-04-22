import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { PATCH, DELETE } from '../route'

vi.mock('@/lib/session', () => ({ getApiSession: vi.fn() }))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    competitor: {
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}))

import { getApiSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'

const SESSION = { id: 'user_1', email: 'test@example.com', name: 'Test', plan: 'free' }

const params = { params: { id: 'comp_1' } }

beforeEach(() => {
  vi.clearAllMocks()
})

describe('PATCH /api/competitors/[id]', () => {
  it('returns 401 when not authenticated', async () => {
    vi.mocked(getApiSession).mockResolvedValue(null)
    const res = await PATCH(new NextRequest('http://localhost/api/competitors/comp_1', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ followers: 60000 }),
    }), params)
    expect(res.status).toBe(401)
  })

  it('updates competitor using updateMany with userId ownership filter', async () => {
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.competitor.updateMany).mockResolvedValue({ count: 1 })

    const res = await PATCH(new NextRequest('http://localhost/api/competitors/comp_1', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ followers: 60000, engagement: 3.8 }),
    }), params)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.count).toBe(1)
  })

  it('scopes updateMany to userId and id', async () => {
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.competitor.updateMany).mockResolvedValue({ count: 1 })

    await PATCH(new NextRequest('http://localhost/api/competitors/comp_1', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ followers: 60000 }),
    }), params)

    expect(prisma.competitor.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'comp_1', userId: 'user_1' } })
    )
  })

  it('coerces followers to Number', async () => {
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.competitor.updateMany).mockResolvedValue({ count: 1 })

    await PATCH(new NextRequest('http://localhost/api/competitors/comp_1', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ followers: '65000' }),
    }), params)

    expect(prisma.competitor.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ followers: 65000 }),
      })
    )
  })
})

describe('DELETE /api/competitors/[id]', () => {
  it('returns 401 when not authenticated', async () => {
    vi.mocked(getApiSession).mockResolvedValue(null)
    const res = await DELETE(new NextRequest('http://localhost/api/competitors/comp_1', { method: 'DELETE' }), params)
    expect(res.status).toBe(401)
  })

  it('deletes competitor and returns ok', async () => {
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.competitor.deleteMany).mockResolvedValue({ count: 1 })

    const res = await DELETE(new NextRequest('http://localhost/api/competitors/comp_1', { method: 'DELETE' }), params)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
  })

  it('scopes deleteMany to userId and id', async () => {
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.competitor.deleteMany).mockResolvedValue({ count: 1 })

    await DELETE(new NextRequest('http://localhost/api/competitors/comp_1', { method: 'DELETE' }), params)

    expect(prisma.competitor.deleteMany).toHaveBeenCalledWith({
      where: { id: 'comp_1', userId: 'user_1' },
    })
  })
})
