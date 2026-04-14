'use client'

import { useState } from 'react'
import { FileText, Sparkles, Copy, CheckCheck, RefreshCw, ChevronDown, ChevronUp, Clock, Zap, BookOpen } from 'lucide-react'
import { cn } from '@/lib/utils'

const SCRIPT_FORMATS = [
  { id: 'reel', label: 'Reel / TikTok (30-60s)', duration: '30-60s', words: '75-150' },
  { id: 'short', label: 'YouTube Short (60s)', duration: '60s', words: '150' },
  { id: 'video5', label: 'Video 5 minutos', duration: '5 min', words: '700' },
  { id: 'video10', label: 'Video 10 minutos', duration: '10 min', words: '1400' },
  { id: 'podcast', label: 'Podcast / Long-form', duration: '20-30 min', words: '3000+' },
]

const SCRIPT_STYLES = [
  { id: 'educational', label: '🎓 Educativo', desc: 'Enseña algo valioso paso a paso' },
  { id: 'story', label: '📖 Historia', desc: 'Narrativa personal o caso real' },
  { id: 'listicle', label: '📋 Lista', desc: 'Top N de consejos o ideas' },
  { id: 'controversial', label: '🔥 Controversial', desc: 'Opinión opuesta a la corriente' },
  { id: 'tutorial', label: '🛠️ Tutorial', desc: 'Cómo hacer algo paso a paso' },
  { id: 'motivation', label: '💪 Motivacional', desc: 'Inspira y motiva a la audiencia' },
]

const PLATFORMS = ['Instagram', 'TikTok', 'YouTube', 'LinkedIn']

const EXAMPLE_SCRIPT = `🎬 HOOK (0-3s)
"Cometí un error que me costó 3 años de crecimiento en redes. Hoy te lo cuento para que no lo repitas."

---

📖 DESARROLLO (3-45s)
[Pausa dramática] Hace 3 años empecé mi canal con TON de energía. Publicaba todos los días. Pero mis números no crecían.

¿Sabes cuál era mi error? Estaba creando contenido para MÍ, no para MI AUDIENCIA.

Punto 1: Habla del problema de tu audiencia, no de tu experiencia.
[Ejemplo concreto]

Punto 2: Usa el gancho visual en los primeros 2 segundos.
[Demo rápido]

Punto 3: Termina con una acción clara.
[Show what to do]

---

🎯 CIERRE + CTA (últimos 5s)
"Si esto te sirvió, sígueme porque cada semana publico exactamente esto. ¿Cuál de estos errores has cometido tú? Coméntalo abajo 👇"`

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      onClick={copy}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1a1a2e] hover:bg-violet-500/10 text-gray-400 hover:text-violet-400 text-xs transition-colors"
    >
      {copied ? <CheckCheck size={12} className="text-emerald-400" /> : <Copy size={12} />}
      {copied ? 'Copiado' : 'Copiar'}
    </button>
  )
}

export default function ScriptsClient() {
  const [topic, setTopic] = useState('')
  const [platform, setPlatform] = useState('TikTok')
  const [format, setFormat] = useState('reel')
  const [style, setStyle] = useState('educational')
  const [audience, setAudience] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState('')
  const [error, setError] = useState('')
  const [showTips, setShowTips] = useState(true)

  async function generate() {
    if (!topic.trim()) return
    setLoading(true)
    setError('')
    setResult('')

    const selectedFormat = SCRIPT_FORMATS.find(f => f.id === format)
    const selectedStyle = SCRIPT_STYLES.find(s => s.id === style)

    const prompt = `Genera un guión completo de video tipo "${selectedStyle?.label}" en formato "${selectedFormat?.label}" para ${platform}.

Tema: ${topic}
${audience ? `Audiencia objetivo: ${audience}` : ''}

El guión debe incluir:
1. HOOK irresistible (primeros 3 segundos que enganchen)
2. DESARROLLO con los puntos clave (con indicaciones de edición/visuales)
3. CIERRE con CTA claro

Formato: usa marcadores visuales como [pausa], [zoom], [texto en pantalla], etc.
Duración objetivo: ${selectedFormat?.duration}
Tono: ${selectedStyle?.desc}

Hazlo específico, accionable y optimizado para retención máxima.`

    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'content_ideas', fields: { topic: prompt, platform: platform.toLowerCase() } }),
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

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Config panel */}
        <div className="space-y-4">
          <div className="bg-[#13131f] border border-[#1a1a2e] rounded-xl p-4 space-y-4">
            <h3 className="font-semibold text-white text-sm flex items-center gap-2">
              <FileText size={14} className="text-violet-400" />
              Configurar Guión
            </h3>

            <div>
              <label className="text-xs text-gray-400 mb-1 block">Tema del video *</label>
              <textarea
                value={topic}
                onChange={e => setTopic(e.target.value)}
                placeholder="ej: Cómo ganar dinero con Instagram sin muchos seguidores"
                rows={3}
                className="w-full px-3 py-2 bg-[#0d0d1a] border border-[#1a1a2e] rounded-lg text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-violet-500/50 resize-none"
              />
            </div>

            <div>
              <label className="text-xs text-gray-400 mb-1 block">Plataforma</label>
              <div className="grid grid-cols-2 gap-2">
                {PLATFORMS.map(p => (
                  <button
                    key={p}
                    onClick={() => setPlatform(p)}
                    className={cn(
                      'py-1.5 rounded-lg text-xs font-medium transition-colors',
                      platform === p ? 'bg-violet-600 text-white' : 'bg-[#0d0d1a] text-gray-400 hover:text-gray-200 border border-[#1a1a2e]'
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-400 mb-1 block">Formato / Duración</label>
              <select
                value={format}
                onChange={e => setFormat(e.target.value)}
                className="w-full px-3 py-2 bg-[#0d0d1a] border border-[#1a1a2e] rounded-lg text-sm text-gray-200 focus:outline-none focus:border-violet-500/50"
              >
                {SCRIPT_FORMATS.map(f => (
                  <option key={f.id} value={f.id}>{f.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-gray-400 mb-2 block">Estilo narrativo</label>
              <div className="space-y-1.5">
                {SCRIPT_STYLES.map(s => (
                  <button
                    key={s.id}
                    onClick={() => setStyle(s.id)}
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-left transition-colors',
                      style === s.id ? 'bg-violet-600/20 border border-violet-500/30 text-violet-300' : 'bg-[#0d0d1a] border border-[#1a1a2e] text-gray-400 hover:text-gray-200'
                    )}
                  >
                    <span className="font-medium">{s.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-400 mb-1 block">Audiencia objetivo (opcional)</label>
              <input
                value={audience}
                onChange={e => setAudience(e.target.value)}
                placeholder="ej: emprendedores 25-40 años"
                className="w-full px-3 py-2 bg-[#0d0d1a] border border-[#1a1a2e] rounded-lg text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-violet-500/50"
              />
            </div>

            <button
              onClick={generate}
              disabled={loading || !topic.trim()}
              className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <><RefreshCw size={14} className="animate-spin" /> Generando...</> : <><Sparkles size={14} /> Generar Guión</>}
            </button>
          </div>

          {/* Tips */}
          <div className="bg-[#13131f] border border-[#1a1a2e] rounded-xl overflow-hidden">
            <button
              onClick={() => setShowTips(!showTips)}
              className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-300 hover:text-white transition-colors"
            >
              <span className="flex items-center gap-2"><BookOpen size={13} className="text-amber-400" /> Tips de guionismo</span>
              {showTips ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
            {showTips && (
              <div className="px-4 pb-4 space-y-2 text-xs text-gray-400 border-t border-[#1a1a2e] pt-3">
                <p>🎯 <strong className="text-gray-300">Regla de los 3s:</strong> El hook debe funcionar sin sonido</p>
                <p>📊 <strong className="text-gray-300">Bucle abierto:</strong> Promete algo al inicio, entrega al final</p>
                <p>✂️ <strong className="text-gray-300">Edita antes:</strong> Escribe el guión antes de grabar</p>
                <p>🔁 <strong className="text-gray-300">Pattern interrupt:</strong> Cambia el ritmo cada 5-7 segundos</p>
                <p>💬 <strong className="text-gray-300">Habla directo:</strong> Como si hablaras a una sola persona</p>
              </div>
            )}
          </div>
        </div>

        {/* Output panel */}
        <div className="lg:col-span-2">
          {result ? (
            <div className="bg-[#13131f] border border-[#1a1a2e] rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-white text-sm flex items-center gap-2">
                  <Sparkles size={13} className="text-violet-400" />
                  Guión Generado
                </h3>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <Clock size={11} /> {SCRIPT_FORMATS.find(f => f.id === format)?.duration}
                  </span>
                  <CopyButton text={result} />
                </div>
              </div>
              <div className="bg-[#0d0d1a] rounded-xl p-4 whitespace-pre-wrap text-sm text-gray-300 leading-relaxed font-mono max-h-[600px] overflow-y-auto">
                {result}
              </div>
            </div>
          ) : error ? (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-center">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          ) : (
            <div className="bg-[#13131f] border border-[#1a1a2e] rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-white text-sm">Ejemplo de guión</h3>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded">Demo</span>
                  <CopyButton text={EXAMPLE_SCRIPT} />
                </div>
              </div>
              <div className="bg-[#0d0d1a] rounded-xl p-4 whitespace-pre-wrap text-sm text-gray-400 leading-relaxed font-mono">
                {EXAMPLE_SCRIPT}
              </div>
              <div className="mt-4 flex items-center gap-2 p-3 bg-violet-900/10 border border-violet-500/20 rounded-lg">
                <Zap size={13} className="text-violet-400 flex-shrink-0" />
                <p className="text-xs text-gray-400">Configura tu tema y haz clic en <strong className="text-violet-300">Generar Guión</strong> para crear un guión personalizado con IA</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
