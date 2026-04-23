import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getApiSession } from '@/lib/session'
import { syncInstagramAccount } from '@/lib/instagram-sync'

export async function POST(_req: NextRequest) {
  try {
    const sessionUser = await getApiSession()
    if (!sessionUser) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const account = await prisma.socialAccount.findFirst({
      where: { userId: sessionUser.id, platform: 'instagram', isActive: true },
    })

    if (!account) {
      return NextResponse.json({ error: 'No Instagram account connected' }, { status: 404 })
    }

    if (account.tokenExpiresAt && account.tokenExpiresAt < new Date()) {
      await prisma.socialAccount.update({
        where: { id: account.id },
        data:  { isActive: false },
      })
      return NextResponse.json(
        { error: 'Token expirado. Reconecta tu cuenta de Instagram.' },
        { status: 401 }
      )
    }

    const result = await syncInstagramAccount(account, sessionUser.id)
    return NextResponse.json({ success: true, synced: result })
  } catch (err: any) {
    console.error('[instagram sync POST]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET: return connected account status + recent snapshots
export async function GET(_req: NextRequest) {
  try {
    const sessionUser = await getApiSession()
    if (!sessionUser) return NextResponse.json({ connected: false })

    const account = await prisma.socialAccount.findFirst({
      where: { userId: sessionUser.id, platform: 'instagram', isActive: true },
      include: {
        snapshots: { orderBy: { date: 'desc' }, take: 30 },
      },
    })

    if (!account) return NextResponse.json({ connected: false })

    const recentMedia = await prisma.instagramMedia.findMany({
      where:   { userId: sessionUser.id },
      orderBy: { timestamp: 'desc' },
      take:    12,
    })

    return NextResponse.json({
      connected: true,
      account: {
        id:             account.id,
        username:       account.username,
        displayName:    account.displayName,
        profilePicture: account.profilePicture,
        biography:      account.biography,
        website:        account.website,
        followersCount: account.followersCount,
        followingCount: account.followingCount,
        mediaCount:     account.mediaCount,
        accountType:    account.accountType,
        lastSyncAt:     account.lastSyncAt,
        tokenExpiresAt: account.tokenExpiresAt,
      },
      snapshots:   account.snapshots,
      recentMedia,
    })
  } catch (err: any) {
    console.error('[instagram sync GET]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
