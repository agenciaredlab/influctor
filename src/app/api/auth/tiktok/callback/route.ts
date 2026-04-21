import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getApiSession } from '@/lib/session'

const TIKTOK_API = 'https://open.tiktokapis.com/v2'

async function exchangeCode(code: string, appUrl: string) {
  const res = await fetch(`${TIKTOK_API}/oauth/token/`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_key:    process.env.TIKTOK_CLIENT_KEY!,
      client_secret: process.env.TIKTOK_CLIENT_SECRET!,
      code,
      grant_type:    'authorization_code',
      redirect_uri:  `${appUrl}/api/auth/tiktok/callback`,
    }),
  })
  if (!res.ok) throw new Error('Failed to exchange TikTok code')
  const data = await res.json()
  if (data.error && data.error !== 'ok') throw new Error(data.error_description || data.error)
  return data as {
    access_token:      string
    refresh_token:     string
    open_id:           string
    expires_in:        number          // seconds (~86400)
    refresh_expires_in: number         // seconds (~31536000)
    scope:             string
  }
}

async function fetchProfile(accessToken: string) {
  const fields = [
    'open_id', 'union_id', 'avatar_url', 'display_name',
    'bio_description', 'profile_deep_link', 'is_verified',
    'follower_count', 'following_count', 'likes_count', 'video_count',
  ].join(',')

  const res = await fetch(`${TIKTOK_API}/user/info/?fields=${fields}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) throw new Error('Failed to fetch TikTok profile')
  const body = await res.json()
  if (body.error?.code && body.error.code !== 'ok') {
    throw new Error(body.error.message || body.error.code)
  }
  return body.data.user as {
    open_id:          string
    union_id?:        string
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

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code  = searchParams.get('code')
  const error = searchParams.get('error')
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const redirectBase = `${appUrl}/settings`

  if (error) {
    return NextResponse.redirect(
      `${redirectBase}?tiktok_error=${encodeURIComponent(searchParams.get('error_description') || error)}`
    )
  }
  if (!code) {
    return NextResponse.redirect(`${redirectBase}?tiktok_error=no_code`)
  }

  try {
    const sessionUser = await getApiSession()
    if (!sessionUser) {
      return NextResponse.redirect(`${redirectBase}?tiktok_error=not_authenticated`)
    }

    const tokens  = await exchangeCode(code, appUrl)
    const profile = await fetchProfile(tokens.access_token)

    const tokenExpiresAt        = new Date(Date.now() + tokens.expires_in         * 1000)
    const refreshTokenExpiresAt = new Date(Date.now() + tokens.refresh_expires_in * 1000)

    // username: parse handle from profile_deep_link (https://www.tiktok.com/@handle)
    const handleMatch = profile.profile_deep_link?.match(/@([\w.]+)/)
    const username    = handleMatch?.[1] ?? profile.display_name

    const accountData = {
      accessToken:    tokens.access_token,
      refreshToken:   tokens.refresh_token,
      tokenExpiresAt,
      scopes:         tokens.scope,
      username,
      displayName:    profile.display_name || username,
      profilePicture: profile.avatar_url   || null,
      biography:      profile.bio_description || null,
      followersCount: profile.follower_count  ?? 0,
      followingCount: profile.following_count ?? 0,
      mediaCount:     profile.video_count     ?? 0,
      accountType:    profile.is_verified ? 'VERIFIED' : 'CREATOR',
      isActive:       true,
      lastSyncAt:     new Date(),
    }

    await prisma.socialAccount.upsert({
      where: {
        userId_platform_platformUserId: {
          userId:         sessionUser.id,
          platform:       'tiktok',
          platformUserId: profile.open_id,
        },
      },
      update: accountData,
      create: {
        userId:         sessionUser.id,
        platform:       'tiktok',
        platformUserId: profile.open_id,
        ...accountData,
      },
    })

    return NextResponse.redirect(`${redirectBase}?tiktok_connected=1`)
  } catch (err: any) {
    console.error('TikTok OAuth error:', err)
    return NextResponse.redirect(
      `${redirectBase}?tiktok_error=${encodeURIComponent(err.message || 'Error desconocido')}`
    )
  }
}
