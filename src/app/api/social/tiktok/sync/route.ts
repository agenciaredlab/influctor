import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getApiSession } from '@/lib/session'
import { syncTikTokAccount } from '@/lib/tiktok-sync'

export async function POST(_req: NextRequest) {
  try {
    const sessionUser = await getApiSession()
    if (!sessionUser) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const account = await prisma.socialAccount.findFirst({
      where: { userId: sessionUser.id, platform: 'tiktok', isActive: true },
    })

    if (!account) {
      return NextResponse.json({ error: 'No TikTok account connected' }, { status: 404 })
    }

    // Treat expired refresh token as a disconnected account
    if (account.tokenExpiresAt && !account.refreshToken) {
      const expired = account.tokenExpiresAt < new Date()
      if (expired) {
        await prisma.socialAccount.update({ where: { id: account.id }, data: { isActive: false } })
        return NextResponse.json(
          { error: 'Token expirado. Reconecta tu cuenta de TikTok.' },
          { status: 401 }
        )
      }
    }

    const result = await syncTikTokAccount(account, sessionUser.id)
    return NextResponse.json({ success: true, synced: result })
  } catch (err: any) {
    console.error('TikTok sync error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// GET: return connected account status + recent snapshots
export async function GET(_req: NextRequest) {
  try {
    const sessionUser = await getApiSession()
    if (!sessionUser) return NextResponse.json({ connected: false })

    const account = await prisma.socialAccount.findFirst({
      where: { userId: sessionUser.id, platform: 'tiktok', isActive: true },
      include: {
        snapshots: { orderBy: { date: 'desc' }, take: 30 },
      },
    })

    if (!account) return NextResponse.json({ connected: false })

    return NextResponse.json({
      connected: true,
      account: {
        id:             account.id,
        username:       account.username,
        displayName:    account.displayName,
        profilePicture: account.profilePicture,
        biography:      account.biography,
        followersCount: account.followersCount,
        followingCount: account.followingCount,
        mediaCount:     account.mediaCount,
        accountType:    account.accountType,
        lastSyncAt:     account.lastSyncAt,
        tokenExpiresAt: account.tokenExpiresAt,
      },
      snapshots: account.snapshots,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
