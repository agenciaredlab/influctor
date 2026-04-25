import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getApiSession } from '@/lib/session'
import { getInstagramAppId, getInstagramAppSecret, getAppUrl } from '@/lib/config'

const META_BASE = 'https://graph.facebook.com/v21.0'

async function exchangeCodeForToken(
  code: string,
  appId: string,
  appSecret: string,
  appUrl: string,
): Promise<{ access_token: string; token_type: string }> {
  const res = await fetch(`${META_BASE}/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id:     appId,
      client_secret: appSecret,
      redirect_uri:  `${appUrl}/api/auth/instagram/callback`,
      code,
    }),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error?.message || 'Failed to exchange code')
  }
  return res.json()
}

async function getLongLivedToken(
  shortToken: string,
  appId: string,
  appSecret: string,
): Promise<{ access_token: string; token_type: string; expires_in: number }> {
  const params = new URLSearchParams({
    grant_type:        'fb_exchange_token',
    client_id:         appId,
    client_secret:     appSecret,
    fb_exchange_token: shortToken,
  })
  const res = await fetch(`${META_BASE}/oauth/access_token?${params}`)
  if (!res.ok) throw new Error('Failed to get long-lived token')
  return res.json()
}

async function getFacebookPages(token: string) {
  const res = await fetch(`${META_BASE}/me/accounts?access_token=${token}`)
  if (!res.ok) throw new Error('Failed to get Facebook pages')
  const data = await res.json()
  return data.data as Array<{ id: string; name: string; access_token: string }>
}

async function getInstagramAccountFromPage(pageId: string, pageToken: string) {
  const res = await fetch(
    `${META_BASE}/${pageId}?fields=instagram_business_account&access_token=${pageToken}`
  )
  if (!res.ok) return null
  const data = await res.json()
  return data.instagram_business_account?.id || null
}

async function getInstagramProfile(igUserId: string, token: string) {
  const fields = [
    'id',
    'username',
    'name',
    'biography',
    'profile_picture_url',
    'website',
    'followers_count',
    'follows_count',
    'media_count',
    'account_type',
  ].join(',')

  const res = await fetch(`${META_BASE}/${igUserId}?fields=${fields}&access_token=${token}`)
  if (!res.ok) throw new Error('Failed to get Instagram profile')
  return res.json()
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  const [appId, appSecret, baseUrl] = await Promise.all([
    getInstagramAppId(),
    getInstagramAppSecret(),
    getAppUrl(),
  ])
  const resolvedAppUrl = baseUrl || 'http://localhost:3000'
  const redirectBase = `${resolvedAppUrl}/settings`

  // User denied access
  if (error) {
    return NextResponse.redirect(
      `${redirectBase}?instagram_error=${encodeURIComponent(errorDescription || error)}`
    )
  }

  if (!code) {
    return NextResponse.redirect(`${redirectBase}?instagram_error=no_code`)
  }

  try {
    const sessionUser = await getApiSession()
    if (!sessionUser) {
      return NextResponse.redirect(`${redirectBase}?instagram_error=not_authenticated`)
    }

    // 1. Exchange auth code for short-lived token
    const { access_token: shortToken } = await exchangeCodeForToken(code, appId, appSecret, resolvedAppUrl)

    // 2. Exchange for long-lived token (60 days)
    const { access_token: longToken, expires_in } = await getLongLivedToken(shortToken, appId, appSecret)

    const tokenExpiresAt = new Date(Date.now() + expires_in * 1000)

    // 3. Get Facebook pages to find linked Instagram Business Account
    const pages = await getFacebookPages(longToken)

    if (pages.length === 0) {
      return NextResponse.redirect(
        `${redirectBase}?instagram_error=${encodeURIComponent(
          'No se encontraron páginas de Facebook. Conecta tu Instagram a una Página de Facebook primero.'
        )}`
      )
    }

    // 4. Find Instagram Business Account from pages
    let igUserId: string | null = null
    const igPageToken: string = longToken

    for (const page of pages) {
      const igId = await getInstagramAccountFromPage(page.id, page.access_token)
      if (igId) {
        igUserId = igId
        break
      }
    }

    if (!igUserId) {
      return NextResponse.redirect(
        `${redirectBase}?instagram_error=${encodeURIComponent(
          'No se encontró una cuenta de Instagram vinculada. Asegúrate de que tu cuenta sea tipo Empresa o Creador.'
        )}`
      )
    }

    // 5. Get Instagram profile data
    const profile = await getInstagramProfile(igUserId, longToken)

    // 6. Upsert SocialAccount
    await prisma.socialAccount.upsert({
      where: {
        userId_platform_platformUserId: {
          userId: sessionUser.id,
          platform: 'instagram',
          platformUserId: igUserId,
        },
      },
      update: {
        accessToken: longToken,
        tokenExpiresAt,
        username: profile.username,
        displayName: profile.name || profile.username,
        profilePicture: profile.profile_picture_url || null,
        biography: profile.biography || null,
        website: profile.website || null,
        followersCount: profile.followers_count || 0,
        followingCount: profile.follows_count || 0,
        mediaCount: profile.media_count || 0,
        accountType: profile.account_type || null,
        isActive: true,
        lastSyncAt: new Date(),
        scopes: 'instagram_basic,instagram_manage_insights,instagram_content_publish,pages_show_list',
      },
      create: {
        userId: sessionUser.id,
        platform: 'instagram',
        platformUserId: igUserId,
        accessToken: longToken,
        tokenExpiresAt,
        username: profile.username,
        displayName: profile.name || profile.username,
        profilePicture: profile.profile_picture_url || null,
        biography: profile.biography || null,
        website: profile.website || null,
        followersCount: profile.followers_count || 0,
        followingCount: profile.follows_count || 0,
        mediaCount: profile.media_count || 0,
        accountType: profile.account_type || null,
        isActive: true,
        lastSyncAt: new Date(),
        scopes: 'instagram_basic,instagram_manage_insights,instagram_content_publish,pages_show_list',
      },
    })

    return NextResponse.redirect(`${redirectBase}?instagram_connected=1`)
  } catch (err: any) {
    console.error('Instagram OAuth error:', err)
    return NextResponse.redirect(
      `${redirectBase}?instagram_error=${encodeURIComponent(err.message || 'Error desconocido')}`
    )
  }
}
