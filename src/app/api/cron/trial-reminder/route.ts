import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendTrialEndingEmail } from '@/lib/email'
import { getCronSecret } from '@/lib/config'

export const dynamic = 'force-dynamic'

// GET /api/cron/trial-reminder
// Runs daily. Sends reminder emails to users whose trial ends in 3 days or 1 day.
// vercel.json: { "path": "/api/cron/trial-reminder", "schedule": "0 10 * * *" }

export async function GET(req: NextRequest) {
  const cronSecret = await getCronSecret()
  const auth = req.headers.get('authorization')
  if (!cronSecret || auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()

  // Find users whose trial ends in ~1 day or ~3 days (±2 hour window)
  const targets = await prisma.user.findMany({
    where: {
      planStatus:  'trialing',
      trialEndsAt: { not: null },
    },
    select: { id: true, name: true, email: true, trialEndsAt: true },
  })

  const sent: string[] = []
  const errors: string[] = []

  for (const user of targets) {
    if (!user.trialEndsAt) continue

    const msLeft    = user.trialEndsAt.getTime() - now.getTime()
    const daysLeft  = msLeft / 86400_000

    // Send at ~3 days and ~1 day remaining (±4h window to tolerate cron drift)
    const isThreeDays = daysLeft >= 2.83 && daysLeft <= 3.17
    const isOneDay    = daysLeft >= 0.83 && daysLeft <= 1.17

    if (!isThreeDays && !isOneDay) continue

    try {
      await sendTrialEndingEmail({
        userName:     user.name,
        userEmail:    user.email,
        daysLeft:     Math.round(daysLeft),
        trialEndDate: user.trialEndsAt,
      })
      sent.push(user.email)
    } catch (err: any) {
      console.error('[trial-reminder] failed for', user.email, err?.message)
      errors.push(user.email)
    }
  }

  return NextResponse.json({ sent: sent.length, errors: errors.length, at: now.toISOString() })
}
