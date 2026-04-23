import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import Anthropic from '@anthropic-ai/sdk'
import { getPlan } from '@/lib/plans'
import { getApiSession } from '@/lib/session'
import { rateLimit, rateLimitKey } from '@/lib/rate-limit'

const FORMAT_SPECS: Record<string, string> = {
  instagram_caption:  'Instagram caption with emojis, 3-5 relevant hashtags, and a question CTA at the end (max 2200 chars, ideal 150-300)',
  tiktok_hook:        'TikTok hook — the first 3 seconds of spoken/written text that stops the scroll. Max 50 words. Must be punchy and curiosity-driven.',
  linkedin_post:      'LinkedIn post with professional tone, personal insight, 3-5 paragraphs, ends with a thought-provoking question (max 3000 chars)',
  twitter_thread:     'Twitter/X thread of 4-6 tweets numbered 1/, 2/, etc. First tweet is the hook. Last tweet summarizes or has a CTA.',
  youtube_desc:       'YouTube description with keyword-rich first paragraph (for SEO), bullet-point breakdown of content, timestamps placeholder, and subscribe CTA',
  email_newsletter:   'Email newsletter section: subject line, preview text, and body (intro paragraph + 3 key points + CTA button label)',
  blog_outline:       'Blog post outline with: SEO title, meta description (155 chars), H2 and H3 headings with brief notes under each, and a conclusion hook',
  stories_script:     'Instagram/TikTok Stories script: 4-6 slides/scenes with text overlay (max 8 words each) and brief visual direction per slide',
}

function buildRepurposePrompt(
  sourceType: string,
  sourceContent: string,
  formatIds: string[],
): string {
  const sourceLabel =
    sourceType === 'video_script'  ? 'video script / guión'   :
    sourceType === 'blog_post'     ? 'blog article'             :
    sourceType === 'podcast'       ? 'podcast transcript'       : 'social media post'

  const formatInstructions = formatIds
    .map(id => `=== FORMAT: ${id} ===\n${FORMAT_SPECS[id] ?? id}`)
    .join('\n\n')

  return `You are an expert content repurposing specialist fluent in Spanish and English. Repurpose the source content below for each format.

SOURCE TYPE: ${sourceLabel}
SOURCE CONTENT:
"""
${sourceContent}
"""

INSTRUCTIONS:
- Adapt the content for each format below, NOT just translate/copy it
- Use the native tone and conventions of each platform
- Keep the core message and key points from the source
- Respond in the SAME LANGUAGE as the source content
- Use EXACTLY the delimiter line shown before each format — do not add anything before the first delimiter

${formatInstructions}

Now write the repurposed content for each format, starting directly with the first === FORMAT: === delimiter:`
}

function parseFormats(raw: string, formatIds: string[]): { formatId: string; content: string }[] {
  const results: { formatId: string; content: string }[] = []

  for (let i = 0; i < formatIds.length; i++) {
    const id      = formatIds[i]
    const marker  = `=== FORMAT: ${id} ===`
    const start   = raw.indexOf(marker)
    if (start === -1) continue

    const contentStart = start + marker.length

    // Find next marker
    let end = raw.length
    for (let j = i + 1; j < formatIds.length; j++) {
      const nextMarker = `=== FORMAT: ${formatIds[j]} ===`
      const nextPos    = raw.indexOf(nextMarker, contentStart)
      if (nextPos !== -1 && nextPos < end) { end = nextPos; break }
    }

    const content = raw.slice(contentStart, end).trim()
    if (content) results.push({ formatId: id, content })
  }

  return results
}

export async function POST(req: NextRequest) {
  const sessionUser = await getApiSession()
  if (!sessionUser) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { ok, retryAfter } = await rateLimit(rateLimitKey(req, sessionUser.id), { limit: 10, window: 60 })
  if (!ok) {
    return NextResponse.json(
      { error: `Demasiadas solicitudes. Intenta de nuevo en ${retryAfter}s.` },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } }
    )
  }

  const { sourceContent, sourceType, selectedFormats } = await req.json()

  if (!sourceContent?.trim())    return NextResponse.json({ error: 'sourceContent requerido' }, { status: 400 })
  if (!selectedFormats?.length)  return NextResponse.json({ error: 'selectedFormats requerido' }, { status: 400 })

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'ANTHROPIC_API_KEY no configurada' }, { status: 503 })

  // Plan limit check
  const user = await prisma.user.findUnique({ where: { id: sessionUser.id } })
  if (user) {
    const plan  = getPlan(user.plan)
    const limit = plan.limits.aiGenerationsPerMonth
    if (limit !== Infinity && user.aiUsageThisMonth >= limit) {
      return NextResponse.json({
        error: `Límite de ${limit} generaciones alcanzado. Actualiza tu plan en /pricing.`,
        limitReached: true,
        plan: user.plan,
      }, { status: 429 })
    }
  }

  const client = new Anthropic({ apiKey })
  const prompt = buildRepurposePrompt(sourceType ?? 'video_script', sourceContent, selectedFormats)

  let message: Awaited<ReturnType<typeof client.messages.create>>
  try {
    message = await client.messages.create({
      model:      'claude-sonnet-4-6',
      max_tokens: 2500,
      messages:   [{ role: 'user', content: prompt }],
    })
  } catch (err: any) {
    console.error('[repurpose POST] Anthropic error:', err)
    return NextResponse.json({ error: 'Error al generar contenido. Intenta de nuevo.' }, { status: 500 })
  }

  const raw     = message.content[0].type === 'text' ? message.content[0].text : ''
  const results = parseFormats(raw, selectedFormats)

  // Track AI usage (non-blocking)
  if (user) {
    const now        = new Date()
    const needsReset = !user.aiUsageResetAt ||
      user.aiUsageResetAt.getMonth()    !== now.getMonth() ||
      user.aiUsageResetAt.getFullYear() !== now.getFullYear()

    prisma.$transaction([
      prisma.aiUsage.create({
        data: {
          userId:   user.id,
          type:     'repurpose',
          prompt:   sourceContent.slice(0, 500),
          result:   raw.slice(0, 1000),
          platform: selectedFormats.join(','),
        },
      }),
      prisma.user.update({
        where: { id: user.id },
        data:  {
          aiUsageThisMonth: needsReset ? 1 : { increment: 1 },
          aiUsageResetAt:   needsReset ? now : undefined,
        },
      }),
    ]).catch(() => {})
  }

  return NextResponse.json({ results, raw })
}
