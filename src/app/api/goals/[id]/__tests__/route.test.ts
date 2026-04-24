import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { PUT, PATCH, DELETE } from '../route'

vi.mock('@/lib/session', () => ({ getApiSession: vi.fn() }))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    goal: {
      findFirst: vi.fn(),
      update:    vi.fn(),
      delete:    vi.fn(),
    },
  },
}))

vi.mock('@/lib/email', () => ({ sendGoalAchievedNotification: vi.fn().mockReturnValue(null) }))

import { getApiSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { sendGoalAchievedNotification } from '@/lib/email'

const SESSION = { id: 'user_1', email: 'test@example.com', name: 'Test', plan: 'free' }

const GOAL = {
  id: 'goal_1', userId: 'user_1', title: 'Reach 10K', category: 'followers',
  targetValue: 10000, currentValue: 5000, unit: 'followers', priority: 'high',
  status: 'active', score: 50, deadline: null, platform: null, notes: null, description: null,
  createdAt: new Date(), updatedAt: new Date(),
}

const params = { params: { id: 'goal_1' } }

const putBody = {
  title: 'Reach 10K', category: 'followers', targetValue: 10000, currentValue: 5000,
  unit: 'followers', priority: 'high', status: 'active',
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ── PUT ──────────────────────────────────────────────────────────────────────
describe('PUT /api/goals/[id]', () => {
  it('returns 401 when not authenticated', async () => {
    vi.mocked(getApiSession).mockResolvedValue(null)
    const res = await PUT(new NextRequest('http://localhost/api/goals/goal_1', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(putBody),
    }), params)
    expect(res.status).toBe(401)
  })

  it('returns 404 when goal belongs to another user', async () => {
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.goal.findFirst).mockResolvedValue(null)

    const res = await PUT(new NextRequest('http://localhost/api/goals/goal_1', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(putBody),
    }), params)
    expect(res.status).toBe(404)
  })

  it('updates goal and returns 200', async () => {
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.goal.findFirst).mockResolvedValue(GOAL as any)
    vi.mocked(prisma.goal.update).mockResolvedValue({ ...GOAL, score: 50 } as any)

    const res = await PUT(new NextRequest('http://localhost/api/goals/goal_1', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(putBody),
    }), params)
    expect(res.status).toBe(200)
  })

  it('computes score as min(100, progress%)', async () => {
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.goal.findFirst).mockResolvedValue(GOAL as any)
    vi.mocked(prisma.goal.update).mockResolvedValue(GOAL as any)

    await PUT(new NextRequest('http://localhost/api/goals/goal_1', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...putBody, currentValue: 5000, targetValue: 10000 }),
    }), params)

    expect(prisma.goal.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ score: 50 }),
    }))
  })

  it('caps score at 100 even if currentValue exceeds targetValue', async () => {
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.goal.findFirst).mockResolvedValue(GOAL as any)
    vi.mocked(prisma.goal.update).mockResolvedValue(GOAL as any)

    await PUT(new NextRequest('http://localhost/api/goals/goal_1', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...putBody, currentValue: 15000, targetValue: 10000 }),
    }), params)

    expect(prisma.goal.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ score: 100 }),
    }))
  })

  it('fires goal-achieved notification when first crossing 100%', async () => {
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.goal.findFirst).mockResolvedValue({ ...GOAL, score: 90 } as any)
    vi.mocked(prisma.goal.update).mockResolvedValue(GOAL as any)

    await PUT(new NextRequest('http://localhost/api/goals/goal_1', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...putBody, currentValue: 10000, targetValue: 10000 }),
    }), params)

    expect(sendGoalAchievedNotification).toHaveBeenCalledWith(expect.objectContaining({
      userEmail: 'test@example.com',
      goalTitle: 'Reach 10K',
    }))
  })

  it('does NOT fire notification when goal was already completed', async () => {
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.goal.findFirst).mockResolvedValue({ ...GOAL, score: 100 } as any)
    vi.mocked(prisma.goal.update).mockResolvedValue(GOAL as any)

    await PUT(new NextRequest('http://localhost/api/goals/goal_1', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...putBody, currentValue: 10000, targetValue: 10000 }),
    }), params)

    expect(sendGoalAchievedNotification).not.toHaveBeenCalled()
  })
})

// ── PATCH ────────────────────────────────────────────────────────────────────
describe('PATCH /api/goals/[id]', () => {
  it('returns 401 when not authenticated', async () => {
    vi.mocked(getApiSession).mockResolvedValue(null)
    const res = await PATCH(new NextRequest('http://localhost/api/goals/goal_1', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'completed' }),
    }), params)
    expect(res.status).toBe(401)
  })

  it('returns 404 when goal belongs to another user', async () => {
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.goal.findFirst).mockResolvedValue(null)
    const res = await PATCH(new NextRequest('http://localhost/api/goals/goal_1', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'completed' }),
    }), params)
    expect(res.status).toBe(404)
  })

  it('applies partial update and returns 200', async () => {
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.goal.findFirst).mockResolvedValue(GOAL as any)
    vi.mocked(prisma.goal.update).mockResolvedValue({ ...GOAL, status: 'completed' } as any)

    const res = await PATCH(new NextRequest('http://localhost/api/goals/goal_1', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'completed' }),
    }), params)
    expect(res.status).toBe(200)
  })

  it('strips userId and id from update payload (privilege escalation prevention)', async () => {
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.goal.findFirst).mockResolvedValue(GOAL as any)
    vi.mocked(prisma.goal.update).mockResolvedValue(GOAL as any)

    await PATCH(new NextRequest('http://localhost/api/goals/goal_1', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'completed', userId: 'attacker_id', id: 'fake_id' }),
    }), params)

    const updateCall = vi.mocked(prisma.goal.update).mock.calls[0][0]
    expect(updateCall.data).not.toHaveProperty('userId')
    expect(updateCall.data).not.toHaveProperty('id')
    expect(updateCall.data).toMatchObject({ status: 'completed' })
  })
})

// ── DELETE ───────────────────────────────────────────────────────────────────
describe('DELETE /api/goals/[id]', () => {
  it('returns 401 when not authenticated', async () => {
    vi.mocked(getApiSession).mockResolvedValue(null)
    const res = await DELETE(new NextRequest('http://localhost/api/goals/goal_1', { method: 'DELETE' }), params)
    expect(res.status).toBe(401)
  })

  it('returns 404 when goal belongs to another user', async () => {
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.goal.findFirst).mockResolvedValue(null)
    const res = await DELETE(new NextRequest('http://localhost/api/goals/goal_1', { method: 'DELETE' }), params)
    expect(res.status).toBe(404)
  })

  it('deletes goal and returns success', async () => {
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.goal.findFirst).mockResolvedValue(GOAL as any)
    vi.mocked(prisma.goal.delete).mockResolvedValue(GOAL as any)

    const res = await DELETE(new NextRequest('http://localhost/api/goals/goal_1', { method: 'DELETE' }), params)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })

  it('only deletes the specific goal by id', async () => {
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.goal.findFirst).mockResolvedValue(GOAL as any)
    vi.mocked(prisma.goal.delete).mockResolvedValue(GOAL as any)

    await DELETE(new NextRequest('http://localhost/api/goals/goal_1', { method: 'DELETE' }), params)
    expect(prisma.goal.delete).toHaveBeenCalledWith({ where: { id: 'goal_1' } })
  })

  it('returns 500 when DB throws', async () => {
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.goal.findFirst).mockRejectedValue(new Error('DB error'))
    const res = await DELETE(new NextRequest('http://localhost/api/goals/goal_1', { method: 'DELETE' }), params)
    expect(res.status).toBe(500)
  })
})
