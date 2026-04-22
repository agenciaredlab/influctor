import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST, buildReportData } from '../route'

vi.mock('@/lib/session', () => ({ getApiSession: vi.fn() }))

vi.mock('@/lib/email', () => ({
  sendWeeklyReport: vi.fn().mockResolvedValue({ data: { id: 'email_123' } }),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user:            { findUnique: vi.fn() },
    goal:            { findMany: vi.fn() },
    income:          { findMany: vi.fn() },
    aiUsage:         { findMany: vi.fn() },
    socialSnapshot:  { findMany: vi.fn() },
    contentPost:     { findMany: vi.fn() },
  },
}))

import { getApiSession } from '@/lib/session'
import { sendWeeklyReport } from '@/lib/email'
import { prisma } from '@/lib/prisma'

const SESSION = { id: 'user_1', email: 'test@example.com', name: 'Test', plan: 'creator' }
const USER    = { id: 'user_1', email: 'test@example.com', name: 'Test', plan: 'creator' }

function makeReq() {
  return new NextRequest('http://localhost/api/email/weekly-report', { method: 'POST' })
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.RESEND_API_KEY = 'test-resend-key'
})

describe('POST /api/email/weekly-report', () => {
  it('returns 503 when RESEND_API_KEY is not set', async () => {
    delete process.env.RESEND_API_KEY
    const res = await POST(makeReq())
    expect(res.status).toBe(503)
  })

  it('returns 401 when not authenticated', async () => {
    vi.mocked(getApiSession).mockResolvedValue(null)
    const res = await POST(makeReq())
    expect(res.status).toBe(401)
  })

  it('returns 403 when user is on free plan', async () => {
    vi.mocked(getApiSession).mockResolvedValue({ ...SESSION, plan: 'free' } as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ ...USER, plan: 'free' } as any)
    const res = await POST(makeReq())
    expect(res.status).toBe(403)
  })

  it('sends report and returns ok for creator plan', async () => {
    vi.mocked(getApiSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue(USER as any)
    vi.mocked(prisma.goal.findMany).mockResolvedValue([])
    vi.mocked(prisma.income.findMany).mockResolvedValue([])
    vi.mocked(prisma.aiUsage.findMany).mockResolvedValue([])
    vi.mocked(prisma.socialSnapshot.findMany).mockResolvedValue([])
    vi.mocked(prisma.contentPost.findMany).mockResolvedValue([])

    const res = await POST(makeReq())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.id).toBe('email_123')
    expect(sendWeeklyReport).toHaveBeenCalledOnce()
  })
})

describe('buildReportData', () => {
  beforeEach(() => {
    vi.mocked(prisma.goal.findMany).mockResolvedValue([])
    vi.mocked(prisma.income.findMany).mockResolvedValue([])
    vi.mocked(prisma.aiUsage.findMany).mockResolvedValue([])
    vi.mocked(prisma.socialSnapshot.findMany).mockResolvedValue([])
    vi.mocked(prisma.contentPost.findMany).mockResolvedValue([])
  })

  it('throws when user not found', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null)
    await expect(buildReportData('nonexistent')).rejects.toThrow('Usuario no encontrado')
  })

  it('returns zero metrics when no snapshots exist', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(USER as any)

    const data = await buildReportData('user_1')
    expect(data.summary.followersGained).toBe(0)
    expect(data.summary.reach).toBe(0)
    expect(data.summary.engagementRate).toBe(0)
  })

  it('sums followers and reach from snapshots', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(USER as any)

    const now = new Date()
    const threeDaysAgo = new Date(now.getTime() - 3 * 86400_000)
    vi.mocked(prisma.socialSnapshot.findMany).mockResolvedValue([
      { date: threeDaysAgo, newFollowers: 150, reach: 5000, engagement: 3.5, followers: 10000, userId: 'user_1', id: 's1', platform: 'instagram', socialAccountId: 'acc1', impressions: 0, profileVisits: 0, websiteClicks: 0, createdAt: now },
      { date: threeDaysAgo, newFollowers: 80, reach: 2000, engagement: 2.8, followers: 5000, userId: 'user_1', id: 's2', platform: 'tiktok', socialAccountId: 'acc2', impressions: 0, profileVisits: 0, websiteClicks: 0, createdAt: now },
    ] as any)

    const data = await buildReportData('user_1')
    expect(data.summary.followersGained).toBe(230)
    expect(data.summary.reach).toBe(7000)
    expect(data.summary.engagementRate).toBeCloseTo(3.15, 1)
  })

  it('computes income from this week only', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(USER as any)

    const now = new Date()
    const threeDaysAgo = new Date(now.getTime() - 3 * 86400_000)
    const tenDaysAgo   = new Date(now.getTime() - 10 * 86400_000)

    vi.mocked(prisma.income.findMany).mockResolvedValue([
      { date: threeDaysAgo, amount: 500, source: 'deal', platform: null, id: 'i1', userId: 'user_1', description: null, currency: 'USD', invoiced: false, paid: true, createdAt: now, updatedAt: now },
      { date: tenDaysAgo,   amount: 200, source: 'deal', platform: null, id: 'i2', userId: 'user_1', description: null, currency: 'USD', invoiced: false, paid: true, createdAt: now, updatedAt: now },
    ] as any)

    const data = await buildReportData('user_1')
    expect(data.summary.income).toBe(500)
  })

  it('maps goals to progress objects capped at 100', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(USER as any)
    vi.mocked(prisma.goal.findMany).mockResolvedValue([
      { id: 'g1', title: '10K followers', currentValue: 12000, targetValue: 10000, userId: 'user_1' },
    ] as any)

    const data = await buildReportData('user_1')
    expect(data.goalsProgress[0].progress).toBe(100)
    expect(data.goalsProgress[0].title).toBe('10K followers')
  })

  it('uses fallback goals when no goals exist', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(USER as any)

    const data = await buildReportData('user_1')
    expect(data.goalsProgress.length).toBeGreaterThan(0)
    expect(data.goalsProgress[0].title).toBeDefined()
  })

  it('sets aiLimit to 0 for unlimited pro plan', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ ...USER, plan: 'pro' } as any)

    const data = await buildReportData('user_1')
    expect(data.aiLimit).toBe(0)
  })

  it('includes top content posts when published this week', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(USER as any)

    const now = new Date()
    const twoDaysAgo = new Date(now.getTime() - 2 * 86400_000)
    vi.mocked(prisma.contentPost.findMany).mockResolvedValue([
      { id: 'p1', title: 'My Reel', platform: 'instagram', viralScore: 85, status: 'published', publishedAt: twoDaysAgo, userId: 'user_1' },
    ] as any)

    const data = await buildReportData('user_1')
    expect(data.topContent).toHaveLength(1)
    expect(data.topContent[0].title).toBe('My Reel')
    expect(data.topContent[0].platform).toBe('Instagram')
  })
})
