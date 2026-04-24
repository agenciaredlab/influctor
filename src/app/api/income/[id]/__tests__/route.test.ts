import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { PUT, DELETE } from '../route'

vi.mock('@/lib/session', () => ({ getApiSession: vi.fn() }))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    income: {
      findFirst: vi.fn(),
      update:    vi.fn(),
      delete:    vi.fn(),
    },
  },
}))

import { getApiSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'

const SESSION = { id: 'user_1', email: 'test@example.com', name: 'Test', plan: 'free' }

const INCOME = {
  id: 'income_1', userId: 'user_1', amount: 500, source: 'brand_deal',
  platform: 'instagram', description: 'Sponsored post',
  date: new Date('2025-03-01'), currency: 'USD', paid: true,
}

const params = { params: { id: 'income_1' } }

const putBody = {
  amount: 600, source: 'brand_deal', platform: 'instagram',
  description: 'Updated deal', date: '2025-03-01',
}

beforeEach(() => {
  vi.clearAllMocks()
})

function putReq(body: object) {
  return new NextRequest('http://localhost/api/income/income_1', {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('PUT /api/income/[id]', () => {
  it('returns 401 when not authenticated', async () => {
    vi.mocked(getApiSession).mockResolvedValue(null)
    const res = await PUT(new NextRequest('http://localhost/api/income/income_1', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(putBody),
    }), params)
    expect(res.status).toBe(401)
  })

  it('returns 404 when income belongs to another user', async () => {
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.income.findFirst).mockResolvedValue(null)
    const res = await PUT(putReq(putBody), params)
    expect(res.status).toBe(404)
  })

  it('returns 400 when amount is missing', async () => {
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.income.findFirst).mockResolvedValue(INCOME as any)
    const res = await PUT(putReq({ source: 'brand_deal', date: '2025-03-01' }), params)
    expect(res.status).toBe(400)
  })

  it('returns 400 when source is missing', async () => {
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.income.findFirst).mockResolvedValue(INCOME as any)
    const res = await PUT(putReq({ amount: 600, date: '2025-03-01' }), params)
    expect(res.status).toBe(400)
  })

  it('returns 400 when date is missing', async () => {
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.income.findFirst).mockResolvedValue(INCOME as any)
    const res = await PUT(putReq({ amount: 600, source: 'brand_deal' }), params)
    expect(res.status).toBe(400)
  })

  it('updates income and returns 200', async () => {
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.income.findFirst).mockResolvedValue(INCOME as any)
    vi.mocked(prisma.income.update).mockResolvedValue({ ...INCOME, amount: 600 } as any)

    const res = await PUT(putReq(putBody), params)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.amount).toBe(600)
  })

  it('parses amount as float', async () => {
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.income.findFirst).mockResolvedValue(INCOME as any)
    vi.mocked(prisma.income.update).mockResolvedValue(INCOME as any)

    await PUT(putReq({ ...putBody, amount: '299.99' }), params)

    expect(prisma.income.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ amount: 299.99 }),
    }))
  })

  it('converts date string to Date object', async () => {
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.income.findFirst).mockResolvedValue(INCOME as any)
    vi.mocked(prisma.income.update).mockResolvedValue(INCOME as any)

    await PUT(putReq(putBody), params)

    expect(prisma.income.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ date: expect.any(Date) }),
    }))
  })
})

describe('DELETE /api/income/[id]', () => {
  it('returns 401 when not authenticated', async () => {
    vi.mocked(getApiSession).mockResolvedValue(null)
    const res = await DELETE(new NextRequest('http://localhost/api/income/income_1', { method: 'DELETE' }), params)
    expect(res.status).toBe(401)
  })

  it('returns 404 when income belongs to another user', async () => {
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.income.findFirst).mockResolvedValue(null)
    const res = await DELETE(new NextRequest('http://localhost/api/income/income_1', { method: 'DELETE' }), params)
    expect(res.status).toBe(404)
  })

  it('deletes income and returns success', async () => {
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.income.findFirst).mockResolvedValue(INCOME as any)
    vi.mocked(prisma.income.delete).mockResolvedValue(INCOME as any)

    const res = await DELETE(new NextRequest('http://localhost/api/income/income_1', { method: 'DELETE' }), params)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })

  it('only deletes the specific income by id', async () => {
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.income.findFirst).mockResolvedValue(INCOME as any)
    vi.mocked(prisma.income.delete).mockResolvedValue(INCOME as any)

    await DELETE(new NextRequest('http://localhost/api/income/income_1', { method: 'DELETE' }), params)
    expect(prisma.income.delete).toHaveBeenCalledWith({ where: { id: 'income_1' } })
  })

  it('returns 500 when DB throws', async () => {
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.income.findFirst).mockRejectedValue(new Error('DB error'))
    const res = await DELETE(new NextRequest('http://localhost/api/income/income_1', { method: 'DELETE' }), params)
    expect(res.status).toBe(500)
  })
})
