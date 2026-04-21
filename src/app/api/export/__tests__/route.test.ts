import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '../route'

vi.mock('@/lib/session', () => ({ getApiSession: vi.fn() }))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    income:    { findMany: vi.fn() },
    brandDeal: { findMany: vi.fn() },
    campaign:  { findMany: vi.fn() },
  },
}))

import { getApiSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'

const mockSession = { id: 'user_1', email: 'test@example.com', plan: 'creator' }

function req(type?: string) {
  const url = type ? `http://localhost/api/export?type=${type}` : 'http://localhost/api/export'
  return new NextRequest(url)
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(getApiSession).mockResolvedValue(mockSession as any)
})

// ─── Auth ─────────────────────────────────────────────────────────────────────

describe('GET /api/export — auth', () => {
  it('returns 401 when not authenticated', async () => {
    vi.mocked(getApiSession).mockResolvedValue(null)
    const res = await GET(req('income'))
    expect(res.status).toBe(401)
  })

  it('returns 400 for unknown type', async () => {
    const res = await GET(req('unknown'))
    expect(res.status).toBe(400)
  })

  it('returns 400 when type is missing', async () => {
    const res = await GET(req())
    expect(res.status).toBe(400)
  })
})

// ─── Income export ────────────────────────────────────────────────────────────

describe('GET /api/export?type=income', () => {
  const incomes = [
    { id: '1', date: new Date('2025-03-15'), source: 'brand_deal', platform: 'instagram',
      description: 'Post for Nike', amount: 1500, currency: 'USD', invoiced: true, paid: true },
    { id: '2', date: new Date('2025-03-01'), source: 'affiliate', platform: null,
      description: null, amount: 250.5, currency: 'USD', invoiced: false, paid: false },
  ]

  beforeEach(() => {
    vi.mocked(prisma.income.findMany).mockResolvedValue(incomes as any)
  })

  it('returns 200 with text/csv content type', async () => {
    const res = await GET(req('income'))
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toContain('text/csv')
  })

  it('sets Content-Disposition attachment header', async () => {
    const res = await GET(req('income'))
    expect(res.headers.get('Content-Disposition')).toContain('attachment')
    expect(res.headers.get('Content-Disposition')).toContain('.csv')
  })

  it('includes header row with expected columns', async () => {
    const res = await GET(req('income'))
    const text = await res.text()
    expect(text).toContain('Fecha')
    expect(text).toContain('Fuente')
    expect(text).toContain('Monto')
    expect(text).toContain('Moneda')
  })

  it('includes income data rows', async () => {
    const res = await GET(req('income'))
    const text = await res.text()
    expect(text).toContain('brand_deal')
    expect(text).toContain('1500')
    expect(text).toContain('affiliate')
    expect(text).toContain('250.5')
  })

  it('formats dates as YYYY-MM-DD', async () => {
    const res = await GET(req('income'))
    const text = await res.text()
    expect(text).toContain('2025-03-15')
    expect(text).toContain('2025-03-01')
  })

  it('handles null platform gracefully', async () => {
    const res = await GET(req('income'))
    const text = await res.text()
    // affiliate row has null platform — should not crash
    expect(text).toContain('affiliate')
  })

  it('returns empty body (headers only) when no records', async () => {
    vi.mocked(prisma.income.findMany).mockResolvedValue([])
    const res = await GET(req('income'))
    const text = await res.text()
    const lines = text.trim().split('\n')
    expect(lines).toHaveLength(1) // only headers
    expect(lines[0]).toContain('Fecha')
  })

  it('escapes commas inside field values', async () => {
    vi.mocked(prisma.income.findMany).mockResolvedValue([{
      ...incomes[0], description: 'Nike, Adidas, Puma',
    }] as any)
    const res = await GET(req('income'))
    const text = await res.text()
    expect(text).toContain('"Nike, Adidas, Puma"')
  })
})

// ─── Deals export ─────────────────────────────────────────────────────────────

describe('GET /api/export?type=deals', () => {
  const deals = [
    { id: '1', brand: 'Nike', contact: 'John', email: 'john@nike.com', phone: '+1234',
      platform: 'instagram', type: 'reel', stage: 'active', value: 2000, currency: 'USD',
      commissionPct: null, dueDate: new Date('2025-04-30'), niche: 'fashion',
      description: 'Reel promo', deliverables: '["1 Reel"]', notes: null, tags: 'sport',
      logo: null, userId: 'user_1', createdAt: new Date('2025-01-01'), updatedAt: new Date() },
  ]

  beforeEach(() => {
    vi.mocked(prisma.brandDeal.findMany).mockResolvedValue(deals as any)
  })

  it('returns 200 with CSV content type', async () => {
    const res = await GET(req('deals'))
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toContain('text/csv')
  })

  it('includes brand deal columns', async () => {
    const res = await GET(req('deals'))
    const text = await res.text()
    expect(text).toContain('Marca')
    expect(text).toContain('Etapa')
    expect(text).toContain('Valor')
    expect(text).toContain('Vencimiento')
  })

  it('includes deal data', async () => {
    const res = await GET(req('deals'))
    const text = await res.text()
    expect(text).toContain('Nike')
    expect(text).toContain('2000')
    expect(text).toContain('active')
    expect(text).toContain('2025-04-30')
  })
})

// ─── Campaigns export ─────────────────────────────────────────────────────────

describe('GET /api/export?type=campaigns', () => {
  const campaigns = [
    { id: '1', name: 'Summer Launch', objective: 'awareness', platform: 'instagram',
      status: 'active', budget: 5000, spent: 3200, impressions: 50000, reach: 30000,
      engagement: 2500, conversions: 120, clicks: 800, startDate: new Date('2025-06-01'),
      endDate: new Date('2025-06-30'), tags: 'summer', description: null, content: null,
      userId: 'user_1', createdAt: new Date('2025-01-01'), updatedAt: new Date() },
  ]

  beforeEach(() => {
    vi.mocked(prisma.campaign.findMany).mockResolvedValue(campaigns as any)
  })

  it('returns 200 with CSV content type', async () => {
    const res = await GET(req('campaigns'))
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toContain('text/csv')
  })

  it('includes campaign columns', async () => {
    const res = await GET(req('campaigns'))
    const text = await res.text()
    expect(text).toContain('Nombre')
    expect(text).toContain('Presupuesto')
    expect(text).toContain('ROI_%')
    expect(text).toContain('Impresiones')
  })

  it('includes campaign data', async () => {
    const res = await GET(req('campaigns'))
    const text = await res.text()
    expect(text).toContain('Summer Launch')
    expect(text).toContain('5000')
    expect(text).toContain('awareness')
  })

  it('calculates ROI from budget and spent', async () => {
    // ROI = ((spent - budget) / budget) * 100 = ((3200 - 5000) / 5000) * 100 = -36.0
    const res = await GET(req('campaigns'))
    const text = await res.text()
    expect(text).toContain('-36.0')
  })

  it('leaves ROI empty when budget is 0', async () => {
    vi.mocked(prisma.campaign.findMany).mockResolvedValue([{
      ...campaigns[0], budget: 0,
    }] as any)
    const res = await GET(req('campaigns'))
    const text = await res.text()
    // empty ROI field — the row should still parse correctly
    const lines = text.split('\n')
    expect(lines.length).toBeGreaterThan(1)
  })
})
