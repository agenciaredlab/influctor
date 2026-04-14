'use client'

import { useState } from 'react'
import { RefreshCw, Sparkles, Copy, CheckCheck, ArrowRight, Zap, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

const OUTPUT_FORMATS = [
  { id: 'instagram_caption', label: 'Caption Instagram', icon: '📸', platform: 'Instagram' },
  { id: 'tiktok_hook', label: 'Hook TikTok', icon: '🎵', platform: 'TikTok' },
  { id: 'linkedin_post', label: 'Post LinkedIn', icon: '💼', platform: 'LinkedIn' },
  { id: 'twitter_thread', label: 'Hilo Twitter/X', icon: '🐦', platform: 'Twitter' },
  { id: 'youtube_desc', label: 'Descripción YouTube', icon: '▶️', platform: 'YouTube' },
  { id: 'email_newsletter', label: 'Newsletter', icon: '📧', platform: 'Email' },
  { id: 'blog_outline', label: 'Outline de Blog', icon: '📝', platform: 'Blog' },
  { id: 'stories_script', label: 'Script para Stories', icon: '⚡', platform: 'Stories' },
]

interface RepurposeResult {
  formatId: string
  content: string
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  function copy() { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000) }
  return (
    <button onClick={copy} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#1a1a2e] hover:bg-violet-500/10 text-gray-400 hover:text-violet-400 text-xs transition-colors">
      {copied ? <CheckCheck size={11} className="text-emerald-400" /> : <Copy size={11} />}
      {copied ? 'Copiado' : 'Copiar'}
    </button>
  )
}

export default function RepurposeClient() {
  const [sourceContent, setSourceContent] = useState('')
  const [sourceType, setSourceType] = useState('video_script')
  const [selectedFormats, setSelectedFormats] = useState<string[]>(['instagram_caption', 'tiktok_hook', 'linkedin_post'])
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<RepurposeResult[]>([])
  const [error, setError] = useState('')

  function toggleFormat(id: string) {
    setSelectedFormats(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id])
  }

  async function repurpose() {
    if (!sourceContent.trim() || selectedFormats.length === 0) return
    setLoading(true)
    setError('')
    setResults([])

    const formatLabels = selectedFormats.map(id => OUTPUT_FORMATS.find(f => f.id === id)?.label).filter(Boolean).join(', ')

    const prompt = `Tengo este contenido original (${sourceType === 'video_script' ? 'guión de video' : sourceType === 'blog_post' ? 'artículo de blog' : sourceType === 'podcast' ? 'transcripción de podcast' : 'publicación en redes'}):

"${sourceContent}"

Necesito que lo adaptes para estos formatos: ${formatLabels}

Para CADA formato, crea una versión optimizada que:
- Use el tono y estilo apropiado para esa plataforma
- Tenga la longitud ideal para ese canal
- Incluya los elementos nativos (hashtags para Instagram, estructura de hilo para Twitter, CTA para LinkedIn, etc.)
- Maximice el engagement en esa plataforma específica

Separa claramente cada formato con su título.`

    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'content_ideas', fields: { topic: prompt, platform: 'instagram' } }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error')

      // Parse the result into sections
      const rawResult: string = data.result || ''
      const parsed: RepurposeResult[] = selectedFormats.map(id => {
        const fmt = OUTPUT_FORMATS.find(f => f.id === id)
        return { formatId: id, content: rawResult }
      })
      setResults([{ formatId: 'all', content: rawResult }])
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Input */}
        <div className="space-y-4">
          <div className="bg-[#13131f] border border-[#1a1a2e] rounded-xl p-4 space-y-4">
            <h3 className="font-semibold text-white text-sm flex items-center gap-2">
              <RefreshCw size={14} className="text-violet-400" />
              Contenido original
            </h3>

            <div>
              <label className="text-xs text-gray-400 mb-1 block">Tipo de contenido fuente</label>
              <select
                value={sourceType}
                onChange={e => setSourceType(e.target.value)}
                className="w-full px-3 py-2 bg-[#0d0d1a] border border-[#1a1a2e] rounded-lg text-sm text-gray-200 focus:outline-none focus:border-violet-500/50"
              >
                <option value="video_script">Guión de video</option>
                <option value="blog_post">Artículo de blog</option>
                <option value="podcast">Transcripción de podcast</option>
                <option value="social_post">Publicación en redes</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-gray-400 mb-1 block">Pega tu contenido aquí</label>
              <textarea
                value={sourceContent}
                onChange={e => setSourceContent(e.target.value)}
                placeholder="Pega aquí el texto de tu video, artículo, podcast o post original..."
                rows={8}
                className="w-full px-3 py-2 bg-[#0d0d1a] border border-[#1a1a2e] rounded-lg text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-violet-500/50 resize-none"
              />
              <div className="text-right text-[10px] text-gray-600 mt-1">{sourceContent.length} caracteres</div>
            </div>
          </div>

          <div className="bg-[#13131f] border border-[#1a1a2e] rounded-xl p-4 space-y-3">
            <h3 className="font-semibold text-white text-sm">Formatos de salida</h3>
            <div className="grid grid-cols-2 gap-2">
              {OUTPUT_FORMATS.map(fmt => (
                <button
                  key={fmt.id}
                  onClick={() => toggleFormat(fmt.id)}
                  className={cn(
                    'flex items-center gap-2 p-2.5 rounded-lg border text-left text-xs transition-all',
                    selectedFormats.includes(fmt.id) ? 'bg-violet-600/15 border-violet-500/30 text-violet-300' : 'bg-[#0d0d1a] border-[#1a1a2e] text-gray-400 hover:text-gray-200'
                  )}
                >
                  <span>{fmt.icon}</span>
                  <div>
                    <div className="font-medium text-[11px]">{fmt.platform}</div>
                    <div className="text-[9px] text-gray-500">{fmt.label}</div>
                  </div>
                  {selectedFormats.includes(fmt.id) && <CheckCircle size={11} className="text-violet-400 ml-auto" />}
                </button>
              ))}
            </div>
            <div className="text-xs text-gray-500">{selectedFormats.length} formatos seleccionados</div>
          </div>

          <button
            onClick={repurpose}
            disabled={loading || !sourceContent.trim() || selectedFormats.length === 0}
            className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <><RefreshCw size={14} className="animate-spin" /> Procesando...</>
            ) : (
              <><Sparkles size={14} /> Repurpose con IA <ArrowRight size={14} /></>
            )}
          </button>
        </div>

        {/* Output */}
        <div className="lg:col-span-2">
          {results.length > 0 ? (
            <div className="bg-[#13131f] border border-[#1a1a2e] rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-white text-sm flex items-center gap-2">
                  <Sparkles size={13} className="text-violet-400" />
                  Contenido repurposeado
                </h3>
                <CopyButton text={results[0].content} />
              </div>
              <div className="bg-[#0d0d1a] rounded-xl p-4 whitespace-pre-wrap text-sm text-gray-300 leading-relaxed max-h-[700px] overflow-y-auto">
                {results[0].content}
              </div>
            </div>
          ) : error ? (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-center">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          ) : (
            <div className="bg-[#13131f] border border-[#1a1a2e] rounded-xl p-8 text-center h-full flex flex-col items-center justify-center">
              <div className="w-16 h-16 rounded-2xl bg-violet-500/10 flex items-center justify-center mb-4">
                <RefreshCw size={24} className="text-violet-400" />
              </div>
              <h3 className="font-semibold text-white text-base mb-2">Un contenido, múltiples plataformas</h3>
              <p className="text-sm text-gray-500 max-w-xs">Pega tu contenido original, selecciona los formatos y la IA lo adaptará para cada plataforma</p>

              <div className="mt-6 grid grid-cols-2 gap-3 w-full max-w-sm">
                {[
                  { label: 'Ahorra tiempo', value: '90%', desc: 'menos tiempo creando' },
                  { label: 'Más alcance', value: '5x', desc: 'más plataformas' },
                ].map(stat => (
                  <div key={stat.label} className="bg-[#0d0d1a] rounded-xl p-3 text-center">
                    <div className="text-xl font-bold text-violet-400">{stat.value}</div>
                    <div className="text-xs text-gray-500">{stat.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
