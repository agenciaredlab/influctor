import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getApiSession } from '@/lib/session'

const META_BASE = 'https://graph.facebook.com/v21.0'

async function getAccountInsights(igUserId: string, token: string) {
  // Get last 30 days of account-level insights
  const since = Math.floor((Date.now() - 30 * 24 * 3600 * 1000) / 1000)
  const until = Math.floor(Date.now() / 1000)

  const metrics = [
    'impressions',
    'reach',
    'profile_views',
    'follower_count',
    'website_clicks',
    'email_contacts',
  ].join(',')

  const params = new URLSearchParams({
    metric: metrics,
    period: 'day',
    since: String(since),
    until: String(until),
    access_token: token,
  })

  const res = await fetch(`${META_BASE}/${igUserId}/insights?${params}`)
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error?.message || 'Failed to get insights')
  }
  return res.json()
}

async function getRecentMedia(igUserId: string, token: string) {
  const fields = [
    'id',
    'caption',
    'media_type',
    'media_url',
    'thumbnail_url',
    'permalink',
    'timestamp',
    'like_count',
    'comments_count',
  ].join(',')

  const params = new URLSearchParams({
    fields,
    limit: '20',
    access_token: token,
  })

  const res = await fetch(`${META_BASE}/${igUserId}/media?${params}`)
  if (!res.ok) return { data: [] }
  return res.json()
}

async function getMediaInsights(mediaId: string, mediaType: string, token: string) {
  const isVideo = ['VIDEO', 'REEL'].includes(mediaType)
  const metrics = [
    'impressions',
    'reach',
    'saved',
    ...(isVideo ? ['video_views'] : []),
    'total_interactions',
  ].join(',')

  const res = await fetch(
    `${META_BASE}/${mediaId}/insights?metric=${metrics}&access_token=${token}`
  )
  if (!res.ok) return null
  const data = await res.json()

  const result: Record<string, number> = {}
  if (data.data) {
    for (const item of data.data) {
      result[item.name] = item.values?.[0]?.value ?? item.value ?? 0
    }
  }
  return result
}

async function refreshProfileData(igUserId: string, token: string) {
  const fields = 'followers_count,follows_count,media_count,biography,website,profile_picture_url,name,username'
  const res = await fetch(`${META_BASE}/${igUserId}?fields=${fields}&access_token=${token}`)
  if (!res.ok) return null
  return res.json()
}

export async function POST(req: NextRequest) {
  try {
    const sessionUser = await getApiSession()
    if (!sessionUser) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const account = await prisma.socialAccount.findFirst({
      where: { userId: sessionUser.id, platform: 'instagram', isActive: true },
    })

    if (!account) {
      return NextResponse.json({ error: 'No Instagram account connected' }, { status: 404 })
    }

    // Check token expiry
    if (account.tokenExpiresAt && account.tokenExpiresAt < new Date()) {
      await prisma.socialAccount.update({
        where: { id: account.id },
        data: { isActive: false },
      })
      return NextResponse.json({ error: 'Token expirado. Reconecta tu cuenta de Instagram.' }, { status: 401 })
    }

    const igUserId = account.platformUserId
    const token = account.accessToken

    // 1. Refresh profile data
    const profile = await refreshProfileData(igUserId, token)
    if (profile) {
      await prisma.socialAccount.update({
        where: { id: account.id },
        data: {
          followersCount: profile.followers_count ?? account.followersCount,
          followingCount: profile.follows_count ?? account.followingCount,
          mediaCount: profile.media_count ?? account.mediaCount,
          biography: profile.biography || account.biography,
          website: profile.website || account.website,
          profilePicture: profile.profile_picture_url || account.profilePicture,
          lastSyncAt: new Date(),
        },
      })
    }

    // 2. Get account insights
    let insightsData: Record<string, number> = {}
    try {
      const insights = await getAccountInsights(igUserId, token)
      if (insights.data) {
        for (const metric of insights.data) {
          const latest = metric.values?.[metric.values.length - 1]?.value ?? 0
          insightsData[metric.name] = latest
        }
      }
    } catch (e) {
      console.warn('Could not fetch account insights (may need Business account):', e)
    }

    // 3. Save snapshot for today
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const followers = profile?.followers_count ?? account.followersCount
    const newFollowers = Math.max(0, followers - account.followersCount)

    await prisma.socialSnapshot.upsert({
      where: { socialAccountId_date: { socialAccountId: account.id, date: today } },
      update: {
        followers,
        following: profile?.follows_count ?? account.followingCount,
        mediaCount: profile?.media_count ?? account.mediaCount,
        reach: insightsData['reach'] ?? 0,
        impressions: insightsData['impressions'] ?? 0,
        profileViews: insightsData['profile_views'] ?? 0,
        websiteClicks: insightsData['website_clicks'] ?? 0,
        newFollowers,
        rawData: JSON.stringify(insightsData),
      },
      create: {
        socialAccountId: account.id,
        userId: sessionUser.id,
        platform: 'instagram',
        date: today,
        followers,
        following: profile?.follows_count ?? account.followingCount,
        mediaCount: profile?.media_count ?? account.mediaCount,
        reach: insightsData['reach'] ?? 0,
        impressions: insightsData['impressions'] ?? 0,
        profileViews: insightsData['profile_views'] ?? 0,
        websiteClicks: insightsData['website_clicks'] ?? 0,
        newFollowers,
        rawData: JSON.stringify(insightsData),
      },
    })

    // 4. Sync recent media + their insights
    const mediaResponse = await getRecentMedia(igUserId, token)
    const media = mediaResponse.data ?? []
    let topPost = null
    let maxLikes = 0

    for (const post of media.slice(0, 10)) {
      const mediaInsights = await getMediaInsights(post.id, post.media_type, token)
      const likeCount = post.like_count ?? 0
      if (likeCount > maxLikes) { maxLikes = likeCount; topPost = post }

      await prisma.instagramMedia.upsert({
        where: { igMediaId: post.id },
        update: {
          caption: post.caption?.slice(0, 2000) || null,
          likeCount: post.like_count ?? 0,
          commentsCount: post.comments_count ?? 0,
          impressions: mediaInsights?.impressions ?? 0,
          reach: mediaInsights?.reach ?? 0,
          saved: mediaInsights?.saved ?? 0,
          videoViews: mediaInsights?.video_views ?? 0,
          engagement: mediaInsights?.total_interactions ?? 0,
          updatedAt: new Date(),
        },
        create: {
          igMediaId: post.id,
          socialAccountId: account.id,
          userId: sessionUser.id,
          mediaType: post.media_type,
          caption: post.caption?.slice(0, 2000) || null,
          mediaUrl: post.media_url || null,
          thumbnailUrl: post.thumbnail_url || null,
          permalink: post.permalink || null,
          timestamp: new Date(post.timestamp),
          likeCount: post.like_count ?? 0,
          commentsCount: post.comments_count ?? 0,
          impressions: mediaInsights?.impressions ?? 0,
          reach: mediaInsights?.reach ?? 0,
          saved: mediaInsights?.saved ?? 0,
          videoViews: mediaInsights?.video_views ?? 0,
          engagement: mediaInsights?.total_interactions ?? 0,
        },
      })
    }

    return NextResponse.json({
      success: true,
      synced: {
        profile: !!profile,
        insights: Object.keys(insightsData).length > 0,
        mediaSynced: media.length,
        followers,
        newFollowers,
        reach: insightsData['reach'] ?? 0,
        impressions: insightsData['impressions'] ?? 0,
      },
    })
  } catch (err: any) {
    console.error('Instagram sync error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// GET: return current connected account status + recent snapshots
export async function GET(_req: NextRequest) {
  try {
    const sessionUser = await getApiSession()
    if (!sessionUser) return NextResponse.json({ connected: false })

    const account = await prisma.socialAccount.findFirst({
      where: { userId: sessionUser.id, platform: 'instagram', isActive: true },
      include: {
        snapshots: {
          orderBy: { date: 'desc' },
          take: 30,
        },
      },
    })

    if (!account) return NextResponse.json({ connected: false })

    const recentMedia = await prisma.instagramMedia.findMany({
      where: { userId: sessionUser.id },
      orderBy: { timestamp: 'desc' },
      take: 12,
    })

    return NextResponse.json({
      connected: true,
      account: {
        id: account.id,
        username: account.username,
        displayName: account.displayName,
        profilePicture: account.profilePicture,
        biography: account.biography,
        website: account.website,
        followersCount: account.followersCount,
        followingCount: account.followingCount,
        mediaCount: account.mediaCount,
        accountType: account.accountType,
        lastSyncAt: account.lastSyncAt,
        tokenExpiresAt: account.tokenExpiresAt,
      },
      snapshots: account.snapshots,
      recentMedia,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
