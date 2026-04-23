import { NextRequest, NextResponse } from 'next/server'
import { getApiSession } from '@/lib/session'
import Anthropic from '@anthropic-ai/sdk'
import { rateLimit, rateLimitKey } from '@/lib/rate-limit'

const META_BASE = 'https://graph.facebook.com/v21.0'

// Fetch public Facebook Page data using App Token (no user auth needed)
async function fetchFacebookPage(pageSlug: string): Promise<{ fans: number | null; followers: number | null } | null> {
  const appId     = process.env.INSTAGRAM_APP_ID
  const appSecret = process.env.INSTAGRAM_APP_SECRET
  if (!appId || !appSecret) return null

  try {
    const appToken = `${appId}|${appSecret}`
    const fields   = 'fan_count,followers_count,name'
    const res = await fetch(
      `${META_BASE}/${encodeURIComponent(pageSlug)}?fields=${fields}&access_token=${appToken}`,
      { next: { revalidate: 0 } }
    )
    if (!res.ok) return null
    const data = await res.json()
    if (data.error) return null
    return {
      fans:      data.fan_count      ?? null,
      followers: data.followers_count ?? null,
    }
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  const sessionUser = await getApiSession()
  if (!sessionUser) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  // 5 research requests per minute per user+IP (each call hits Anthropic + Facebook)
  const { ok, retryAfter } = await rateLimit(rateLimitKey(req, sessionUser.id), { limit: 5, window: 60 })
  if (!ok) {
    return NextResponse.json(
      { error: `Demasiadas solicitudes. Intenta de nuevo en ${retryAfter} segundos.` },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } }
    )
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'ANTHROPIC_API_KEY no configurada' }, { status: 503 })

  const { query } = await req.json()
  if (!query?.trim()) return NextResponse.json({ error: 'query requerido' }, { status: 400 })

  // Step 1 — Ask Claude to find the brand's social profiles
  const client = new Anthropic({ apiKey })

  let message: Awaited<ReturnType<typeof client.messages.create>>
  try {
    message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: `Research this company/brand and find all their social media profiles: "${query}"

Return ONLY a valid JSON object with this exact structure (no markdown, no explanation):
{
  "found": true,
  "companyName": "Exact brand name",
  "website": "domain.com or null",
  "description": "One sentence description or null",
  "profiles": [
    {
      "platform": "instagram",
      "handle": "@handle",
      "profileUrl": "https://instagram.com/handle",
      "estimatedFollowers": 1500000,
      "followersNote": "as of early 2024"
    }
  ]
}

Rules:
- platform must be one of: instagram, tiktok, youtube, linkedin, twitter, facebook
- Only include profiles you are confident exist for this brand
- estimatedFollowers: your best estimate as a number, or null if unknown
- followersNote: brief note about the estimate date/confidence, or null
- If the brand is not found or unknown, return { "found": false }
- For Facebook, use the page slug (e.g. "nike" for facebook.com/nike)`,
      }],
    })
  } catch (err) {
    console.error('[competitors/research POST] Anthropic error:', err)
    return NextResponse.json({ error: 'Error al investigar el competidor. Intenta de nuevo.' }, { status: 500 })
  }

  const raw = message.content[0].type === 'text' ? message.content[0].text.trim() : ''

  let aiResult: any
  try {
    // Strip potential markdown code fences
    const clean = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '')
    aiResult = JSON.parse(clean)
  } catch {
    return NextResponse.json({ error: 'No se pudo parsear la respuesta de IA', raw }, { status: 500 })
  }

  if (!aiResult.found) {
    return NextResponse.json({ found: false, query })
  }

  // Step 2 — Enrich Facebook page with real follower count via Graph API
  const profiles = aiResult.profiles ?? []
  const enriched = await Promise.all(
    profiles.map(async (p: any) => {
      if (p.platform === 'facebook' || p.platform === 'instagram') {
        // Extract slug from handle or URL
        const slug = (p.handle ?? '').replace('@', '') ||
          (p.profileUrl ?? '').split('/').filter(Boolean).pop() || ''

        if (slug) {
          const fbData = await fetchFacebookPage(slug)
          if (fbData) {
            return {
              ...p,
              realFollowers: fbData.followers ?? fbData.fans,
              realFans:      fbData.fans,
              dataSource:    'facebook_graph_api',
            }
          }
        }
      }
      return p
    })
  )

  return NextResponse.json({
    found:       true,
    companyName: aiResult.companyName,
    website:     aiResult.website    ?? null,
    description: aiResult.description ?? null,
    profiles:    enriched,
  })
}
