import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from '../route'

vi.mock('@/lib/session', () => ({
  getApiSession: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    goal: {
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

import { getApiSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'

const mockSession = { id: 'user_1', email: 'test@example.com', name: 'Test', plan: 'free' }

const mockGoal = {
  id: 'goal_1',
  userId: 'user_1',
  title: 'Reach 10K followers',
  category: 'followers',
  targetValue: 10000,
  currentValue: 5000,
  unit: 'followers',
  priority: 'high',
  status: 'active',
  score: 50,
  createdAt: new Date(),
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/goals', () => {
  it('returns 401 when not authenticated', async () => {
    vi.mocked(getApiSession).mockResolvedValue(null)
    const req = new NextRequest('http://localhost/api/goals')
    const res = await GET(req)
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBeDefined()
  })

  it('returns paginated goals for authenticated user', async () => {
    vi.mocked(getApiSession).mockResolvedValue(mockSession as any)
    vi.mocked(prisma.$transaction).mockResolvedValue([[mockGoal], 1] as any)

    const req = new NextRequest('http://localhost/api/goals')
    const res = await GET(req)
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.data).toHaveLength(1)
    expect(body.total).toBe(1)
    expect(body.page).toBe(1)
    expect(body.limit).toBe(20)
    expect(body.pages).toBe(1)
  })

  it('uses default page=1 and limit=20', async () => {
    vi.mocked(getApiSession).mockResolvedValue(mockSession as any)
    vi.mocked(prisma.$transaction).mockResolvedValue([[], 0] as any)

    const req = new NextRequest('http://localhost/api/goals')
    const res = await GET(req)
    const body = await res.json()

    expect(body.page).toBe(1)
    expect(body.limit).toBe(20)
    expect(body.pages).toBe(0)
  })

  it('respects page and limit query params', async () => {
    vi.mocked(getApiSession).mockResolvedValue(mockSession as any)
    vi.mocked(prisma.$transaction).mockResolvedValue([[mockGoal, mockGoal], 25] as any)

    const req = new NextRequest('http://localhost/api/goals?page=2&limit=10')
    const res = await GET(req)
    const body = await res.json()

    expect(body.page).toBe(2)
    expect(body.limit).toBe(10)
    expect(body.pages).toBe(3)
  })

  it('clamps limit to max 100', async () => {
    vi.mocked(getApiSession).mockResolvedValue(mockSession as any)
    vi.mocked(prisma.$transaction).mockResolvedValue([[], 0] as any)

    const req = new NextRequest('http://localhost/api/goals?limit=999')
    const res = await GET(req)
    const body = await res.json()

    expect(body.limit).toBe(100)
  })

  it('clamps page to min 1', async () => {
    vi.mocked(getApiSession).mockResolvedValue(mockSession as any)
    vi.mocked(prisma.$transaction).mockResolvedValue([[], 0] as any)

    const req = new NextRequest('http://localhost/api/goals?page=-5')
    const res = await GET(req)
    const body = await res.json()

    expect(body.page).toBe(1)
  })

  it('queries only goals belonging to the authenticated user', async () => {
    vi.mocked(getApiSession).mockResolvedValue(mockSession as any)
    vi.mocked(prisma.$transaction).mockResolvedValue([[], 0] as any)

    const req = new NextRequest('http://localhost/api/goals')
    await GET(req)

    expect(prisma.$transaction).toHaveBeenCalledTimes(1)
  })
})

describe('POST /api/goals', () => {
  it('returns 401 when not authenticated', async () => {
    vi.mocked(getApiSession).mockResolvedValue(null)
    const req = new NextRequest('http://localhost/api/goals', {
      method: 'POST',
      body: JSON.stringify({ title: 'Test' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('returns 400 when title is missing', async () => {
    vi.mocked(getApiSession).mockResolvedValue(mockSession as any)
    const req = new NextRequest('http://localhost/api/goals', {
      method: 'POST',
      body: JSON.stringify({ targetValue: 100 }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/title/i)
  })

  it('creates a goal and returns 201', async () => {
    vi.mocked(getApiSession).mockResolvedValue(mockSession as any)
    vi.mocked(prisma.goal.create).mockResolvedValue(mockGoal as any)

    const req = new NextRequest('http://localhost/api/goals', {
      method: 'POST',
      body: JSON.stringify({
        title: 'Reach 10K followers',
        category: 'followers',
        targetValue: 10000,
        currentValue: 5000,
        unit: 'followers',
        priority: 'high',
      }),
      headers: { 'Content-Type': 'application/json' },
    })

    const res = await POST(req)
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.id).toBe('goal_1')
    expect(body.title).toBe('Reach 10K followers')
  })

  it('uses sessionUser.id as userId (never from body)', async () => {
    vi.mocked(getApiSession).mockResolvedValue(mockSession as any)
    vi.mocked(prisma.goal.create).mockResolvedValue(mockGoal as any)

    const req = new NextRequest('http://localhost/api/goals', {
      method: 'POST',
      body: JSON.stringify({ title: 'Test', userId: 'attacker_id', targetValue: 0 }),
      headers: { 'Content-Type': 'application/json' },
    })

    await POST(req)

    expect(prisma.goal.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ userId: 'user_1' }) })
    )
  })

  it('defaults category to "followers" when not provided', async () => {
    vi.mocked(getApiSession).mockResolvedValue(mockSession as any)
    vi.mocked(prisma.goal.create).mockResolvedValue(mockGoal as any)

    const req = new NextRequest('http://localhost/api/goals', {
      method: 'POST',
      body: JSON.stringify({ title: 'Test' }),
      headers: { 'Content-Type': 'application/json' },
    })
    await POST(req)

    expect(prisma.goal.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ category: 'followers' }) })
    )
  })

  it('calculates progress score from currentValue/targetValue', async () => {
    vi.mocked(getApiSession).mockResolvedValue(mockSession as any)
    vi.mocked(prisma.goal.create).mockResolvedValue(mockGoal as any)

    const req = new NextRequest('http://localhost/api/goals', {
      method: 'POST',
      body: JSON.stringify({ title: 'Test', targetValue: 200, currentValue: 100 }),
      headers: { 'Content-Type': 'application/json' },
    })
    await POST(req)

    expect(prisma.goal.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ score: 50 }) })
    )
  })
})
