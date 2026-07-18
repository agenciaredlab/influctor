import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendWeeklyReport } from '@/lib/email'
import { buildReportData } from '../../email/weekly-report/route'

export const dynamic = 'force-dynamic'

// GET /api/cron/weekly-report
// Called weekly by Vercel Cron or external scheduler.
// Protected by CRON_SECRET header.
//
// Vercel cron config (vercel.json):
//   { "crons": [{ "path": "/api/cron/weekly-report", "schedule": "0 9 * * 1" }] }
// → every Monday at 09:00 UTC

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: 'RESEND_API_KEY no configurada' }, { status: 503 })
  }

  // Fetch all active Creator/Pro users with email reports enabled
  const users = await prisma.user.findMany({
    where: {
      plan: { in: ['creator', 'pro'] },
      planStatus: { in: ['active', 'trialing'] },
    },
    select: { id: true, email: true, name: true, plan: true },
  })

  const results = { sent: 0, failed: 0, errors: [] as string[] }

  for (const user of users) {
    try {
      const data = await buildReportData(user.id)
      await sendWeeklyReport(data)
      results.sent++
    } catch (err: any) {
      results.failed++
      results.errors.push(`${user.email}: ${err.message}`)
      console.error(`Weekly report failed for ${user.email}:`, err)
    }
  }

  console.log(`Weekly report cron: ${results.sent} sent, ${results.failed} failed`)
  return NextResponse.json(results)
}
