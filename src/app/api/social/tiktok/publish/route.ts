import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getApiSession } from '@/lib/session'
import { getTikTokClientKey, getTikTokClientSecret } from '@/lib/config'

const TIKTOK_API = 'https://open.tiktokapis.com/v2'

// ── Token refresh ─────────────────────────────────────────────────────────────

async function maybeRefreshToken(account: {
  id: string
  accessToken: string
  refreshToken: string | null
  tokenExpiresAt: Date | null
}): Promise<string> {
  const twoHours = 2 * 3600 * 1000
  const needsRefresh =
    !account.tokenExpiresAt ||
    account.tokenExpiresAt.getTime() - Date.now() < twoHours

  if (!needsRefresh) return account.accessToken
  if (!account.refreshToken) return account.accessToken

  const [clientKey, clientSecret] = await Promise.all([
    getTikTokClientKey(),
    getTikTokClientSecret(),
  ])

  const res = await fetch(`${TIKTOK_API}/oauth/token/`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_key:    clientKey ?? '',
      client_secret: clientSecret ?? '',
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

// ── TikTok Content Posting API ────────────────────────────────────────────────

// Step 1: Initialize a direct post (VIDEO_URL source — TikTok pulls from our URL)
async function initVideoPost(
  token: string,
  params: {
    title:         string
    videoUrl:      string
    privacyLevel?: string  // PUBLIC_TO_EVERYONE | MUTUAL_FOLLOW_FRIENDS | FOLLOWER_OF_CREATOR | SELF_ONLY
    disableDuet?:  boolean
    disableStitch?: boolean
    disableComment?: boolean
  }
): Promise<string> {
  const res = await fetch(`${TIKTOK_API}/post/publish/video/init/`, {
    method:  'POST',
    headers: {
      Authorization:  `Bearer ${token}`,
      'Content-Type': 'application/json; charset=UTF-8',
    },
    body: JSON.stringify({
      post_info: {
        title:          params.title.slice(0, 2200),
        privacy_level:  params.privacyLevel ?? 'PUBLIC_TO_EVERYONE',
        disable_duet:   params.disableDuet   ?? false,
        disable_stitch: params.disableStitch ?? false,
        disable_comment: params.disableComment ?? false,
      },
      source_info: {
        source:    'PULL_FROM_URL',
        video_url: params.videoUrl,
      },
    }),
  })

  const body = await res.json()
  if (!res.ok || body.error?.code !== 'ok') {
    throw new Error(body.error?.message || `TikTok init failed: ${res.status}`)
  }
  return body.data.publish_id as string
}

// Step 2: Poll publish status until PUBLISH_COMPLETE or error
async function waitForPublish(
  token: string,
  publishId: string,
  maxAttempts = 20
): Promise<string> {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(r => setTimeout(r, 5000)) // 5s between polls

    const res = await fetch(`${TIKTOK_API}/post/publish/status/fetch/`, {
      method:  'POST',
      headers: {
        Authorization:  `Bearer ${token}`,
        'Content-Type': 'application/json; charset=UTF-8',
      },
      body: JSON.stringify({ publish_id: publishId }),
    })

    const body = await res.json()
    if (!res.ok || body.error?.code !== 'ok') continue

    const status = body.data?.status as string | undefined
    if (status === 'PUBLISH_COMPLETE') {
      return body.data?.publicaly_available_post_id?.[0] ?? publishId
    }
    if (status === 'FAILED' || status === 'SPAM_REVIEW_FAILED') {
      throw new Error(`TikTok publish failed: ${body.data?.fail_reason ?? status}`)
    }
    // SENDING_TO_USER_INBOX / AWAITING_SCHEDULING — keep polling
  }
  throw new Error('TikTok publish timed out — check your TikTok app for the draft')
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const sessionUser = await getApiSession()
    if (!sessionUser) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const { postId } = await req.json()
    if (!postId) return NextResponse.json({ error: 'postId requerido' }, { status: 400 })

    const post = await prisma.contentPost.findUnique({ where: { id: postId } })
    if (!post) return NextResponse.json({ error: 'Post no encontrado' }, { status: 404 })
    if (post.status === 'published') {
      return NextResponse.json({ error: 'Este post ya fue publicado' }, { status: 400 })
    }
    if (!post.imageUrl) {
      return NextResponse.json(
        { error: 'El post necesita una URL de video para publicar en TikTok' },
        { status: 400 }
      )
    }

    // TikTok requires a video URL — reject image-only posts
    const isVideo = /\.(mp4|mov|avi|mkv|webm)(\?|$)/i.test(post.imageUrl)
    if (!isVideo) {
      return NextResponse.json(
        { error: 'TikTok solo acepta videos. Proporciona una URL de video (.mp4, .mov, etc.)' },
        { status: 400 }
      )
    }

    const account = await prisma.socialAccount.findFirst({
      where: { userId: sessionUser.id, platform: 'tiktok', isActive: true },
    })
    if (!account) {
      return NextResponse.json(
        { error: 'No hay cuenta de TikTok conectada. Ve a Configuración para conectarla.' },
        { status: 404 }
      )
    }

    // Check that the account has video.publish scope
    if (account.scopes && !account.scopes.includes('video.publish')) {
      return NextResponse.json(
        { error: 'Tu cuenta de TikTok no tiene permisos de publicación. Reconecta tu cuenta en Configuración.' },
        { status: 403 }
      )
    }

    if (account.tokenExpiresAt && account.tokenExpiresAt < new Date()) {
      return NextResponse.json(
        { error: 'El token de TikTok expiró. Reconecta tu cuenta en Configuración.' },
        { status: 401 }
      )
    }

    const token = await maybeRefreshToken(account)

    // Build title from caption + hashtags (TikTok's caption field)
    const parts = []
    if (post.caption)  parts.push(post.caption)
    if (post.hashtags) parts.push('\n' + post.hashtags)
    const title = parts.join('').slice(0, 2200) || post.title

    // Increment attempt counter before making the API call
    await prisma.contentPost.update({
      where: { id: postId },
      data:  { publishAttempts: { increment: 1 }, publishError: null },
    })

    let publishedId: string
    try {
      const publishId = await initVideoPost(token, { title, videoUrl: post.imageUrl })
      publishedId     = await waitForPublish(token, publishId)
    } catch (publishErr: any) {
      await prisma.contentPost.update({
        where: { id: postId },
        data:  { publishError: publishErr.message },
      })
      return NextResponse.json({ error: publishErr.message }, { status: 422 })
    }

    const updated = await prisma.contentPost.update({
      where: { id: postId },
      data:  {
        status:           'published',
        publishedAt:      new Date(),
        publishedMediaId: publishedId,
        publishError:     null,
      },
    })

    return NextResponse.json({
      success:   true,
      mediaId:   publishedId,
      post:      updated,
      permalink: `https://www.tiktok.com/@${account.username}/video/${publishedId}`,
    })
  } catch (err: any) {
    console.error('[tiktok publish POST]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
