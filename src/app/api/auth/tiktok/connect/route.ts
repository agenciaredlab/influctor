import { NextRequest, NextResponse } from 'next/server'
import { getTikTokClientKey, getAppUrl } from '@/lib/config'

// Scopes:
//   user.info.basic   — open_id, avatar_url, display_name
//   user.info.stats   — follower_count, following_count, likes_count, video_count
//   video.list        — list of recent videos with metrics
//   video.publish     — publish videos directly to TikTok feed
const SCOPES = 'user.info.basic,user.info.stats,video.list,video.publish'

export async function GET(_req: NextRequest) {
  const clientKey = await getTikTokClientKey()
  const appUrl    = (await getAppUrl()) ?? 'http://localhost:3000'

  if (!clientKey) {
    return NextResponse.json(
      { error: 'TIKTOK_CLIENT_KEY no configurado. Agrégalo en Admin → Configuración de servicios' },
      { status: 503 }
    )
  }

  const state = Buffer.from(JSON.stringify({ ts: Date.now(), origin: '/settings' })).toString('base64url')

  const params = new URLSearchParams({
    client_key:    clientKey,
    scope:         SCOPES,
    response_type: 'code',
    redirect_uri:  `${appUrl}/api/auth/tiktok/callback`,
    state,
  })

  return NextResponse.redirect(`https://www.tiktok.com/v2/auth/authorize/?${params}`)
}
