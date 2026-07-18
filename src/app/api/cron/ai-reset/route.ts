import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCronSecret } from '@/lib/config'

export const dynamic = 'force-dynamic'

// GET /api/cron/ai-reset
// Runs on the 1st of each month at 00:05 UTC.
// Resets aiUsageThisMonth for every user and updates aiUsageResetAt.
// The per-request logic in /api/ai/generate already handles individual resets;
// this cron is a safety net that keeps counts accurate for all users.
//
// vercel.json: { "path": "/api/cron/ai-reset", "schedule": "5 0 1 * *" }

export async function GET(req: NextRequest) {
  const cronSecret = await getCronSecret()
  const auth = req.headers.get('authorization')
  if (!cronSecret || auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  // Only reset users whose aiUsageResetAt is before this month
  const result = await prisma.user.updateMany({
    where: {
      OR: [
        { aiUsageResetAt: null },
        { aiUsageResetAt: { lt: thisMonth } },
      ],
    },
    data: {
      aiUsageThisMonth: 0,
      aiUsageResetAt:   now,
    },
  })

  // Also downgrade trialing users whose trial has ended
  const expiredTrials = await prisma.user.updateMany({
    where: {
      planStatus:  'trialing',
      trialEndsAt: { lt: now },
    },
    data: {
      plan:        'free',
      planStatus:  'active',
      trialEndsAt: null,
    },
  })

  return NextResponse.json({
    reset:           result.count,
    trialsExpired:   expiredTrials.count,
    at:              now.toISOString(),
  })
}
