import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// This route is called by a cron job every minute (e.g. Vercel Cron or external service).
// It finds posts that are scheduled for "now" and publishes them to Instagram.
//
// Setup options:
// 1. Vercel: add to vercel.json:
//    { "crons": [{ "path": "/api/cron/publish-scheduled", "schedule": "* * * * *" }] }
//
// 2. Any cron service (cron-job.org, GitHub Actions, etc.):
//    GET https://yourdomain.com/api/cron/publish-scheduled
//    every 1 minute
//
// 3. Local dev: run manually or use a tool like `node-cron`

const CRON_SECRET = process.env.CRON_SECRET

export async function GET(req: NextRequest) {
  // Optional: protect with a secret header
  if (CRON_SECRET) {
    const authHeader = req.headers.get('authorization')
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const now = new Date()
  const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000)

  // Find all posts scheduled within the last 5 minutes that haven't been published
  // (5-min window handles cron delays)
  const duePosts = await prisma.contentPost.findMany({
    where: {
      status: 'scheduled',
      scheduledAt: { gte: fiveMinutesAgo, lte: now },
      publishedMediaId: null,
      publishAttempts: { lt: 3 }, // don't retry more than 3 times
    },
  })

  if (duePosts.length === 0) {
    return NextResponse.json({ processed: 0, message: 'No posts due' })
  }

  const results: { postId: string; success: boolean; error?: string }[] = []

  for (const post of duePosts) {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/social/instagram/publish`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ postId: post.id }),
        }
      )
      const data = await res.json()
      results.push({ postId: post.id, success: res.ok, error: data.error })
    } catch (e: any) {
      results.push({ postId: post.id, success: false, error: e.message })
    }
  }

  const succeeded = results.filter(r => r.success).length
  const failed = results.filter(r => !r.success).length

  console.log(`[CRON] publish-scheduled: ${succeeded} published, ${failed} failed`)

  return NextResponse.json({ processed: duePosts.length, succeeded, failed, results })
}
