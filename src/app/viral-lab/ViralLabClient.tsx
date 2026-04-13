'use client'

import { useState } from 'react'
import {
  Flame, Zap, TrendingUp, Clock, Heart, Share2, Eye, MessageCircle,
  Sparkles, CheckCircle2, XCircle, AlertCircle, ChevronRight,
  BarChart2, RefreshCw, Copy, Check
} from 'lucide-react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Progress from '@/components/ui/Progress'
import Badge from '@/components/ui/Badge'
import { cn } from '@/lib/utils'

// ---- Viral Score Engine (client-side) ----
interface ViralFactors {
  hookPower: number      // 0-25: Does the first line/frame grab attention?
  formatFit: number      // 0-20: Is this the right format for the platform?
  emotionFactor: number  // 0-20: Does it trigger an emotion (laugh, awe, anger)?
  shareability: number   // 0-20: Will people want to share/save this?
  trendAlignment: number // 0-15: Is it aligned with current trends?
}

function calculateViralScore(factors: ViralFactors) {
  return Math.round(
    factors.hookPower + factors.formatFit + factors.emotionFactor +
    factors.shareability + factors.trendAlignment
  )
}

function getScoreZone(score: number) {
  if (score >= 80) return { label: 'VIRAL POTENCIAL', color: 'text-orange-400', bg: 'bg-orange-400/10 border-orange-400/20', emoji: '🔥' }
  if (score >= 65) return { label: 'ALTO POTENCIAL', color: 'text-emerald-400', bg: 'bg-emerald-400/10 border-emerald-400/20', emoji: '🚀' }
  if (score >= 45) return { label: 'POTENCIAL MEDIO', color: 'text-amber-400', bg: 'bg-amber-400/10 border-amber-400/20', emoji: '📈' }
  return { label: 'NECESITA MEJORAS', color: 'text-red-400', bg: 'bg-red-400/10 border-red-400/20', emoji: '💡' }
}

const PLATFORM_FORMATS: Record<string, { format: string; icon: string; tip: string; bestTime: string }[]> = {
  instagram: [
    { format: 'Reel (7-15s)', icon: '🎬', tip: 'Mayor alcance orgánico. Hook en primer segundo.', bestTime: 'Mar-Jue 6-9am / 12-2pm' },
    { format: 'Carrusel educativo', icon: '📊', tip: 'Alta tasa de guardado. Ideal para consejos.', bestTime: 'Lun-Mié 9-11am' },
    { format: 'Post con texto', icon: '📝', tip: 'Bajo alcance pero engagement alto de comunidad.', bestTime: 'Lun-Vie 6-9pm' },
    { format: 'Story con encuesta', icon: '📊', tip: 'Máximo engagement. Conecta directamente con audiencia.', bestTime: 'Cualquier día 7-9pm' },
  ],
  tiktok: [
    { format: 'Video 15-30s', icon: '⚡', tip: 'El sweet spot de TikTok. Hook inmediato.', bestTime: 'Mar-Vie 7-9am / 7-9pm' },
    { format: 'Duet/Stitch', icon: '🔗', tip: 'Aprovecha el alcance de otros creadores.', bestTime: 'Según el video original' },
    { format: 'Tutorial rápido', icon: '🎓', tip: '"¿Cómo se hace?" tiene alta retención.', bestTime: 'Mié-Vie 9-11am' },
    { format: 'POV/Story', icon: '🎭', tip: 'Alta conexión emocional. Muy compartible.', bestTime: 'Vie-Dom 7-10pm' },
  ],
  youtube: [
    { format: 'Short (< 60s)', icon: '⚡', tip: 'Compite con Reels. Thumbnail + hook clave.', bestTime: 'Jue-Sáb 2-4pm' },
    { format: 'Tutorial (8-15 min)', icon: '🎓', tip: 'Alto tiempo de visualización. Mejor para SEO.', bestTime: 'Mar-Jue 2-4pm' },
    { format: 'Review/Unboxing', icon: '📦', tip: 'Alta intención de búsqueda. Buen CTR.', bestTime: 'Vie-Dom 12-3pm' },
    { format: 'Vlog/Day-in-life', icon: '📱', tip: 'Alta retención de comunidad establecida.', bestTime: 'Sáb-Dom 10am-1pm' },
  ],
  linkedin: [
    { format: 'Carrusel PDF', icon: '📋', tip: 'El formato #1 en LinkedIn. Muy compartible.', bestTime: 'Mar-Jue 8-10am' },
    { format: 'Post de texto largo', icon: '📝', tip: '"¿Unpopular opinion?" + historia personal.', bestTime: 'Lun-Mié 7-9am' },
    { format: 'Video nativo', icon: '🎬', tip: 'Muy pocos lo hacen = ventaja competitiva.', bestTime: 'Mar-Jue 7-9am' },
    { format: 'Encuesta', icon: '📊', tip: 'Máximo engagement fácil. Debate generado.', bestTime: 'Lun-Mié 9-11am' },
  ],
}

const VIRAL_HOOKS = {
  curiosity: [
    'La razón por la que el 99% no logra X (y cómo tú sí puedes)',
    'Nadie te dice esto sobre X...',
    'Lo que aprendí después de X fracasos en Y',
    'El método que cambió todo para mí (y lo puedes copiar)',
  ],
  controversy: [
    'Opinión impopular: X no funciona y aquí está la prueba',
    'Por qué estás haciendo X completamente mal',
    'El consejo de X que destruyó mi [negocio/relación/salud]',
    'Contrario a lo que todos dicen sobre X...',
  ],
  value: [
    '5 errores que cometen los principiantes en X (y cómo evitarlos)',
    'Hice X por 30 días. Esto es lo que pasó:',
    'La guía definitiva de X en [tiempo] segundos',
    'Paso a paso: cómo logré X sin [obstáculo común]',
  ],
  emotion: [
    'Hace [tiempo] estaba en tu lugar. Hoy X.',
    'Si estás luchando con X, esto es para ti',
    'La historia que nadie quiere contar sobre X',
    'Esto me tomó X años aprender. A ti te llevará 2 minutos',
  ],
}

interface ScoreResult {
  total: number
  factors: ViralFactors
  suggestions: string[]
  platform: string
  format: string
  hook: string
}

export default function ViralLabClient() {
  const [platform, setPlatform] = useState('instagram')
  const [format, setFormat] = useState('')
  const [hook, setHook] = useState('')
  const [emotion, setEmotion] = useState('')
  const [trending, setTrending] = useState('')
  const [shareReason, setShareReason] = useState('')
  const [result, setResult] = useState<ScoreResult | null>(null)
  const [aiTips, setAiTips] = useState('')
  const [loadingAI, setLoadingAI] = useState(false)
  const [activeHookCategory, setActiveHookCategory] = useState<keyof typeof VIRAL_HOOKS>('curiosity')
  const [copiedHook, setCopiedHook] = useState<string | null>(null)

  const copyHook = (h: string) => {
    setHook(h)
    setCopiedHook(h)
    setTimeout(() => setCopiedHook(null), 1500)
  }

  const analyzeViral = () => {
    // Scoring algorithm
    const hookLen = hook.trim().length
    const hookScore = hookLen === 0 ? 0 :
      hookLen < 20 ? 8 :
      hook.includes('?') || hook.includes('...') || hook.match(/\d+/) ? 22 :
      hook.toLowerCase().match(/nadie|secreto|error|razón|descubrí|lo que|nunca|siempre|por qué/) ? 25 : 16

    const formatScore = format ? 18 : 8

    const emotionKeywords = emotion.toLowerCase().match(/alegría|risa|sorpresa|miedo|tristeza|ira|motivación|inspiración|nostalgia|amor|humor/g)
    const emotionScore = !emotion ? 5 :
      (emotionKeywords?.length || 0) >= 2 ? 20 :
      (emotionKeywords?.length || 0) === 1 ? 15 : 10

    const shareScore = !shareReason ? 5 :
      shareReason.toLowerCase().match(/útil|aprende|información|consejo|tip|guía|recurso/) ? 20 :
      shareReason.toLowerCase().match(/risa|gracioso|meme|divertido/) ? 18 :
      shareReason.toLowerCase().match(/identifica|me pasa|esto es yo|relatable/) ? 17 : 12

    const trendScore = !trending ? 5 :
      trending.toLowerCase().match(/tendencia|viral|trending|trend/) ? 15 :
      trending.length > 10 ? 10 : 7

    const factors: ViralFactors = {
      hookPower: hookScore,
      formatFit: formatScore,
      emotionFactor: emotionScore,
      shareability: shareScore,
      trendAlignment: trendScore,
    }

    const total = calculateViralScore(factors)

    // Generate suggestions
    const suggestions: string[] = []
    if (hookScore < 20) suggestions.push('Mejora tu hook: usa números, preguntas o genera curiosidad en las primeras palabras')
    if (formatScore < 15) suggestions.push('Selecciona el formato óptimo para maximizar el alcance en tu plataforma')
    if (emotionScore < 15) suggestions.push('Conecta con una emoción fuerte: humor, sorpresa, inspiración o nostalgia funcionan mejor')
    if (shareScore < 15) suggestions.push('Define claramente por qué alguien compartiría esto: ¿es útil, divertido o relatable?')
    if (trendScore < 10) suggestions.push('Alinea tu contenido con tendencias actuales del nicho para mayor distribución')
    if (total >= 80) suggestions.unshift('¡Excelente! Tu contenido tiene alto potencial viral. Publica en el horario óptimo')

    setResult({ total, factors, suggestions, platform, format, hook })
  }

  const getAITips = async () => {
    setLoadingAI(true)
    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'viral_tips',
          fields: {
            topic: `Hook: "${hook}". Plataforma: ${platform}. Formato: ${format}. Emoción: ${emotion}. Razón de compartir: ${shareReason}. Score actual: ${result?.total}/100`,
            platform,
          },
          userId: 'demo',
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setAiTips(data.result)
      }
    } finally {
      setLoadingAI(false)
    }
  }

  const zone = result ? getScoreZone(result.total) : null
  const platformFormats = PLATFORM_FORMATS[platform] || []

  return (
    <div className="space-y-6">
      {/* Header banner */}
      <div className="relative overflow-hidden rounded-2xl border border-orange-500/20 bg-gradient-to-r from-orange-950/40 to-red-950/40 p-6">
        <div className="absolute right-0 top-0 w-64 h-full opacity-10">
          <Flame size={200} className="text-orange-400 absolute -right-8 -top-8" />
        </div>
        <div className="relative">
          <div className="flex items-center gap-2 mb-2">
            <Flame size={20} className="text-orange-400" />
            <span className="text-orange-400 text-sm font-bold uppercase tracking-wider">Viral Lab</span>
          </div>
          <h2 className="text-xl font-bold text-white mb-1">¿Tu contenido tiene potencial viral?</h2>
          <p className="text-sm text-gray-400 max-w-xl">
            Analiza tu idea antes de publicar. Nuestro algoritmo evalúa 5 factores clave que determinan si algo se vuelve viral en redes sociales.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Input Form */}
        <div className="lg:col-span-3 space-y-4">
          {/* Platform selector */}
          <Card>
            <h3 className="text-sm font-semibold text-white mb-3">1. ¿En qué plataforma vas a publicar?</h3>
            <div className="grid grid-cols-4 gap-2">
              {[
                { id: 'instagram', label: 'Instagram', emoji: '📸' },
                { id: 'tiktok', label: 'TikTok', emoji: '🎵' },
                { id: 'youtube', label: 'YouTube', emoji: '▶️' },
                { id: 'linkedin', label: 'LinkedIn', emoji: '💼' },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => { setPlatform(p.id); setFormat('') }}
                  className={cn(
                    'flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all',
                    platform === p.id
                      ? 'border-violet-500/50 bg-violet-600/10 text-white'
                      : 'border-[#1e1e35] bg-[#0f0f1a] text-gray-500 hover:border-[#2a2a4a] hover:text-gray-300'
                  )}
                >
                  <span className="text-xl">{p.emoji}</span>
                  <span className="text-xs font-medium">{p.label}</span>
                </button>
              ))}
            </div>
          </Card>

          {/* Format */}
          <Card>
            <h3 className="text-sm font-semibold text-white mb-3">2. Formato de contenido</h3>
            <div className="grid grid-cols-2 gap-2">
              {platformFormats.map((f) => (
                <button
                  key={f.format}
                  onClick={() => setFormat(f.format)}
                  className={cn(
                    'flex items-start gap-2 p-3 rounded-lg border text-left transition-all',
                    format === f.format
                      ? 'border-violet-500/50 bg-violet-600/10'
                      : 'border-[#1e1e35] bg-[#0f0f1a] hover:border-[#2a2a4a]'
                  )}
                >
                  <span className="text-lg flex-shrink-0 mt-0.5">{f.icon}</span>
                  <div>
                    <div className={cn('text-xs font-semibold', format === f.format ? 'text-violet-300' : 'text-gray-300')}>
                      {f.format}
                    </div>
                    <div className="text-[10px] text-gray-500 mt-0.5">{f.tip}</div>
                  </div>
                </button>
              ))}
            </div>
          </Card>

          {/* Hook */}
          <Card>
            <h3 className="text-sm font-semibold text-white mb-1">3. Tu Hook (las primeras palabras)</h3>
            <p className="text-xs text-gray-500 mb-3">El 80% del éxito depende del hook. Es lo primero que ve la gente.</p>
            <textarea
              value={hook}
              onChange={(e) => setHook(e.target.value)}
              placeholder="Escribe las primeras palabras de tu caption, video o post..."
              rows={2}
              className="w-full rounded-lg border border-[#1e1e35] bg-[#0f0f1a] px-3 py-2.5 text-sm text-white placeholder-gray-600 resize-none focus:border-violet-500/50 focus:outline-none mb-3"
            />

            {/* Hook score indicator */}
            {hook.length > 0 && (
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs text-gray-500">Fuerza del hook:</span>
                <div className="flex-1 h-1.5 bg-[#1e1e35] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-violet-600 to-orange-500 transition-all duration-500"
                    style={{ width: `${Math.min(100, (hook.length / 80) * 100 + (hook.match(/[?!]/) ? 20 : 0))}%` }}
                  />
                </div>
                <span className="text-xs text-violet-400 w-16 text-right">{hook.length} chars</span>
              </div>
            )}

            {/* Hook templates */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs text-gray-500 font-medium">Hooks probados:</span>
                <div className="flex gap-1">
                  {(['curiosity', 'controversy', 'value', 'emotion'] as const).map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setActiveHookCategory(cat)}
                      className={cn(
                        'text-[10px] px-2 py-0.5 rounded font-medium transition-all',
                        activeHookCategory === cat ? 'bg-violet-600/30 text-violet-300' : 'text-gray-600 hover:text-gray-400'
                      )}
                    >
                      {cat === 'curiosity' ? '🧠 Curiosidad' : cat === 'controversy' ? '💥 Controversia' : cat === 'value' ? '💎 Valor' : '❤️ Emoción'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1">
                {VIRAL_HOOKS[activeHookCategory].map((h) => (
                  <button
                    key={h}
                    onClick={() => copyHook(h)}
                    className="w-full text-left text-xs text-gray-400 hover:text-violet-300 px-2 py-1.5 rounded hover:bg-violet-600/5 transition-all flex items-center justify-between group"
                  >
                    <span className="flex-1">{h}</span>
                    {copiedHook === h
                      ? <Check size={12} className="text-emerald-400 ml-2" />
                      : <Copy size={11} className="text-gray-600 group-hover:text-violet-400 ml-2 opacity-0 group-hover:opacity-100" />
                    }
                  </button>
                ))}
              </div>
            </div>
          </Card>

          {/* Emotion + Shareability */}
          <Card>
            <h3 className="text-sm font-semibold text-white mb-3">4. Factores de amplificación</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-400 mb-1 block">
                  ¿Qué emoción principal activa? (ej: risa, sorpresa, inspiración, curiosidad)
                </label>
                <input
                  value={emotion}
                  onChange={(e) => setEmotion(e.target.value)}
                  placeholder="Describe la emoción que quieres generar..."
                  className="w-full rounded-lg border border-[#1e1e35] bg-[#0f0f1a] px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-violet-500/50 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-400 mb-1 block">
                  ¿Por qué alguien lo compartiría o guardaría?
                </label>
                <input
                  value={shareReason}
                  onChange={(e) => setShareReason(e.target.value)}
                  placeholder="Ej: Es útil para su trabajo, se siente identificado, es gracioso..."
                  className="w-full rounded-lg border border-[#1e1e35] bg-[#0f0f1a] px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-violet-500/50 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-400 mb-1 block">
                  ¿Está alineado con alguna tendencia actual?
                </label>
                <input
                  value={trending}
                  onChange={(e) => setTrending(e.target.value)}
                  placeholder="Ej: El trend de X, sound viral, desafío popular..."
                  className="w-full rounded-lg border border-[#1e1e35] bg-[#0f0f1a] px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-violet-500/50 focus:outline-none"
                />
              </div>
            </div>
          </Card>

          <Button onClick={analyzeViral} icon={<Zap size={16} />} size="lg" className="w-full">
            Analizar Potencial Viral
          </Button>
        </div>

        {/* Score + Results */}
        <div className="lg:col-span-2 space-y-4">
          {result ? (
            <>
              {/* Score card */}
              <Card className={cn('border', zone?.bg)}>
                <div className="text-center">
                  <div className="relative inline-flex items-center justify-center mb-3">
                    <svg width="120" height="120" className="-rotate-90">
                      <circle cx="60" cy="60" r="50" fill="none" stroke="#1e1e35" strokeWidth="8" />
                      <circle
                        cx="60" cy="60" r="50"
                        fill="none"
                        stroke={result.total >= 80 ? '#f97316' : result.total >= 65 ? '#10b981' : result.total >= 45 ? '#f59e0b' : '#ef4444'}
                        strokeWidth="8"
                        strokeDasharray={`${2 * Math.PI * 50}`}
                        strokeDashoffset={`${2 * Math.PI * 50 * (1 - result.total / 100)}`}
                        strokeLinecap="round"
                        className="transition-all duration-1000"
                      />
                    </svg>
                    <div className="absolute text-center">
                      <div className={cn('text-3xl font-black', zone?.color)}>{result.total}</div>
                      <div className="text-xs text-gray-500">/100</div>
                    </div>
                  </div>
                  <div className={cn('text-sm font-bold mb-1', zone?.color)}>
                    {zone?.emoji} {zone?.label}
                  </div>
                  <p className="text-xs text-gray-500">Viral Score en {platform}</p>
                </div>

                {/* Factor breakdown */}
                <div className="mt-4 space-y-2.5 border-t border-[#1e1e35] pt-4">
                  {[
                    { label: 'Hook Power', value: result.factors.hookPower, max: 25, icon: Zap },
                    { label: 'Formato', value: result.factors.formatFit, max: 20, icon: BarChart2 },
                    { label: 'Emoción', value: result.factors.emotionFactor, max: 20, icon: Heart },
                    { label: 'Shareability', value: result.factors.shareability, max: 20, icon: Share2 },
                    { label: 'Tendencia', value: result.factors.trendAlignment, max: 15, icon: TrendingUp },
                  ].map((f) => (
                    <div key={f.label}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5 text-xs text-gray-400">
                          <f.icon size={11} />
                          {f.label}
                        </div>
                        <span className="text-xs font-bold text-white">{f.value}/{f.max}</span>
                      </div>
                      <Progress value={(f.value / f.max) * 100} size="xs" />
                    </div>
                  ))}
                </div>
              </Card>

              {/* Suggestions */}
              <Card>
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  Recomendaciones
                </h4>
                <div className="space-y-2">
                  {result.suggestions.map((s, i) => (
                    <div key={i} className="flex items-start gap-2">
                      {i === 0 && result.total >= 80
                        ? <CheckCircle2 size={14} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                        : <AlertCircle size={14} className="text-amber-400 mt-0.5 flex-shrink-0" />
                      }
                      <p className="text-xs text-gray-400 leading-relaxed">{s}</p>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Best time */}
              {format && (
                <Card>
                  <div className="flex items-center gap-2 mb-3">
                    <Clock size={14} className="text-violet-400" />
                    <h4 className="text-xs font-semibold text-white">Horario óptimo</h4>
                  </div>
                  {platformFormats.find(f => f.format === format) && (
                    <div className="text-sm text-emerald-400 font-medium">
                      {platformFormats.find(f => f.format === format)?.bestTime}
                    </div>
                  )}
                </Card>
              )}

              {/* AI tips button */}
              <Button
                onClick={getAITips}
                loading={loadingAI}
                variant="outline"
                className="w-full"
                icon={<Sparkles size={14} />}
              >
                Obtener tips de Claude AI
              </Button>

              {aiTips && (
                <Card className="border-violet-500/20 bg-violet-950/20">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles size={14} className="text-violet-400" />
                    <h4 className="text-xs font-semibold text-violet-300">Tips de IA</h4>
                  </div>
                  <pre className="text-xs text-gray-300 whitespace-pre-wrap leading-relaxed font-sans">{aiTips}</pre>
                </Card>
              )}
            </>
          ) : (
            /* Empty state with viral elements guide */
            <div className="space-y-4">
              <Card>
                <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                  <TrendingUp size={15} className="text-violet-400" />
                  Los 5 elementos del contenido viral
                </h4>
                <div className="space-y-3">
                  {[
                    { icon: Zap, color: 'text-yellow-400', title: 'Hook irresistible', desc: 'Las primeras palabras deciden si siguen viendo o scrollean. Tienes 1-3 segundos.' },
                    { icon: Heart, color: 'text-pink-400', title: 'Emoción fuerte', desc: 'Viral = emoción. Las personas comparten lo que las hace sentir algo intenso.' },
                    { icon: Share2, color: 'text-cyan-400', title: 'Factor compartible', desc: '"Tengo que enviárselo a alguien" - útil, divertido o identidad propia.' },
                    { icon: Eye, color: 'text-emerald-400', title: 'Retención visual', desc: 'El algoritmo mide cuánto tiempo miran. El ritmo y edición son clave.' },
                    { icon: TrendingUp, color: 'text-orange-400', title: 'Timing de tendencias', desc: 'Montarse en una tendencia al inicio = distribución gratuita del algoritmo.' },
                  ].map((el) => (
                    <div key={el.title} className="flex items-start gap-3">
                      <div className={cn('w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0', el.color)}>
                        <el.icon size={13} />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-gray-300">{el.title}</div>
                        <div className="text-[11px] text-gray-600 mt-0.5">{el.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              <Card>
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  Fórmulas que funcionan
                </h4>
                {[
                  { formula: 'Problema + Solución inesperada', example: '"¿Tu contenido no crece? Esto lo cambió todo"' },
                  { formula: 'Número + Beneficio + Tiempo', example: '"5 errores que destruyen tu engagement (en 60s)"' },
                  { formula: 'Contrario al sentido común', example: '"Por qué publicar menos te da más seguidores"' },
                  { formula: 'Historia de transformación', example: '"De 200 a 50K en 90 días (sin pagar ads)"' },
                ].map((f) => (
                  <div key={f.formula} className="flex items-start gap-2 mb-2.5">
                    <ChevronRight size={12} className="text-violet-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="text-xs text-gray-300 font-medium">{f.formula}</div>
                      <div className="text-[11px] text-gray-600 italic mt-0.5">{f.example}</div>
                    </div>
                  </div>
                ))}
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
