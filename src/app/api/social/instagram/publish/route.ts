import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const META_BASE = 'https://graph.facebook.com/v21.0'

// Step 1: Create a media container on Instagram
async function createMediaContainer(
  igUserId: string,
  token: string,
  params: {
    imageUrl?: string
    videoUrl?: string
    caption: string
    mediaType: 'IMAGE' | 'VIDEO' | 'REELS' | 'STORIES'
    isCarouselItem?: boolean
    children?: string[] // for carousel: array of container IDs
  }
): Promise<string> {
  const body: Record<string, string> = {
    access_token: token,
    caption: params.caption,
  }

  if (params.mediaType === 'REELS') {
    body.media_type = 'REELS'
    body.video_url = params.videoUrl || ''
    body.share_to_feed = 'true'
  } else if (params.mediaType === 'STORIES') {
    body.media_type = 'STORIES'
    if (params.videoUrl) body.video_url = params.videoUrl
    else body.image_url = params.imageUrl || ''
  } else if (params.mediaType === 'VIDEO') {
    body.media_type = 'VIDEO'
    body.video_url = params.videoUrl || ''
  } else {
    // IMAGE (default)
    body.image_url = params.imageUrl || ''
    if (params.isCarouselItem) body.is_carousel_item = 'true'
  }

  const res = await fetch(`${META_BASE}/${igUserId}/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(body),
  })

  const data = await res.json()
  if (!res.ok || !data.id) {
    throw new Error(data.error?.message || 'Failed to create media container')
  }
  return data.id
}

// Step 2: Poll until container is ready (for videos/reels)
async function waitForContainer(
  containerId: string,
  token: string,
  maxAttempts = 15
): Promise<void> {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(r => setTimeout(r, 3000)) // wait 3s between checks
    const res = await fetch(
      `${META_BASE}/${containerId}?fields=status_code,status&access_token=${token}`
    )
    const data = await res.json()
    if (data.status_code === 'FINISHED') return
    if (data.status_code === 'ERROR') {
      throw new Error(`Media container error: ${data.status || 'UNKNOWN'}`)
    }
  }
  throw new Error('Media container timed out — try again')
}

// Step 3: Publish the container
async function publishContainer(
  igUserId: string,
  containerId: string,
  token: string
): Promise<string> {
  const res = await fetch(`${META_BASE}/${igUserId}/media_publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      creation_id: containerId,
      access_token: token,
    }),
  })
  const data = await res.json()
  if (!res.ok || !data.id) {
    throw new Error(data.error?.message || 'Failed to publish media')
  }
  return data.id // this is the published Instagram media ID
}

// Detect media type from URL or explicit override
function detectMediaType(
  url: string,
  typeOverride?: string
): 'IMAGE' | 'VIDEO' | 'REELS' | 'STORIES' {
  if (typeOverride === 'reel') return 'REELS'
  if (typeOverride === 'story') return 'STORIES'
  const lower = url.toLowerCase()
  if (lower.match(/\.(mp4|mov|avi|mkv)(\?|$)/)) return 'VIDEO'
  return 'IMAGE'
}

export async function POST(req: NextRequest) {
  try {
    const { postId } = await req.json()

    if (!postId) {
      return NextResponse.json({ error: 'postId requerido' }, { status: 400 })
    }

    // 1. Get the ContentPost
    const post = await prisma.contentPost.findUnique({ where: { id: postId } })
    if (!post) return NextResponse.json({ error: 'Post no encontrado' }, { status: 404 })

    if (post.status === 'published') {
      return NextResponse.json({ error: 'Este post ya fue publicado' }, { status: 400 })
    }

    if (!post.imageUrl) {
      return NextResponse.json(
        { error: 'El post necesita una URL de imagen o video para publicar en Instagram' },
        { status: 400 }
      )
    }

    // 2. Get Instagram account
    const user = await prisma.user.findFirst({ where: { email: 'demo@influctor.app' } })
    if (!user) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })

    const igAccount = await prisma.socialAccount.findFirst({
      where: { userId: user.id, platform: 'instagram', isActive: true },
    })

    if (!igAccount) {
      return NextResponse.json(
        { error: 'No hay cuenta de Instagram conectada. Ve a Configuración para conectarla.' },
        { status: 404 }
      )
    }

    // Check token expiry
    if (igAccount.tokenExpiresAt && igAccount.tokenExpiresAt < new Date()) {
      return NextResponse.json(
        { error: 'El token de Instagram expiró. Reconecta tu cuenta en Configuración.' },
        { status: 401 }
      )
    }

    const igUserId = igAccount.platformUserId
    const token = igAccount.accessToken

    // 3. Build the caption (caption + hashtags)
    const captionParts = []
    if (post.caption) captionParts.push(post.caption)
    if (post.hashtags) captionParts.push('\n\n' + post.hashtags)
    const fullCaption = captionParts.join('').slice(0, 2200) // Instagram caption limit

    const mediaType = detectMediaType(post.imageUrl, post.type)

    // 4. Mark as "publishing" to prevent double-publish
    await prisma.contentPost.update({
      where: { id: postId },
      data: {
        publishAttempts: { increment: 1 },
        publishError: null,
      },
    })

    let publishedId: string

    try {
      // 5. Create container
      const containerId = await createMediaContainer(igUserId, token, {
        imageUrl: ['IMAGE', 'STORIES'].includes(mediaType) ? post.imageUrl : undefined,
        videoUrl: ['VIDEO', 'REELS'].includes(mediaType) ? post.imageUrl : undefined,
        caption: fullCaption,
        mediaType,
      })

      // 6. For videos/reels, wait for processing
      if (['VIDEO', 'REELS'].includes(mediaType)) {
        await waitForContainer(containerId, token)
      }

      // 7. Publish
      publishedId = await publishContainer(igUserId, containerId, token)
    } catch (publishErr: any) {
      // Record error but don't crash
      await prisma.contentPost.update({
        where: { id: postId },
        data: { publishError: publishErr.message },
      })
      return NextResponse.json({ error: publishErr.message }, { status: 422 })
    }

    // 8. Update post as published
    const updated = await prisma.contentPost.update({
      where: { id: postId },
      data: {
        status: 'published',
        publishedAt: new Date(),
        publishedMediaId: publishedId,
        publishError: null,
      },
    })

    return NextResponse.json({
      success: true,
      mediaId: publishedId,
      post: updated,
      permalink: `https://www.instagram.com/p/${publishedId}/`,
    })
  } catch (err: any) {
    console.error('Publish error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
