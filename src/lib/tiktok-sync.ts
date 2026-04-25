import { prisma } from '@/lib/prisma'
import { getTikTokClientKey, getTikTokClientSecret } from '@/lib/config'

const TIKTOK_API = 'https://open.tiktokapis.com/v2'

// ── Token refresh ─────────────────────────────────────────────────────────────

async function maybeRefreshToken(account: TikTokAccountForSync): Promise<string> {
  // Refresh when < 2 hours remain on the access token
  const twoHours = 2 * 3600 * 1000
  const needsRefresh =
    !account.tokenExpiresAt ||
    account.tokenExpiresAt.getTime() - Date.now() < twoHours

  if (!needsRefresh) return account.accessToken
  if (!account.refreshToken) return account.accessToken // can't refresh, try anyway

  const [clientKey, clientSecret] = await Promise.all([
    getTikTokClientKey(),
    getTikTokClientSecret(),
  ])

  const res = await fetch(`${TIKTOK_API}/oauth/token/`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_key:    clientKey,
      client_secret: clientSecret,
      grant_type:    'refresh_token',
      refresh_token: account.refreshToken,
    }),
  })

  if (!res.ok) return account.accessToken
  const data = await res.json()
  if (data.error && data.error !== 'ok') return account.accessToken

  await prisma.socialAccount.update({
    where: { id: account.id },
    data: {
      accessToken:    data.access_token,
      refreshToken:   data.refresh_token,
      tokenExpiresAt: new Date(Date.now() + data.expires_in * 1000),
    },
  })

  return data.access_token as string
}

// ── API helpers ───────────────────────────────────────────────────────────────

async function fetchProfile(token: string) {
  const fields = [
    'open_id', 'avatar_url', 'display_name', 'bio_description',
    'profile_deep_link', 'is_verified',
    'follower_count', 'following_count', 'likes_count', 'video_count',
  ].join(',')

  const res = await fetch(`${TIKTOK_API}/user/info/?fields=${fields}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Failed to fetch TikTok user info')
  const body = await res.json()
  if (body.error?.code && body.error.code !== 'ok') {
    throw new Error(body.error.message || body.error.code)
  }
  return body.data.user as {
    open_id:          string
    avatar_url?:      string
    display_name:     string
    bio_description?: string
    profile_deep_link?: string
    is_verified?:     boolean
    follower_count?:  number
    following_count?: number
    likes_count?:     number
    video_count?:     number
  }
}

async function fetchRecentVideos(token: string, maxCount = 20) {
  const fields = [
    'id', 'title', 'duration', 'cover_image_url', 'embed_link',
    'like_count', 'comment_count', 'share_count', 'view_count', 'create_time',
  ].join(',')

  const res = await fetch(`${TIKTOK_API}/video/list/?fields=${fields}`, {
    method:  'POST',
    headers: {
      Authorization:  `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ max_count: maxCount }),
  })

  if (!res.ok) return []
  const body = await res.json()
  if (body.error?.code && body.error.code !== 'ok') return []
  return (body.data?.videos ?? []) as {
    id:            string
    like_count?:   number
    comment_count?: number
    share_count?:  number
    view_count?:   number
    create_time?:  number
  }[]
}

// ── Public interface ──────────────────────────────────────────────────────────

export interface TikTokAccountForSync {
  id:             string
  platformUserId: string
  accessToken:    string
  refreshToken:   string | null
  tokenExpiresAt: Date | null
  followersCount: number
  followingCount: number
  mediaCount:     number
  biography:      string | null
  profilePicture: string | null
}

export interface TikTokSyncResult {
  profile:        boolean
  videosProcessed: number
  followers:      number
  newFollowers:   number
  totalViews:     number
  engagement:     number
}

export async function syncTikTokAccount(
  account: TikTokAccountForSync,
  userId: string,
): Promise<TikTokSyncResult> {
  const token = await maybeRefreshToken(account)

  // 1. Profile
  const profile = await fetchProfile(token)

  const followers    = profile.follower_count  ?? account.followersCount
  const newFollowers = Math.max(0, followers - account.followersCount)

  await prisma.socialAccount.update({
    where: { id: account.id },
    data: {
      followersCount: followers,
      followingCount: profile.following_count ?? account.followingCount,
      mediaCount:     profile.video_count     ?? account.mediaCount,
      biography:      profile.bio_description || account.biography,
      profilePicture: profile.avatar_url      || account.profilePicture,
      accountType:    profile.is_verified ? 'VERIFIED' : 'CREATOR',
      lastSyncAt:     new Date(),
    },
  })

  // 2. Recent videos — compute engagement metrics for the snapshot
  const videos = await fetchRecentVideos(token, 20)

  let totalLikes    = 0
  let totalComments = 0
  let totalViews    = 0
  let topVideo: typeof videos[0] | null = null
  let maxViews = 0

  for (const v of videos) {
    const likes    = v.like_count    ?? 0
    const comments = v.comment_count ?? 0
    const views    = v.view_count    ?? 0
    totalLikes    += likes
    totalComments += comments
    totalViews    += views
    if (views > maxViews) { maxViews = views; topVideo = v }
  }

  const n          = videos.length
  const avgLikes   = n > 0 ? totalLikes    / n : 0
  const avgComments = n > 0 ? totalComments / n : 0
  // Engagement rate: (avg likes + avg comments) / followers × 100
  const engagement = followers > 0 && n > 0
    ? ((totalLikes + totalComments) / n / followers) * 100
    : 0

  // 3. Save today's snapshot
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const snapshotData = {
    followers,
    following:    profile.following_count ?? account.followingCount,
    mediaCount:   profile.video_count     ?? account.mediaCount,
    // TikTok doesn't expose account-level reach/impressions without Ads API;
    // use total video views from recent posts as the closest approximation
    reach:        totalViews,
    impressions:  totalViews,
    profileViews: 0,
    websiteClicks: 0,
    newFollowers,
    engagement,
    avgLikes,
    avgComments,
    topPostId:    topVideo?.id    ?? null,
    topPostLikes: topVideo?.like_count ?? 0,
    rawData:      JSON.stringify({ follower_count: followers, video_count: profile.video_count }),
  }

  await prisma.socialSnapshot.upsert({
    where:  { socialAccountId_date: { socialAccountId: account.id, date: today } },
    update: snapshotData,
    create: { socialAccountId: account.id, userId, platform: 'tiktok', date: today, ...snapshotData },
  })

  return {
    profile:         true,
    videosProcessed: n,
    followers,
    newFollowers,
    totalViews,
    engagement,
  }
}
