import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendPublishFailedNotification } from '@/lib/email'

/**
 * Called every minute by Vercel Cron or any external scheduler.
 *
 * Retry strategy (no schema change required — backoff computed from scheduledAt + attempts):
 *   attempt 0 → immediately at scheduledAt
 *   attempt 1 → 5 min  after scheduledAt
 *   attempt 2 → 20 min after scheduledAt  (5 + 15)
 *   attempt 3 → 50 min after scheduledAt  (5 + 15 + 30)  → last attempt
 *   after 4 failures → mark status = 'failed', send email
 */

const MAX_ATTEMPTS = 4

// Cumulative minute offsets from scheduledAt for each retry attempt
const BACKOFF_OFFSETS = [0, 5, 20, 50]

function nextRetryTime(scheduledAt: Date, attempts: number): Date {
  const offsetMin = BACKOFF_OFFSETS[Math.min(attempts, BACKOFF_OFFSETS.length - 1)]
  return new Date(scheduledAt.getTime() + offsetMin * 60 * 1000)
}

export async function GET(req: NextRequest) {
  if (process.env.CRON_SECRET) {
    const auth = req.headers.get('authorization')
    if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const now = new Date()
  // Look back 90 min to cover all possible retry windows (max offset is 50 min)
  const lookback = new Date(now.getTime() - 90 * 60 * 1000)

  // Fetch all scheduled posts that haven't been published and haven't exceeded attempts
  const candidates = await prisma.contentPost.findMany({
    where: {
      status:          'scheduled',
      scheduledAt:     { gte: lookback, lte: now },
      publishedMediaId: null,
      publishAttempts: { lt: MAX_ATTEMPTS },
    },
    include: {
      user: { select: { id: true, email: true, name: true } },
    },
  })

  // Apply backoff filter: only posts whose next retry time has arrived
  const duePosts = candidates.filter(p =>
    p.scheduledAt && nextRetryTime(p.scheduledAt, p.publishAttempts) <= now
  )

  if (duePosts.length === 0) {
    return NextResponse.json({ processed: 0, message: 'No posts due' })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  const results: { postId: string; success: boolean; attempt: number; error?: string }[] = []

  for (const post of duePosts) {
    const attempt = post.publishAttempts + 1 // this will be attempt N (1-indexed)
    let success = false
    let errorMsg: string | undefined

    try {
      // Call the publish endpoint — it handles the Instagram API logic
      const res = await fetch(`${appUrl}/api/social/instagram/publish`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ postId: post.id }),
      })
      const data = await res.json()
      success  = res.ok
      errorMsg = data.error
    } catch (e: any) {
      errorMsg = e.message
    }

    results.push({ postId: post.id, success, attempt, error: errorMsg })

    if (!success) {
      const exhausted = attempt >= MAX_ATTEMPTS

      if (exhausted) {
        // Mark as permanently failed
        await prisma.contentPost.update({
          where: { id: post.id },
          data:  { status: 'failed' },
        })

        // Notify the owner — fire-and-forget
        if (post.user?.email && post.scheduledAt) {
          sendPublishFailedNotification({
            userName:    post.user.name  ?? 'Creador',
            userEmail:   post.user.email,
            postTitle:   post.title,
            platform:    post.platform,
            scheduledAt: post.scheduledAt,
            attempts:    attempt,
            lastError:   errorMsg ?? 'Error desconocido',
          })?.catch(() => {})
        }
      } else {
        const nextAt = nextRetryTime(post.scheduledAt!, attempt)
        console.log(
          `[CRON] Post ${post.id} failed (attempt ${attempt}/${MAX_ATTEMPTS}). ` +
          `Next retry at ${nextAt.toISOString()}`
        )
      }
    }
  }

  const succeeded = results.filter(r => r.success).length
  const failed    = results.filter(r => !r.success).length
  const exhausted = results.filter(r => !r.success && r.attempt >= MAX_ATTEMPTS).length

  console.log(
    `[CRON] publish-scheduled: ${succeeded} published, ${failed} failed` +
    (exhausted ? `, ${exhausted} permanently failed` : '')
  )

  return NextResponse.json({ processed: duePosts.length, succeeded, failed, exhausted, results })
}
