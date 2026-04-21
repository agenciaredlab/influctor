'use client'

import { useState } from 'react'
import { RefreshCw, Sparkles, Copy, CheckCheck, ArrowRight, CheckCircle, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

const OUTPUT_FORMATS = [
  { id: 'instagram_caption', label: 'Caption Instagram', icon: '📸', platform: 'Instagram' },
  { id: 'tiktok_hook',       label: 'Hook TikTok',       icon: '🎵', platform: 'TikTok'    },
  { id: 'linkedin_post',     label: 'Post LinkedIn',     icon: '💼', platform: 'LinkedIn'  },
  { id: 'twitter_thread',    label: 'Hilo Twitter/X',    icon: '🐦', platform: 'Twitter'   },
  { id: 'youtube_desc',      label: 'Descripción YT',    icon: '▶️', platform: 'YouTube'   },
  { id: 'email_newsletter',  label: 'Newsletter',        icon: '📧', platform: 'Email'     },
  { id: 'blog_outline',      label: 'Outline de Blog',   icon: '📝', platform: 'Blog'      },
  { id: 'stories_script',    label: 'Script Stories',    icon: '⚡', platform: 'Stories'   },
]

interface RepurposeResult {
  formatId: string
  content:  string
}

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
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#1a1a2e] hover:bg-violet-500/10 text-gray-400 hover:text-violet-400 text-xs transition-colors flex-shrink-0"
    >
      {copied ? <CheckCheck size={11} className="text-emerald-400" /> : <Copy size={11} />}
      {copied ? 'Copiado' : 'Copiar'}
    </button>
  )
}

export default function RepurposeClient() {
  const [sourceContent,    setSourceContent]    = useState('')
  const [sourceType,       setSourceType]       = useState('video_script')
  const [selectedFormats,  setSelectedFormats]  = useState<string[]>(['instagram_caption', 'tiktok_hook', 'linkedin_post'])
  const [loading,          setLoading]          = useState(false)
  const [results,          setResults]          = useState<RepurposeResult[]>([])
  const [activeTab,        setActiveTab]        = useState<string | null>(null)
  const [error,            setError]            = useState('')

  function toggleFormat(id: string) {
    setSelectedFormats(prev =>
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    )
  }

  async function repurpose() {
    if (!sourceContent.trim() || selectedFormats.length === 0) return
    setLoading(true)
    setError('')
    setResults([])
    setActiveTab(null)

    try {
      const res  = await fetch('/api/repurpose', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ sourceContent, sourceType, selectedFormats }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error')

      const parsed: RepurposeResult[] = data.results ?? []
      setResults(parsed)
      if (parsed.length > 0) setActiveTab(parsed[0].formatId)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const activeResult = results.find(r => r.formatId === activeTab)
  const missingFormats = selectedFormats.filter(id => results.length > 0 && !results.find(r => r.formatId === id))

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Input panel ─────────────────────────────────────────────────── */}
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

          {/* Format selector */}
          <div className="bg-[#13131f] border border-[#1a1a2e] rounded-xl p-4 space-y-3">
            <h3 className="font-semibold text-white text-sm">Formatos de salida</h3>
            <div className="grid grid-cols-2 gap-2">
              {OUTPUT_FORMATS.map(fmt => (
                <button
                  key={fmt.id}
                  onClick={() => toggleFormat(fmt.id)}
                  className={cn(
                    'flex items-center gap-2 p-2.5 rounded-lg border text-left text-xs transition-all',
                    selectedFormats.includes(fmt.id)
                      ? 'bg-violet-600/15 border-violet-500/30 text-violet-300'
                      : 'bg-[#0d0d1a] border-[#1a1a2e] text-gray-400 hover:text-gray-200'
                  )}
                >
                  <span>{fmt.icon}</span>
                  <div className="min-w-0">
                    <div className="font-medium text-[11px]">{fmt.platform}</div>
                    <div className="text-[9px] text-gray-500 truncate">{fmt.label}</div>
                  </div>
                  {selectedFormats.includes(fmt.id) && <CheckCircle size={11} className="text-violet-400 ml-auto flex-shrink-0" />}
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
              <><RefreshCw size={14} className="animate-spin" /> Procesando {selectedFormats.length} formatos...</>
            ) : (
              <><Sparkles size={14} /> Repurpose con IA <ArrowRight size={14} /></>
            )}
          </button>
        </div>

        {/* ── Output panel ────────────────────────────────────────────────── */}
        <div className="lg:col-span-2">
          {results.length > 0 ? (
            <div className="bg-[#13131f] border border-[#1a1a2e] rounded-xl overflow-hidden">
              {/* Format tabs */}
              <div className="flex flex-wrap gap-1 p-3 border-b border-[#1a1a2e] bg-[#0d0d1a]">
                {results.map(r => {
                  const fmt = OUTPUT_FORMATS.find(f => f.id === r.formatId)
                  return (
                    <button
                      key={r.formatId}
                      onClick={() => setActiveTab(r.formatId)}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                        activeTab === r.formatId
                          ? 'bg-violet-600/20 text-violet-300 border border-violet-500/30'
                          : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
                      )}
                    >
                      <span>{fmt?.icon ?? '📄'}</span>
                      {fmt?.platform ?? r.formatId}
                    </button>
                  )
                })}
                {missingFormats.length > 0 && (
                  <span className="flex items-center gap-1 px-2 py-1 text-[10px] text-amber-500">
                    <AlertCircle size={10} /> {missingFormats.length} sin parsear
                  </span>
                )}
              </div>

              {/* Active format content */}
              {activeResult && (
                <div className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{OUTPUT_FORMATS.find(f => f.id === activeResult.formatId)?.icon}</span>
                      <div>
                        <div className="text-sm font-semibold text-white">
                          {OUTPUT_FORMATS.find(f => f.id === activeResult.formatId)?.label}
                        </div>
                        <div className="text-[10px] text-gray-500">{activeResult.content.length} caracteres</div>
                      </div>
                    </div>
                    <CopyButton text={activeResult.content} />
                  </div>
                  <div className="bg-[#0d0d1a] rounded-xl p-4 whitespace-pre-wrap text-sm text-gray-300 leading-relaxed max-h-[600px] overflow-y-auto">
                    {activeResult.content}
                  </div>
                </div>
              )}
            </div>
          ) : error ? (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-center">
              <AlertCircle size={20} className="text-red-400 mx-auto mb-2" />
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          ) : (
            /* Empty state */
            <div className="bg-[#13131f] border border-[#1a1a2e] rounded-xl p-8 text-center h-full flex flex-col items-center justify-center min-h-[400px]">
              <div className="w-16 h-16 rounded-2xl bg-violet-500/10 flex items-center justify-center mb-4">
                <RefreshCw size={24} className="text-violet-400" />
              </div>
              <h3 className="font-semibold text-white text-base mb-2">Un contenido, múltiples plataformas</h3>
              <p className="text-sm text-gray-500 max-w-xs">
                Pega tu contenido original, selecciona los formatos y la IA lo adaptará para cada plataforma con el tono y estilo nativo.
              </p>
              <div className="mt-6 grid grid-cols-2 gap-3 w-full max-w-sm">
                {[
                  { label: 'Ahorra tiempo', value: '90%', desc: 'menos tiempo creando' },
                  { label: 'Más alcance',   value: '5x',  desc: 'más plataformas'     },
                ].map(stat => (
                  <div key={stat.label} className="bg-[#0d0d1a] rounded-xl p-3 text-center">
                    <div className="text-xl font-bold text-violet-400">{stat.value}</div>
                    <div className="text-xs text-gray-500">{stat.desc}</div>
                  </div>
                ))}
              </div>

              {/* Format preview list */}
              <div className="mt-5 flex flex-wrap justify-center gap-1.5">
                {OUTPUT_FORMATS.map(f => (
                  <span key={f.id} className="text-[10px] px-2 py-1 bg-[#0d0d1a] text-gray-600 rounded-full border border-[#1a1a2e]">
                    {f.icon} {f.platform}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
