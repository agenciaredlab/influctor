import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '../route'

vi.mock('@/lib/email', () => ({
  sendWeeklyReport: vi.fn().mockResolvedValue({ data: { id: 'email_123' } }),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user:           { findMany: vi.fn() },
    goal:           { findMany: vi.fn() },
    income:         { findMany: vi.fn() },
    aiUsage:        { findMany: vi.fn() },
    socialSnapshot: { findMany: vi.fn() },
    contentPost:    { findMany: vi.fn() },
  },
}))

// Mock the buildReportData import from the email route
vi.mock('../../../email/weekly-report/route', () => ({
  buildReportData: vi.fn().mockResolvedValue({
    userName: 'Test', userEmail: 'test@example.com', weekLabel: 'Semana',
    summary: { followersGained: 100, followersChange: 5, reach: 5000, reachChange: 10, engagementRate: 3.2, engChange: 0.1, income: 500, incomeChange: 0 },
    topContent: [], goalsProgress: [], recommendations: [], goalsNextWeek: [],
    aiUsage: 3, aiLimit: 100,
  }),
}))

import { prisma } from '@/lib/prisma'
import { sendWeeklyReport } from '@/lib/email'
import { buildReportData } from '../../../email/weekly-report/route'

function makeReq(headers: Record<string, string> = {}) {
  return new NextRequest('http://localhost/api/cron/weekly-report', { headers })
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.RESEND_API_KEY = 'test-resend-key'
  vi.mocked(prisma.user.findMany).mockResolvedValue([])
})

describe('GET /api/cron/weekly-report', () => {
  it('returns 401 when CRON_SECRET is set and header is missing', async () => {
    process.env.CRON_SECRET = 'secret-token'
    const res = await GET(makeReq())
    expect(res.status).toBe(401)
    delete process.env.CRON_SECRET
  })

  it('returns 401 when bearer token is wrong', async () => {
    process.env.CRON_SECRET = 'secret-token'
    const res = await GET(makeReq({ authorization: 'Bearer wrong-token' }))
    expect(res.status).toBe(401)
    delete process.env.CRON_SECRET
  })

  it('returns 503 when RESEND_API_KEY is missing', async () => {
    delete process.env.RESEND_API_KEY
    const res = await GET(makeReq({ authorization: 'Bearer any' }))
    expect(res.status).toBe(503)
  })

  it('succeeds without CRON_SECRET set', async () => {
    delete process.env.CRON_SECRET
    const res = await GET(makeReq())
    expect(res.status).toBe(200)
  })

  it('processes creator/pro users and returns sent count', async () => {
    delete process.env.CRON_SECRET
    vi.mocked(prisma.user.findMany).mockResolvedValue([
      { id: 'u1', email: 'a@test.com', name: 'A', plan: 'creator' },
      { id: 'u2', email: 'b@test.com', name: 'B', plan: 'pro' },
    ] as any)

    const res = await GET(makeReq())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.sent).toBe(2)
    expect(body.failed).toBe(0)
    expect(sendWeeklyReport).toHaveBeenCalledTimes(2)
  })

  it('counts failures when buildReportData throws', async () => {
    delete process.env.CRON_SECRET
    vi.mocked(prisma.user.findMany).mockResolvedValue([
      { id: 'u1', email: 'fail@test.com', name: 'Fail', plan: 'creator' },
    ] as any)
    vi.mocked(buildReportData).mockRejectedValueOnce(new Error('DB error'))

    const res = await GET(makeReq())
    const body = await res.json()
    expect(body.sent).toBe(0)
    expect(body.failed).toBe(1)
    expect(body.errors[0]).toContain('fail@test.com')
  })

  it('accepts valid CRON_SECRET authorization', async () => {
    process.env.CRON_SECRET = 'my-secret'
    vi.mocked(prisma.user.findMany).mockResolvedValue([])

    const res = await GET(makeReq({ authorization: 'Bearer my-secret' }))
    expect(res.status).toBe(200)
    delete process.env.CRON_SECRET
  })
})
