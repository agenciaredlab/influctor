import { NextRequest, NextResponse } from 'next/server'

// Scopes needed for Instagram Graph API
// instagram_basic: username, media
// instagram_manage_insights: account insights (followers, reach, impressions)
// pages_show_list: list of FB pages to find linked IG account
// pages_read_engagement: page-level insights
const SCOPES = [
  'instagram_basic',
  'instagram_manage_insights',
  'instagram_content_publish', // needed to publish posts/reels/stories
  'pages_show_list',
  'pages_read_engagement',
].join(',')

export async function GET(req: NextRequest) {
  const appId = process.env.INSTAGRAM_APP_ID
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  if (!appId) {
    return NextResponse.json(
      { error: 'INSTAGRAM_APP_ID no configurado. Agrega tu App ID en .env.local' },
      { status: 503 }
    )
  }

  const redirectUri = `${appUrl}/api/auth/instagram/callback`

  // state param prevents CSRF - encode origin to redirect back after OAuth
  const state = Buffer.from(JSON.stringify({ ts: Date.now(), origin: '/settings' })).toString('base64')

  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    scope: SCOPES,
    response_type: 'code',
    state,
  })

  const authUrl = `https://www.facebook.com/v21.0/dialog/oauth?${params.toString()}`

  return NextResponse.redirect(authUrl)
}
