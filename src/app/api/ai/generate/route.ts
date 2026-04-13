import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import Anthropic from '@anthropic-ai/sdk'

const SYSTEM_PROMPT = `Eres un experto en marketing digital, redes sociales y creación de contenido.
Tienes más de 10 años de experiencia ayudando a creadores de contenido a crecer en Instagram, TikTok, YouTube, LinkedIn y Twitter.
Respondes SIEMPRE en español, de forma concisa, práctica y accionable.
Tus respuestas son directas, sin introducciones largas ni disclaimers innecesarios.
Cuando generes listas, usa formato claro y legible.`

function buildPrompt(type: string, fields: Record<string, string>): string {
  const { topic, platform, tone, length, strategy, goal, count } = fields

  const platformStr = platform ? `para ${platform.charAt(0).toUpperCase() + platform.slice(1)}` : ''

  const prompts: Record<string, string> = {
    caption: `Genera un caption ${platformStr} ${tone ? `con tono ${tone}` : ''} ${length ? `de longitud ${length}` : ''} para este contenido:

"${topic}"

El caption debe:
- Ser engaging y llamar a la acción
- Incluir emojis relevantes
- Terminar con una pregunta o CTA
- ${platform === 'instagram' ? 'Incluir un espacio antes de los hashtags' : ''}
${length === 'long' ? '- Contar una historia personal o anécdota relacionada' : ''}

Genera 3 opciones numeradas.`,

    hashtags: `Genera los mejores hashtags ${platformStr} para este contenido:

"${topic}"

Estrategia: ${strategy || 'balanceada'}

Incluye:
- 5 hashtags de alta competencia (millones de posts)
- 8 hashtags de competencia media (100K-1M posts)
- 7 hashtags de nicho (bajo volumen, alta relevancia)
- Hashtags en español e inglés si aplica

Formato: organiza por categoría, listo para copiar y pegar.`,

    bio: `Crea una bio optimizada ${platformStr} para:

"${topic}"

Objetivo: ${goal || 'ganar seguidores'}

Incluye:
- Propuesta de valor clara en la primera línea
- Palabras clave relevantes para el nicho
- CTA específico con link o acción
- Emojis estratégicos
- ${platform === 'instagram' || platform === 'tiktok' ? 'Máximo 150 caracteres' : platform === 'twitter' ? 'Máximo 160 caracteres' : 'Versión completa profesional'}

Genera 2 versiones: una más casual y otra más profesional.`,

    content_ideas: `Genera ${count || '10'} ideas de contenido ${platformStr} para este nicho:

"${topic}"

Para cada idea incluye:
- Título/hook atractivo
- Formato sugerido (Reel, carrusel, story, post, etc.)
- Ángulo diferenciador
- Potencial de engagement (🔥 alto, ✨ medio, 💡 educativo)

Enfócate en contenido que sea:
- Viral y compartible
- Educativo y de valor
- Relatable para la audiencia objetivo`,

    strategy: `Crea un plan de crecimiento personalizado basado en esta situación:

"${topic}"

Plataforma principal: ${platform || 'instagram'}
Objetivo: ${goal || 'crecer seguidores'}

Incluye:
1. Diagnóstico rápido (fortalezas y áreas de mejora)
2. Estrategia de contenido (frecuencia, formatos, temáticas)
3. Plan de engagement (cómo interactuar con la comunidad)
4. 5 acciones inmediatas (próximos 7 días)
5. Métricas clave a monitorear
6. Timeline estimado para alcanzar objetivos

Sé específico y accionable, no genérico.`,

    analysis: `Analiza este nicho y situación competitiva ${platformStr}:

"${topic}"

Proporciona:
1. Panorama del nicho (saturación, oportunidades)
2. Análisis de lo que funciona en la competencia
3. Gaps de contenido no cubiertos (oportunidades)
4. Estrategia de diferenciación recomendada
5. Tipos de contenido menos explorados en el nicho
6. Nichos complementarios para expansión

Incluye ejemplos concretos y tendencias actuales.`,

    viral_tips: `Analiza este contenido y da 5 sugerencias concretas para maximizar su potencial viral:

${topic}

Para cada sugerencia:
- Qué cambiar específicamente
- Por qué aumenta el potencial viral
- Ejemplo concreto de cómo aplicarlo

Sé directo, práctico y específico para la plataforma ${platform || 'indicada'}.`,
  }

  return prompts[type] || `Ayúdame con esto: ${topic}`
}

export async function POST(req: NextRequest) {
  try {
    const { type, fields, userId } = await req.json()

    if (!fields?.topic?.trim()) {
      return NextResponse.json({ error: 'Topic is required' }, { status: 400 })
    }

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json({
        error: 'ANTHROPIC_API_KEY no configurada. Agrega tu API key en .env.local para usar esta función.',
      }, { status: 503 })
    }

    const client = new Anthropic({ apiKey })
    const prompt = buildPrompt(type, fields)

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
    })

    const result = message.content[0].type === 'text' ? message.content[0].text : ''

    // Save to AI usage history
    try {
      const user = await prisma.user.findFirst({ where: { email: 'demo@influctor.app' } })
      if (user) {
        await prisma.aiUsage.create({
          data: {
            userId: user.id,
            type,
            prompt: fields.topic,
            result,
            platform: fields.platform || null,
          },
        })
      }
    } catch (e) {
      // Non-blocking
    }

    return NextResponse.json({ result })
  } catch (error: any) {
    console.error('AI generation error:', error)
    if (error?.status === 401) {
      return NextResponse.json({ error: 'API key inválida. Verifica tu ANTHROPIC_API_KEY.' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Error al generar contenido con IA' }, { status: 500 })
  }
}
