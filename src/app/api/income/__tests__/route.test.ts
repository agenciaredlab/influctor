import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from '../route'

vi.mock('@/lib/session', () => ({
  getApiSession: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    income: {
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

const mockIncome = {
  id: 'income_1',
  userId: 'user_1',
  amount: 500,
  source: 'brand_deal',
  platform: 'instagram',
  description: 'Sponsored post',
  date: new Date('2025-03-01'),
  currency: 'USD',
  paid: true,
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/income', () => {
  it('returns 401 when not authenticated', async () => {
    vi.mocked(getApiSession).mockResolvedValue(null)
    const req = new NextRequest('http://localhost/api/income')
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  it('returns paginated income records', async () => {
    vi.mocked(getApiSession).mockResolvedValue(mockSession as any)
    vi.mocked(prisma.$transaction).mockResolvedValue([[mockIncome], 1] as any)

    const req = new NextRequest('http://localhost/api/income')
    const res = await GET(req)
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.data).toHaveLength(1)
    expect(body.total).toBe(1)
    expect(body.page).toBe(1)
    expect(body.limit).toBe(20)
    expect(body.pages).toBe(1)
  })

  it('respects page and limit query params', async () => {
    vi.mocked(getApiSession).mockResolvedValue(mockSession as any)
    vi.mocked(prisma.$transaction).mockResolvedValue([[], 50] as any)

    const req = new NextRequest('http://localhost/api/income?page=3&limit=10')
    const res = await GET(req)
    const body = await res.json()

    expect(body.page).toBe(3)
    expect(body.limit).toBe(10)
    expect(body.pages).toBe(5)
  })

  it('clamps limit to max 100', async () => {
    vi.mocked(getApiSession).mockResolvedValue(mockSession as any)
    vi.mocked(prisma.$transaction).mockResolvedValue([[], 0] as any)

    const req = new NextRequest('http://localhost/api/income?limit=500')
    const res = await GET(req)
    const body = await res.json()

    expect(body.limit).toBe(100)
  })

  it('returns empty data with pages=0 when no records', async () => {
    vi.mocked(getApiSession).mockResolvedValue(mockSession as any)
    vi.mocked(prisma.$transaction).mockResolvedValue([[], 0] as any)

    const req = new NextRequest('http://localhost/api/income')
    const res = await GET(req)
    const body = await res.json()

    expect(body.data).toHaveLength(0)
    expect(body.total).toBe(0)
    expect(body.pages).toBe(0)
  })
})

describe('POST /api/income', () => {
  it('returns 401 when not authenticated', async () => {
    vi.mocked(getApiSession).mockResolvedValue(null)
    const req = new NextRequest('http://localhost/api/income', {
      method: 'POST',
      body: JSON.stringify({ amount: 100, source: 'brand_deal', date: '2025-03-01' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('returns 400 when amount is missing', async () => {
    vi.mocked(getApiSession).mockResolvedValue(mockSession as any)
    const req = new NextRequest('http://localhost/api/income', {
      method: 'POST',
      body: JSON.stringify({ source: 'brand_deal', date: '2025-03-01' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 400 when source is missing', async () => {
    vi.mocked(getApiSession).mockResolvedValue(mockSession as any)
    const req = new NextRequest('http://localhost/api/income', {
      method: 'POST',
      body: JSON.stringify({ amount: 100, date: '2025-03-01' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 400 when date is missing', async () => {
    vi.mocked(getApiSession).mockResolvedValue(mockSession as any)
    const req = new NextRequest('http://localhost/api/income', {
      method: 'POST',
      body: JSON.stringify({ amount: 100, source: 'brand_deal' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('creates income record and returns 201', async () => {
    vi.mocked(getApiSession).mockResolvedValue(mockSession as any)
    vi.mocked(prisma.income.create).mockResolvedValue(mockIncome as any)

    const req = new NextRequest('http://localhost/api/income', {
      method: 'POST',
      body: JSON.stringify({
        amount: 500,
        source: 'brand_deal',
        platform: 'instagram',
        description: 'Sponsored post',
        date: '2025-03-01',
      }),
      headers: { 'Content-Type': 'application/json' },
    })

    const res = await POST(req)
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.id).toBe('income_1')
    expect(body.amount).toBe(500)
  })

  it('always sets userId from session (ignores body userId)', async () => {
    vi.mocked(getApiSession).mockResolvedValue(mockSession as any)
    vi.mocked(prisma.income.create).mockResolvedValue(mockIncome as any)

    const req = new NextRequest('http://localhost/api/income', {
      method: 'POST',
      body: JSON.stringify({ amount: 100, source: 'tips', date: '2025-03-01', userId: 'hacker' }),
      headers: { 'Content-Type': 'application/json' },
    })
    await POST(req)

    expect(prisma.income.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ userId: 'user_1' }) })
    )
  })

  it('sets currency to USD', async () => {
    vi.mocked(getApiSession).mockResolvedValue(mockSession as any)
    vi.mocked(prisma.income.create).mockResolvedValue(mockIncome as any)

    const req = new NextRequest('http://localhost/api/income', {
      method: 'POST',
      body: JSON.stringify({ amount: 100, source: 'tips', date: '2025-03-01' }),
      headers: { 'Content-Type': 'application/json' },
    })
    await POST(req)

    expect(prisma.income.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ currency: 'USD', paid: true }) })
    )
  })

  it('parses amount as float', async () => {
    vi.mocked(getApiSession).mockResolvedValue(mockSession as any)
    vi.mocked(prisma.income.create).mockResolvedValue(mockIncome as any)

    const req = new NextRequest('http://localhost/api/income', {
      method: 'POST',
      body: JSON.stringify({ amount: '299.99', source: 'adsense', date: '2025-03-01' }),
      headers: { 'Content-Type': 'application/json' },
    })
    await POST(req)

    expect(prisma.income.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ amount: 299.99 }) })
    )
  })
})
