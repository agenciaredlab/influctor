import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { syncTikTokAccount } from '@/lib/tiktok-sync'

export const dynamic = 'force-dynamic'

/**
 * Called daily (7am UTC) by Vercel Cron.
 * Syncs all active TikTok accounts not yet synced today.
 * Accounts with expired access tokens are included when they have a valid
 * refresh token — syncTikTokAccount calls maybeRefreshToken automatically.
 */
export async function GET(req: NextRequest) {
  if (process.env.CRON_SECRET) {
    const auth = req.headers.get('authorization')
    if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Include accounts whose access token is still valid OR whose refresh token
  // can obtain a new one. The sync lib handles the actual refresh.
  const accounts = await prisma.socialAccount.findMany({
    where: {
      platform: 'tiktok',
      isActive: true,
      AND: [
        {
          OR: [
            { lastSyncAt: null },
            { lastSyncAt: { lt: today } },
          ],
        },
        {
          OR: [
            { tokenExpiresAt: null },
            { tokenExpiresAt: { gt: new Date() } },
            { refreshToken: { not: null } },
          ],
        },
      ],
    },
  })

  const results: { accountId: string; username: string; success: boolean; error?: string }[] = []

  for (const account of accounts) {
    try {
      await syncTikTokAccount(account, account.userId)
      results.push({ accountId: account.id, username: account.username, success: true })
    } catch (e: any) {
      console.error(`[CRON] sync-tiktok failed for ${account.id} (@${account.username}):`, e.message)
      results.push({ accountId: account.id, username: account.username, success: false, error: e.message })
    }
  }

  const succeeded = results.filter(r => r.success).length
  const failed    = results.filter(r => !r.success).length
  console.log(`[CRON] sync-tiktok: ${succeeded} synced, ${failed} failed out of ${accounts.length} accounts`)

  return NextResponse.json({ processed: accounts.length, succeeded, failed, results })
}
