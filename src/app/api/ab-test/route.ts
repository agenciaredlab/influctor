import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import Anthropic from '@anthropic-ai/sdk'
import { getPlan } from '@/lib/plans'
import { getApiSession } from '@/lib/session'
import { rateLimit, rateLimitKey } from '@/lib/rate-limit'

const SCORE_LABELS = ['Claridad', 'Hook', 'CTA', 'Engagement', 'Longitud']

const SCORE_DESCRIPTIONS = {
  Claridad:   'qué tan claro y fácil de entender es el mensaje',
  Hook:       'qué tan atractivo es el gancho de la primera línea',
  CTA:        'qué tan efectivo y claro es el llamado a la acción',
  Engagement: 'potencial de generar likes, comentarios y compartidos',
  Longitud:   'si la extensión del texto es óptima para la plataforma',
}

function buildScoreDimensions() {
  return SCORE_LABELS.map(l => `- ${l} (1–100): ${SCORE_DESCRIPTIONS[l as keyof typeof SCORE_DESCRIPTIONS]}`).join('\n')
}

export async function POST(req: NextRequest) {
  const sessionUser = await getApiSession()
  if (!sessionUser) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { ok, retryAfter } = await rateLimit(rateLimitKey(req, sessionUser.id), { limit: 10, window: 60 })
  if (!ok) {
    return NextResponse.json(
      { error: `Demasiadas solicitudes. Intenta de nuevo en ${retryAfter} segundos.` },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } }
    )
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'ANTHROPIC_API_KEY no configurada' }, { status: 503 })

  // Check plan limits
  const user = await prisma.user.findUnique({ where: { id: sessionUser.id } })
  if (user) {
    const plan = getPlan(user.plan)
    const limit = plan.limits.aiGenerationsPerMonth
    if (limit !== Infinity && user.aiUsageThisMonth >= limit) {
      return NextResponse.json({
        error: `Alcanzaste el límite de ${limit} generaciones del plan ${plan.name}.`,
        limitReached: true,
        plan: user.plan,
      }, { status: 429 })
    }
  }

  const body = await req.json()
  const { mode, topic, toneA, toneB, platform, captionA, captionB } = body

  let prompt: string

  if (mode === 'generate') {
    if (!topic?.trim()) return NextResponse.json({ error: 'topic requerido' }, { status: 400 })

    prompt = `Eres experto en marketing digital y copywriting. Genera dos versiones de caption para ${platform || 'redes sociales'} sobre el siguiente tema:

"${topic}"

TONO VERSIÓN A: ${toneA || 'casual'}
TONO VERSIÓN B: ${toneB || 'urgency'}

Cada caption debe tener emojis, hashtags relevantes y un CTA claro. Después, evalúa cada versión en estas dimensiones:

${buildScoreDimensions()}

Devuelve ÚNICAMENTE un objeto JSON válido sin markdown ni texto adicional:
{
  "captionA": {
    "text": "caption completo con emojis y hashtags",
    "scores": { "Claridad": 85, "Hook": 72, "CTA": 80, "Engagement": 77, "Longitud": 70 }
  },
  "captionB": {
    "text": "caption completo con emojis y hashtags",
    "scores": { "Claridad": 90, "Hook": 88, "CTA": 85, "Engagement": 92, "Longitud": 80 }
  },
  "winner": "B",
  "analysis": "Análisis comparativo de 2-3 oraciones explicando por qué una versión supera a la otra y qué aspectos concretos marcan la diferencia."
}`
  } else {
    // analyze mode — score two existing captions
    if (!captionA?.trim() || !captionB?.trim()) {
      return NextResponse.json({ error: 'captionA y captionB son requeridos' }, { status: 400 })
    }

    prompt = `Eres experto en marketing digital y copywriting. Analiza y puntúa estos dos captions para ${platform || 'redes sociales'}:

CAPTION A:
${captionA}

CAPTION B:
${captionB}

Evalúa cada uno en estas dimensiones:

${buildScoreDimensions()}

Devuelve ÚNICAMENTE un objeto JSON válido sin markdown ni texto adicional:
{
  "captionA": {
    "scores": { "Claridad": 85, "Hook": 72, "CTA": 80, "Engagement": 77, "Longitud": 70 }
  },
  "captionB": {
    "scores": { "Claridad": 90, "Hook": 88, "CTA": 85, "Engagement": 92, "Longitud": 80 }
  },
  "winner": "B",
  "analysis": "Análisis comparativo de 2-3 oraciones explicando las diferencias clave y por qué una versión es más efectiva."
}`
  }

  try {
    const client = new Anthropic({ apiKey })
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    })

    const raw = message.content[0].type === 'text' ? message.content[0].text.trim() : ''
    const clean = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '')

    let parsed: any
    try {
      parsed = JSON.parse(clean)
    } catch {
      return NextResponse.json({ error: 'No se pudo parsear la respuesta de IA', raw }, { status: 500 })
    }

    // Track AI usage
    try {
      if (user) {
        const now = new Date()
        const resetAt = user.aiUsageResetAt
        const needsReset = !resetAt || resetAt.getMonth() !== now.getMonth() || resetAt.getFullYear() !== now.getFullYear()
        await prisma.$transaction([
          prisma.aiUsage.create({
            data: {
              userId: user.id,
              type: 'ab_test',
              prompt: topic || captionA?.slice(0, 100) || 'ab_test',
              result: raw,
              platform: platform || null,
            },
          }),
          prisma.user.update({
            where: { id: user.id },
            data: {
              aiUsageThisMonth: needsReset ? 1 : { increment: 1 },
              aiUsageResetAt: needsReset ? now : undefined,
            },
          }),
        ])
      }
    } catch { /* non-blocking */ }

    return NextResponse.json(parsed)
  } catch (err: any) {
    console.error('[ab-test POST]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
