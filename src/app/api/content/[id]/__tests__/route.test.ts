import { describe, it, expect, vi, beforeEach } from 'vitest'
import { OWNER_PERMS, NO_PERMS, memberSession } from '@/test-utils/team'
import { NextRequest } from 'next/server'
import { PUT, PATCH, DELETE } from '../route'

vi.mock('@/lib/session', () => ({ getApiSession: vi.fn() }))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    contentPost: {
      findFirst: vi.fn(),
      update:    vi.fn(),
      delete:    vi.fn(),
    },
  },
}))

import { getApiSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'

const SESSION = { id: 'user_1', email: 'test@example.com', name: 'Test', plan: 'free', accountId: 'user_1', permissions: OWNER_PERMS }

const POST_RECORD = {
  id: 'post_1', userId: 'user_1', title: 'My Reel', platform: 'instagram',
  type: 'reel', status: 'draft', scheduledAt: null, caption: null,
  hashtags: null, hookText: null, imageUrl: null, notes: null,
  createdAt: new Date(), updatedAt: new Date(),
}

const params = { params: { id: 'post_1' } }

const putBody = {
  title: 'My Reel', platform: 'instagram', type: 'reel', status: 'scheduled',
  scheduledAt: '2025-05-01T10:00',
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('PUT /api/content/[id]', () => {
  it('returns 401 when not authenticated', async () => {
    vi.mocked(getApiSession).mockResolvedValue(null)
    const res = await PUT(new NextRequest('http://localhost/api/content/post_1', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(putBody),
    }), params)
    expect(res.status).toBe(401)
  })

  it('returns 404 when post belongs to another user', async () => {
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.contentPost.findFirst).mockResolvedValue(null)
    const res = await PUT(new NextRequest('http://localhost/api/content/post_1', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(putBody),
    }), params)
    expect(res.status).toBe(404)
  })

  it('updates post and returns 200', async () => {
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.contentPost.findFirst).mockResolvedValue(POST_RECORD as any)
    vi.mocked(prisma.contentPost.update).mockResolvedValue({ ...POST_RECORD, status: 'scheduled' } as any)

    const res = await PUT(new NextRequest('http://localhost/api/content/post_1', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(putBody),
    }), params)
    expect(res.status).toBe(200)
  })

  it('converts scheduledAt string to Date when provided', async () => {
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.contentPost.findFirst).mockResolvedValue(POST_RECORD as any)
    vi.mocked(prisma.contentPost.update).mockResolvedValue(POST_RECORD as any)

    await PUT(new NextRequest('http://localhost/api/content/post_1', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(putBody),
    }), params)

    expect(prisma.contentPost.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ scheduledAt: expect.any(Date) }),
    }))
  })

  it('sets scheduledAt to null when not provided', async () => {
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.contentPost.findFirst).mockResolvedValue(POST_RECORD as any)
    vi.mocked(prisma.contentPost.update).mockResolvedValue(POST_RECORD as any)

    await PUT(new NextRequest('http://localhost/api/content/post_1', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Draft', platform: 'instagram', type: 'reel', status: 'draft' }),
    }), params)

    expect(prisma.contentPost.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ scheduledAt: null }),
    }))
  })
})

describe('PATCH /api/content/[id]', () => {
  it('returns 401 when not authenticated', async () => {
    vi.mocked(getApiSession).mockResolvedValue(null)
    const res = await PATCH(new NextRequest('http://localhost/api/content/post_1', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'published' }),
    }), params)
    expect(res.status).toBe(401)
  })

  it('returns 404 when post belongs to another user', async () => {
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.contentPost.findFirst).mockResolvedValue(null)
    const res = await PATCH(new NextRequest('http://localhost/api/content/post_1', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'published' }),
    }), params)
    expect(res.status).toBe(404)
  })

  it('applies partial update and returns 200', async () => {
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.contentPost.findFirst).mockResolvedValue(POST_RECORD as any)
    vi.mocked(prisma.contentPost.update).mockResolvedValue({ ...POST_RECORD, status: 'published' } as any)

    const res = await PATCH(new NextRequest('http://localhost/api/content/post_1', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'published' }),
    }), params)
    expect(res.status).toBe(200)
  })

  it('strips userId and id from update payload (privilege escalation prevention)', async () => {
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.contentPost.findFirst).mockResolvedValue(POST_RECORD as any)
    vi.mocked(prisma.contentPost.update).mockResolvedValue(POST_RECORD as any)

    await PATCH(new NextRequest('http://localhost/api/content/post_1', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'published', userId: 'attacker_id', id: 'fake_id' }),
    }), params)

    const updateCall = vi.mocked(prisma.contentPost.update).mock.calls[0][0]
    expect(updateCall.data).not.toHaveProperty('userId')
    expect(updateCall.data).not.toHaveProperty('id')
    expect(updateCall.data).toMatchObject({ status: 'published' })
  })
})

describe('DELETE /api/content/[id]', () => {
  it('returns 401 when not authenticated', async () => {
    vi.mocked(getApiSession).mockResolvedValue(null)
    const res = await DELETE(new NextRequest('http://localhost/api/content/post_1', { method: 'DELETE' }), params)
    expect(res.status).toBe(401)
  })

  it('returns 404 when post belongs to another user', async () => {
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.contentPost.findFirst).mockResolvedValue(null)
    const res = await DELETE(new NextRequest('http://localhost/api/content/post_1', { method: 'DELETE' }), params)
    expect(res.status).toBe(404)
  })

  it('deletes post and returns success', async () => {
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.contentPost.findFirst).mockResolvedValue(POST_RECORD as any)
    vi.mocked(prisma.contentPost.delete).mockResolvedValue(POST_RECORD as any)

    const res = await DELETE(new NextRequest('http://localhost/api/content/post_1', { method: 'DELETE' }), params)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })

  it('returns 500 when DB throws', async () => {
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.contentPost.findFirst).mockRejectedValue(new Error('DB error'))
    const res = await DELETE(new NextRequest('http://localhost/api/content/post_1', { method: 'DELETE' }), params)
    expect(res.status).toBe(500)
  })
})

describe('team member (shared workspace) — contentPost', () => {
  const mutations: Array<[string, () => Promise<Response>]> = [
    ['PUT', () => PUT(new NextRequest('http://localhost/api/content/post_1', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(putBody) }), params)],
    ['PATCH', () => PATCH(new NextRequest('http://localhost/api/content/post_1', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(putBody) }), params)],
    ['DELETE', () => DELETE(new NextRequest('http://localhost/api/content/post_1', { method: 'DELETE' }), params)],
  ]

  it.each(mutations)('%s without canManageContent -> 403, nothing read or written', async (_n, run) => {
    vi.mocked(getApiSession).mockResolvedValue(memberSession({ canManageDeals: true }) as any)
    const res = await run()
    expect(res.status).toBe(403)
    expect(prisma.contentPost.findFirst).not.toHaveBeenCalled()
    expect(prisma.contentPost.update).not.toHaveBeenCalled()
    expect(prisma.contentPost.delete).not.toHaveBeenCalled()
  })

  it.each(mutations)('%s with canManageContent resolves the record under the owner accountId', async (_n, run) => {
    vi.mocked(getApiSession).mockResolvedValue(memberSession({ canManageContent: true }) as any)
    vi.mocked(prisma.contentPost.findFirst).mockResolvedValue(null)   // 404 is fine: we only assert the scope
    const res = await run()
    expect(res.status).toBe(404)
    expect(prisma.contentPost.findFirst).toHaveBeenCalledWith({ where: { id: expect.any(String), userId: 'owner_1' } })
  })
})
