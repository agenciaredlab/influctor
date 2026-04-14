'use client'

import { useState } from 'react'
import { Hash, Search, Sparkles, Copy, CheckCheck, RefreshCw, TrendingUp, Zap, X } from 'lucide-react'
import { cn } from '@/lib/utils'

const PRESET_SETS = [
  {
    label: 'Fitness 💪', platform: 'instagram',
    hashtags: ['#fitness', '#gym', '#workout', '#fit', '#motivation', '#training', '#health', '#muscle', '#fitlife', '#bodybuilding', '#ejercicio', '#rutina', '#saludable', '#vidaactiva', '#deporte', '#entrenamiento', '#gymlife', '#fitnessgoals', '#crossfit', '#cardio'],
  },
  {
    label: 'Emprendimiento 🚀', platform: 'instagram',
    hashtags: ['#emprendimiento', '#entrepreneur', '#negocio', '#marketing', '#exito', '#dinero', '#startup', '#emprendedor', '#business', '#motivacion', '#emprendedores', '#trabajo', '#networkmarketing', '#liderazgo', '#libertadfinanciera', '#ingresosonline', '#mktdigital', '#marca', '#ventas', '#crecimiento'],
  },
  {
    label: 'Lifestyle ✨', platform: 'instagram',
    hashtags: ['#lifestyle', '#life', '#happy', '#love', '#instagram', '#instagood', '#photooftheday', '#beautiful', '#fashion', '#style', '#travel', '#nature', '#photography', '#like4like', '#picoftheday', '#selfie', '#followme', '#follow', '#summer', '#art'],
  },
  {
    label: 'Food 🍕', platform: 'instagram',
    hashtags: ['#food', '#foodie', '#foodporn', '#instafood', '#yummy', '#delicious', '#eating', '#foodphotography', '#breakfast', '#dinner', '#lunch', '#recipe', '#homemade', '#cooking', '#healthy', '#comida', '#receta', '#cocina', '#foodstagram', '#healthyfood'],
  },
]

interface HashtagResult {
  tag: string
  volume: 'alta' | 'media' | 'baja'
  competition: 'alta' | 'media' | 'baja'
  recommended: boolean
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  function copy() { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000) }
  return (
    <button onClick={copy} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1a1a2e] hover:bg-violet-500/10 text-gray-400 hover:text-violet-400 text-xs transition-colors">
      {copied ? <CheckCheck size={12} className="text-emerald-400" /> : <Copy size={12} />}
      {copied ? 'Copiado' : 'Copiar'}
    </button>
  )
}

const VOLUME_COLOR: Record<string, string> = {
  alta: 'text-red-400',
  media: 'text-amber-400',
  baja: 'text-emerald-400',
}

export default function HashtagsClient() {
  const [topic, setTopic] = useState('')
  const [platform, setPlatform] = useState('instagram')
  const [strategy, setStrategy] = useState('balanced')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState('')
  const [error, setError] = useState('')
  const [selectedPreset, setSelectedPreset] = useState<typeof PRESET_SETS[0] | null>(null)
  const [copiedSet, setCopiedSet] = useState<string[]>([])

  async function generate() {
    if (!topic.trim()) return
    setLoading(true)
    setError('')
    setResult('')

    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'hashtags',
          fields: { topic, platform, strategy },
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error')
      setResult(data.result)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  function addToSet(tag: string) {
    if (!copiedSet.includes(tag) && copiedSet.length < 30) {
      setCopiedSet(prev => [...prev, tag])
    }
  }

  function removeFromSet(tag: string) {
    setCopiedSet(prev => prev.filter(t => t !== tag))
  }

  return (
    <div className="space-y-6">
      {/* Generator */}
      <div className="bg-[#13131f] border border-[#1a1a2e] rounded-xl p-5 space-y-4">
        <h3 className="font-semibold text-white text-sm flex items-center gap-2">
          <Sparkles size={14} className="text-violet-400" />
          Generador de hashtags con IA
        </h3>
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Hash size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              value={topic}
              onChange={e => setTopic(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && generate()}
              placeholder="Describe tu contenido... ej: recetas saludables para bajar de peso"
              className="w-full pl-9 pr-4 py-2.5 bg-[#0d0d1a] border border-[#1a1a2e] rounded-lg text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-violet-500/50"
            />
          </div>
          <select
            value={platform}
            onChange={e => setPlatform(e.target.value)}
            className="px-3 py-2 bg-[#0d0d1a] border border-[#1a1a2e] rounded-lg text-sm text-gray-200 focus:outline-none focus:border-violet-500/50"
          >
            {['instagram', 'tiktok', 'linkedin', 'twitter'].map(p => (
              <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
            ))}
          </select>
          <select
            value={strategy}
            onChange={e => setStrategy(e.target.value)}
            className="px-3 py-2 bg-[#0d0d1a] border border-[#1a1a2e] rounded-lg text-sm text-gray-200 focus:outline-none focus:border-violet-500/50"
          >
            <option value="balanced">Balanceada</option>
            <option value="viral">Máximo alcance</option>
            <option value="niche">Nicho específico</option>
            <option value="trending">Solo tendencias</option>
          </select>
          <button
            onClick={generate}
            disabled={loading || !topic.trim()}
            className="px-5 py-2.5 bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2 whitespace-nowrap"
          >
            {loading ? <><RefreshCw size={13} className="animate-spin" /> Generando...</> : <><Zap size={13} /> Generar</>}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* AI Result */}
        <div className="lg:col-span-2 space-y-4">
          {result ? (
            <div className="bg-[#13131f] border border-[#1a1a2e] rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-white text-sm">Hashtags generados para: <span className="text-violet-400">{topic}</span></h3>
                <CopyButton text={result} />
              </div>
              <div className="whitespace-pre-wrap text-sm text-gray-300 leading-relaxed">{result}</div>
            </div>
          ) : error ? (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-5">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          ) : null}

          {/* Preset Sets */}
          <div>
            <h3 className="font-semibold text-white text-sm mb-3">Sets predefinidos por nicho</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              {PRESET_SETS.map(preset => (
                <button
                  key={preset.label}
                  onClick={() => setSelectedPreset(selectedPreset?.label === preset.label ? null : preset)}
                  className={cn(
                    'p-3 rounded-xl border text-left text-xs transition-all',
                    selectedPreset?.label === preset.label ? 'bg-violet-600/15 border-violet-500/30 text-violet-300' : 'bg-[#13131f] border-[#1a1a2e] text-gray-400 hover:text-gray-200 hover:border-violet-500/20'
                  )}
                >
                  <span className="font-semibold">{preset.label}</span>
                  <span className="block text-[10px] text-gray-500 mt-0.5">{preset.platform} · {preset.hashtags.length} tags</span>
                </button>
              ))}
            </div>

            {selectedPreset && (
              <div className="bg-[#13131f] border border-[#1a1a2e] rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-white text-sm">{selectedPreset.label}</h4>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCopiedSet(selectedPreset.hashtags.slice(0, 30))}
                      className="text-xs px-2.5 py-1 rounded-lg bg-violet-600/20 text-violet-300 hover:bg-violet-600/30 transition-colors"
                    >
                      Usar todos
                    </button>
                    <CopyButton text={selectedPreset.hashtags.join(' ')} />
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {selectedPreset.hashtags.map(tag => (
                    <button
                      key={tag}
                      onClick={() => addToSet(tag)}
                      className={cn(
                        'text-xs px-2.5 py-1 rounded-full transition-colors',
                        copiedSet.includes(tag) ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30' : 'bg-[#0d0d1a] text-gray-400 hover:text-violet-300 hover:bg-violet-500/10'
                      )}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* My set */}
        <div className="space-y-4">
          <div className="bg-[#13131f] border border-[#1a1a2e] rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-white text-sm flex items-center gap-2">
                <Hash size={13} className="text-violet-400" />
                Mi set <span className="text-xs text-gray-500">({copiedSet.length}/30)</span>
              </h3>
              {copiedSet.length > 0 && (
                <CopyButton text={copiedSet.join(' ')} />
              )}
            </div>

            {copiedSet.length > 0 ? (
              <>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {copiedSet.map(tag => (
                    <div key={tag} className="flex items-center gap-1 text-xs bg-violet-500/15 text-violet-300 border border-violet-500/20 rounded-full px-2 py-0.5">
                      <span>{tag}</span>
                      <button onClick={() => removeFromSet(tag)} className="hover:text-white ml-0.5">
                        <X size={10} />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="h-1.5 bg-[#0d0d1a] rounded-full overflow-hidden">
                  <div className={cn('h-full rounded-full', copiedSet.length >= 25 ? 'bg-red-500' : copiedSet.length >= 20 ? 'bg-amber-500' : 'bg-violet-500')} style={{ width: `${(copiedSet.length / 30) * 100}%` }} />
                </div>
                <p className="text-[10px] text-gray-500 mt-1">
                  {copiedSet.length >= 25 ? '⚠️ Casi al límite de Instagram (30)' : `${30 - copiedSet.length} hashtags disponibles`}
                </p>
              </>
            ) : (
              <div className="text-center py-6">
                <Hash size={24} className="mx-auto mb-2 text-gray-600" />
                <p className="text-xs text-gray-500">Haz clic en un hashtag de los sets predefinidos para agregarlo aquí</p>
              </div>
            )}
          </div>

          {/* Tips */}
          <div className="bg-gradient-to-br from-violet-900/20 to-purple-900/10 border border-violet-500/20 rounded-xl p-4">
            <h3 className="font-semibold text-violet-300 text-sm mb-3 flex items-center gap-2">
              <TrendingUp size={13} />
              Estrategia de hashtags
            </h3>
            <div className="space-y-2 text-xs text-gray-400">
              <p>🎯 <strong className="text-gray-300">Mix ideal:</strong> 30% grandes, 40% medianos, 30% nicho</p>
              <p>📍 <strong className="text-gray-300">Ubicación:</strong> En el caption, no en comentarios</p>
              <p>🔄 <strong className="text-gray-300">Rota:</strong> Usa sets diferentes cada semana</p>
              <p>🌍 <strong className="text-gray-300">Bilingüe:</strong> Mezcla español e inglés</p>
              <p>📊 <strong className="text-gray-300">Analiza:</strong> Cuáles traen más alcance</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
