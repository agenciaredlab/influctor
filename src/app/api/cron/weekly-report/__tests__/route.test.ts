import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '../route'

vi.mock('@/lib/email', () => ({
  sendWeeklyReport:  vi.fn().mockResolvedValue({ data: { id: 'email_123' } }),
  isEmailConfigured: vi.fn().mockResolvedValue(true),
}))

vi.mock('@/lib/config', () => ({
  getCronSecret: vi.fn(),
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
import { sendWeeklyReport, isEmailConfigured } from '@/lib/email'
import { getCronSecret } from '@/lib/config'
import { buildReportData } from '../../../email/weekly-report/route'

function makeReq(headers: Record<string, string> = {}) {
  return new NextRequest('http://localhost/api/cron/weekly-report', { headers })
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(isEmailConfigured).mockResolvedValue(true)
  vi.mocked(getCronSecret).mockResolvedValue('')
  vi.mocked(prisma.user.findMany).mockResolvedValue([])
})

describe('GET /api/cron/weekly-report', () => {
  it('returns 401 when CRON_SECRET is configured and header is missing', async () => {
    vi.mocked(getCronSecret).mockResolvedValue('secret-token')
    const res = await GET(makeReq())
    expect(res.status).toBe(401)
  })

  it('returns 401 when bearer token is wrong', async () => {
    vi.mocked(getCronSecret).mockResolvedValue('secret-token')
    const res = await GET(makeReq({ authorization: 'Bearer wrong-token' }))
    expect(res.status).toBe(401)
  })

  it('denies by default (401) when no CRON_SECRET is configured at all', async () => {
    vi.mocked(getCronSecret).mockResolvedValue('')
    const res = await GET(makeReq({ authorization: 'Bearer any' }))
    expect(res.status).toBe(401)
  })

  it('returns 503 when no email transport (SMTP or Resend) is configured', async () => {
    vi.mocked(getCronSecret).mockResolvedValue('my-secret')
    vi.mocked(isEmailConfigured).mockResolvedValue(false)
    const res = await GET(makeReq({ authorization: 'Bearer my-secret' }))
    expect(res.status).toBe(503)
    const body = await res.json()
    expect(body.error).toContain('Admin')
  })

  it('sends the report when only SMTP is configured (isEmailConfigured true)', async () => {
    vi.mocked(getCronSecret).mockResolvedValue('my-secret')
    vi.mocked(isEmailConfigured).mockResolvedValue(true)
    vi.mocked(prisma.user.findMany).mockResolvedValue([
      { id: 'u1', email: 'a@test.com', name: 'A', plan: 'creator' },
    ] as any)

    const res = await GET(makeReq({ authorization: 'Bearer my-secret' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.sent).toBe(1)
  })

  it('sends the report when only a Resend key from DB is configured (isEmailConfigured true)', async () => {
    vi.mocked(getCronSecret).mockResolvedValue('my-secret')
    vi.mocked(isEmailConfigured).mockResolvedValue(true)
    vi.mocked(prisma.user.findMany).mockResolvedValue([
      { id: 'u1', email: 'a@test.com', name: 'A', plan: 'creator' },
      { id: 'u2', email: 'b@test.com', name: 'B', plan: 'pro' },
    ] as any)

    const res = await GET(makeReq({ authorization: 'Bearer my-secret' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.sent).toBe(2)
    expect(body.failed).toBe(0)
    expect(sendWeeklyReport).toHaveBeenCalledTimes(2)
  })

  it('counts failures when buildReportData throws', async () => {
    vi.mocked(getCronSecret).mockResolvedValue('my-secret')
    vi.mocked(prisma.user.findMany).mockResolvedValue([
      { id: 'u1', email: 'fail@test.com', name: 'Fail', plan: 'creator' },
    ] as any)
    vi.mocked(buildReportData).mockRejectedValueOnce(new Error('DB error'))

    const res = await GET(makeReq({ authorization: 'Bearer my-secret' }))
    const body = await res.json()
    expect(body.sent).toBe(0)
    expect(body.failed).toBe(1)
    expect(body.errors[0]).toContain('fail@test.com')
  })

  it('accepts valid CRON_SECRET authorization', async () => {
    vi.mocked(getCronSecret).mockResolvedValue('my-secret')
    vi.mocked(prisma.user.findMany).mockResolvedValue([])

    const res = await GET(makeReq({ authorization: 'Bearer my-secret' }))
    expect(res.status).toBe(200)
  })
})
