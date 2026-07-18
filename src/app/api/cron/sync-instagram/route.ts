import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { syncInstagramAccount } from '@/lib/instagram-sync'

export const dynamic = 'force-dynamic'

/**
 * Called daily (6am UTC) by Vercel Cron.
 * Syncs all active Instagram accounts that haven't been synced today.
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

  // Find active accounts with non-expired tokens not yet synced today
  const accounts = await prisma.socialAccount.findMany({
    where: {
      platform:  'instagram',
      isActive:  true,
      OR: [
        { tokenExpiresAt: null },
        { tokenExpiresAt: { gt: new Date() } },
      ],
      AND: [
        {
          OR: [
            { lastSyncAt: null },
            { lastSyncAt: { lt: today } },
          ],
        },
      ],
    },
  })

  const results: { accountId: string; username: string; success: boolean; error?: string }[] = []

  for (const account of accounts) {
    try {
      await syncInstagramAccount(account, account.userId)
      results.push({ accountId: account.id, username: account.username, success: true })
    } catch (e: any) {
      console.error(`[CRON] sync-instagram failed for ${account.id} (@${account.username}):`, e.message)
      results.push({ accountId: account.id, username: account.username, success: false, error: e.message })
    }
  }

  const succeeded = results.filter(r => r.success).length
  const failed    = results.filter(r => !r.success).length
  console.log(`[CRON] sync-instagram: ${succeeded} synced, ${failed} failed out of ${accounts.length} accounts`)

  return NextResponse.json({ processed: accounts.length, succeeded, failed, results })
}
