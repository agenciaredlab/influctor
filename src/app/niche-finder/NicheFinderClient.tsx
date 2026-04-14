'use client'

import { useState } from 'react'
import { TrendingUp, Sparkles, RefreshCw, DollarSign, Users, Zap, Search, Star, AlertTriangle, CheckCircle, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

const HOT_NICHES = [
  { name: 'IA & Productividad', growth: '+340%', competition: 'media', monetization: 'alta', platforms: ['YouTube', 'LinkedIn', 'TikTok'], tags: ['tech', 'herramientas', 'futuro'], color: 'from-violet-500/20 to-purple-500/10', border: 'border-violet-500/30', score: 94 },
  { name: 'Finance Personal Latina', growth: '+210%', competition: 'baja-media', monetization: 'muy alta', platforms: ['TikTok', 'Instagram', 'YouTube'], tags: ['dinero', 'inversión', 'ahorro'], color: 'from-emerald-500/20 to-green-500/10', border: 'border-emerald-500/30', score: 91 },
  { name: 'Salud Mental Jóvenes', growth: '+180%', competition: 'media', monetization: 'media', platforms: ['TikTok', 'Instagram'], tags: ['bienestar', 'ansiedad', 'autoayuda'], color: 'from-pink-500/20 to-rose-500/10', border: 'border-pink-500/30', score: 87 },
  { name: 'Negocios Online Sin Oficina', growth: '+290%', competition: 'media-alta', monetization: 'alta', platforms: ['YouTube', 'TikTok', 'LinkedIn'], tags: ['freelance', 'emprendimiento', 'remoto'], color: 'from-amber-500/20 to-orange-500/10', border: 'border-amber-500/30', score: 89 },
  { name: 'Fitness en Casa 40+', growth: '+155%', competition: 'baja', monetization: 'alta', platforms: ['Instagram', 'YouTube', 'Facebook'], tags: ['fitness', 'salud', 'mayores'], color: 'from-blue-500/20 to-cyan-500/10', border: 'border-blue-500/30', score: 83 },
  { name: 'Eco-Living Millennial', growth: '+130%', competition: 'baja', monetization: 'media', platforms: ['Instagram', 'TikTok'], tags: ['sustentabilidad', 'eco', 'minimalismo'], color: 'from-lime-500/20 to-green-500/10', border: 'border-lime-500/30', score: 78 },
]

const COMPETITION_COLOR: Record<string, string> = {
  'baja': 'text-emerald-400 bg-emerald-500/10',
  'baja-media': 'text-lime-400 bg-lime-500/10',
  'media': 'text-amber-400 bg-amber-500/10',
  'media-alta': 'text-orange-400 bg-orange-500/10',
  'alta': 'text-red-400 bg-red-500/10',
}

const MONETIZATION_COLOR: Record<string, string> = {
  'muy alta': 'text-emerald-400',
  'alta': 'text-lime-400',
  'media': 'text-amber-400',
  'baja': 'text-red-400',
}

interface NicheResult {
  name: string
  description: string
  opportunities: string[]
  contentIdeas: string[]
  monetization: string[]
  risks: string[]
  score: number
}

export default function NicheFinderClient() {
  const [query, setQuery] = useState('')
  const [platform, setPlatform] = useState('instagram')
  const [interests, setInterests] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string>('')
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<typeof HOT_NICHES[0] | null>(null)

  async function analyze() {
    if (!query.trim()) return
    setLoading(true)
    setError('')
    setResult('')

    const prompt = `Analiza el potencial de nicho para: "${query}"
Plataforma principal: ${platform}
${interests ? `Intereses adicionales: ${interests}` : ''}

Proporciona un análisis completo del nicho con:
1. Potencial de crecimiento (1-10) con justificación
2. Nivel de competencia actual y tendencia
3. Top 5 sub-nichos específicos menos saturados
4. 8 ideas de contenido concretas que funcionan en este nicho
5. Formas de monetización (de mayor a menor potencial)
6. Audiencia objetivo específica
7. Marcas que pagan en este nicho
8. Riesgos o desafíos a considerar
9. Recomendación final: ¿vale la pena entrar? ¿Cómo diferenciarse?

Sé muy específico y práctico, no genérico.`

    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'analysis', fields: { topic: prompt, platform } }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al analizar')
      setResult(data.result)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="bg-[#13131f] border border-[#1a1a2e] rounded-xl p-5">
        <h3 className="font-semibold text-white text-sm mb-4 flex items-center gap-2">
          <Search size={14} className="text-violet-400" />
          Analizar un nicho
        </h3>
        <div className="flex gap-3">
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && analyze()}
            placeholder="ej: finanzas personales, meditación, gaming retro..."
            className="flex-1 px-4 py-2.5 bg-[#0d0d1a] border border-[#1a1a2e] rounded-lg text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-violet-500/50"
          />
          <select
            value={platform}
            onChange={e => setPlatform(e.target.value)}
            className="px-3 py-2.5 bg-[#0d0d1a] border border-[#1a1a2e] rounded-lg text-sm text-gray-200 focus:outline-none focus:border-violet-500/50"
          >
            {['instagram', 'tiktok', 'youtube', 'linkedin'].map(p => (
              <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
            ))}
          </select>
          <button
            onClick={analyze}
            disabled={loading || !query.trim()}
            className="px-5 py-2.5 bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2 whitespace-nowrap"
          >
            {loading ? <><RefreshCw size={13} className="animate-spin" /> Analizando...</> : <><Sparkles size={13} /> Analizar</>}
          </button>
        </div>
        {interests && (
          <input
            value={interests}
            onChange={e => setInterests(e.target.value)}
            placeholder="Habilidades o intereses tuyos (opcional)"
            className="mt-2 w-full px-4 py-2 bg-[#0d0d1a] border border-[#1a1a2e] rounded-lg text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-violet-500/50"
          />
        )}
        {!interests && (
          <button onClick={() => setInterests(' ')} className="mt-2 text-xs text-gray-500 hover:text-violet-400 transition-colors">
            + Agregar mis habilidades para mejor análisis
          </button>
        )}
      </div>

      {/* Result */}
      {(result || error) && (
        <div className={cn('rounded-xl border p-5', error ? 'bg-red-500/10 border-red-500/20' : 'bg-[#13131f] border-[#1a1a2e]')}>
          {error ? (
            <p className="text-red-400 text-sm">{error}</p>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-white text-sm flex items-center gap-2">
                  <TrendingUp size={13} className="text-emerald-400" />
                  Análisis: {query}
                </h3>
              </div>
              <div className="whitespace-pre-wrap text-sm text-gray-300 leading-relaxed">{result}</div>
            </>
          )}
        </div>
      )}

      {/* Hot niches */}
      {!result && !loading && (
        <>
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-white text-base flex items-center gap-2">
              <TrendingUp size={16} className="text-emerald-400" />
              Nichos en tendencia ahora
            </h2>
            <span className="text-xs text-gray-500">Actualizado abril 2024</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {HOT_NICHES.map(niche => (
              <div
                key={niche.name}
                onClick={() => setSelected(selected?.name === niche.name ? null : niche)}
                className={cn(
                  'bg-gradient-to-br rounded-xl border p-4 cursor-pointer transition-all hover:scale-[1.01]',
                  niche.color, niche.border,
                  selected?.name === niche.name ? 'ring-1 ring-violet-500/40' : ''
                )}
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-bold text-white text-sm leading-tight">{niche.name}</h3>
                  <div className="flex items-center gap-1 bg-black/30 rounded-full px-2 py-0.5">
                    <Star size={9} className="text-amber-400" fill="currentColor" />
                    <span className="text-[10px] font-bold text-white">{niche.score}</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 mb-3">
                  <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-medium', COMPETITION_COLOR[niche.competition] || 'text-gray-400')}>
                    Comp: {niche.competition}
                  </span>
                  <span className={cn('text-[10px] font-medium', MONETIZATION_COLOR[niche.monetization])}>
                    💰 {niche.monetization}
                  </span>
                </div>

                <div className="flex items-center gap-1 mb-2">
                  <TrendingUp size={11} className="text-emerald-400" />
                  <span className="text-xs font-bold text-emerald-400">{niche.growth} búsquedas</span>
                </div>

                <div className="flex flex-wrap gap-1 mb-3">
                  {niche.tags.map(tag => (
                    <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded bg-black/20 text-gray-300">#{tag}</span>
                  ))}
                </div>

                <div className="flex flex-wrap gap-1">
                  {niche.platforms.map(p => (
                    <span key={p} className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-white/10 text-gray-200">{p}</span>
                  ))}
                </div>

                {selected?.name === niche.name && (
                  <div className="mt-3 pt-3 border-t border-white/10">
                    <button
                      onClick={e => { e.stopPropagation(); setQuery(niche.name); setTimeout(analyze, 100) }}
                      className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition-colors"
                    >
                      <Sparkles size={11} /> Analizar con IA <ArrowRight size={11} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
