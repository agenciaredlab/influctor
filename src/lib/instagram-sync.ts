import { prisma } from '@/lib/prisma'

const META_BASE = 'https://graph.facebook.com/v21.0'

async function getAccountInsights(igUserId: string, token: string) {
  const since = Math.floor((Date.now() - 30 * 24 * 3600 * 1000) / 1000)
  const until = Math.floor(Date.now() / 1000)
  const metrics = [
    'impressions', 'reach', 'profile_views',
    'follower_count', 'website_clicks', 'email_contacts',
  ].join(',')
  const params = new URLSearchParams({
    metric: metrics, period: 'day',
    since: String(since), until: String(until),
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
    'id', 'caption', 'media_type', 'media_url',
    'thumbnail_url', 'permalink', 'timestamp', 'like_count', 'comments_count',
  ].join(',')
  const params = new URLSearchParams({ fields, limit: '20', access_token: token })
  const res = await fetch(`${META_BASE}/${igUserId}/media?${params}`)
  if (!res.ok) return { data: [] }
  return res.json()
}

async function getMediaInsights(mediaId: string, mediaType: string, token: string) {
  const isVideo = ['VIDEO', 'REEL'].includes(mediaType)
  const metrics = [
    'impressions', 'reach', 'saved',
    ...(isVideo ? ['video_views'] : []),
    'total_interactions',
  ].join(',')
  const res = await fetch(`${META_BASE}/${mediaId}/insights?metric=${metrics}&access_token=${token}`)
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

export interface AccountForSync {
  id: string
  platformUserId: string
  accessToken: string
  tokenExpiresAt: Date | null
  followersCount: number
  followingCount: number
  mediaCount: number
  biography: string | null
  website: string | null
  profilePicture: string | null
}

export interface SyncResult {
  profile: boolean
  insights: boolean
  mediaSynced: number
  followers: number
  newFollowers: number
  reach: number
  impressions: number
}

export async function syncInstagramAccount(account: AccountForSync, userId: string): Promise<SyncResult> {
  const { platformUserId: igUserId, accessToken: token } = account

  // 1. Refresh profile
  const profile = await refreshProfileData(igUserId, token)
  if (profile) {
    await prisma.socialAccount.update({
      where: { id: account.id },
      data: {
        followersCount: profile.followers_count ?? account.followersCount,
        followingCount: profile.follows_count ?? account.followingCount,
        mediaCount:     profile.media_count    ?? account.mediaCount,
        biography:      profile.biography      || account.biography,
        website:        profile.website        || account.website,
        profilePicture: profile.profile_picture_url || account.profilePicture,
        lastSyncAt:     new Date(),
      },
    })
  }

  // 2. Account-level insights
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
    console.warn(`[IG Sync] Could not fetch account insights for ${account.id}:`, e)
  }

  const followers    = profile?.followers_count ?? account.followersCount
  const newFollowers = Math.max(0, followers - account.followersCount)

  // 3. Sync recent media; accumulate engagement metrics
  const mediaResponse = await getRecentMedia(igUserId, token)
  const media: any[]  = mediaResponse.data ?? []

  let topPost: any    = null
  let maxLikes        = 0
  let totalLikes      = 0
  let totalComments   = 0

  for (const post of media.slice(0, 10)) {
    const mediaInsights  = await getMediaInsights(post.id, post.media_type, token)
    const likeCount      = post.like_count      ?? 0
    const commentsCount  = post.comments_count  ?? 0
    totalLikes    += likeCount
    totalComments += commentsCount
    if (likeCount > maxLikes) { maxLikes = likeCount; topPost = post }

    await prisma.instagramMedia.upsert({
      where:  { igMediaId: post.id },
      update: {
        caption:       post.caption?.slice(0, 2000) || null,
        likeCount,
        commentsCount,
        impressions:   mediaInsights?.impressions        ?? 0,
        reach:         mediaInsights?.reach              ?? 0,
        saved:         mediaInsights?.saved              ?? 0,
        videoViews:    mediaInsights?.video_views        ?? 0,
        engagement:    mediaInsights?.total_interactions ?? 0,
        updatedAt:     new Date(),
      },
      create: {
        igMediaId:       post.id,
        socialAccountId: account.id,
        userId,
        mediaType:       post.media_type,
        caption:         post.caption?.slice(0, 2000) || null,
        mediaUrl:        post.media_url        || null,
        thumbnailUrl:    post.thumbnail_url    || null,
        permalink:       post.permalink        || null,
        timestamp:       new Date(post.timestamp),
        likeCount,
        commentsCount,
        impressions:     mediaInsights?.impressions        ?? 0,
        reach:           mediaInsights?.reach              ?? 0,
        saved:           mediaInsights?.saved              ?? 0,
        videoViews:      mediaInsights?.video_views        ?? 0,
        engagement:      mediaInsights?.total_interactions ?? 0,
      },
    })
  }

  const processed    = Math.min(media.length, 10)
  const avgLikes     = processed > 0 ? totalLikes    / processed : 0
  const avgComments  = processed > 0 ? totalComments / processed : 0
  // Engagement rate: average interactions per post as % of followers
  const engagement   = followers > 0 && processed > 0
    ? ((totalLikes + totalComments) / processed / followers) * 100
    : 0

  // 4. Save / update today's snapshot (after media loop so derived fields are ready)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const snapshotData = {
    followers,
    following:    profile?.follows_count ?? account.followingCount,
    mediaCount:   profile?.media_count   ?? account.mediaCount,
    reach:        insightsData['reach']         ?? 0,
    impressions:  insightsData['impressions']   ?? 0,
    profileViews: insightsData['profile_views'] ?? 0,
    websiteClicks: insightsData['website_clicks'] ?? 0,
    newFollowers,
    engagement,
    avgLikes,
    avgComments,
    topPostId:    topPost?.id   ?? null,
    topPostLikes: maxLikes,
    rawData:      JSON.stringify(insightsData),
  }

  await prisma.socialSnapshot.upsert({
    where:  { socialAccountId_date: { socialAccountId: account.id, date: today } },
    update: snapshotData,
    create: { socialAccountId: account.id, userId, platform: 'instagram', date: today, ...snapshotData },
  })

  return {
    profile:     !!profile,
    insights:    Object.keys(insightsData).length > 0,
    mediaSynced: media.length,
    followers,
    newFollowers,
    reach:       insightsData['reach']       ?? 0,
    impressions: insightsData['impressions'] ?? 0,
  }
}
