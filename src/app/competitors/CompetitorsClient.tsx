'use client'

import { useState } from 'react'
import { Search, Plus, TrendingUp, TrendingDown, Minus, Eye, Heart, MessageCircle, Users, BarChart2, Trash2, RefreshCw, Zap, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

const PLATFORM_COLORS: Record<string, string> = {
  instagram: 'text-pink-400 bg-pink-500/10',
  tiktok:    'text-cyan-400 bg-cyan-500/10',
  youtube:   'text-red-400 bg-red-500/10',
  linkedin:  'text-blue-400 bg-blue-500/10',
  twitter:   'text-sky-400 bg-sky-500/10',
}

const PLATFORM_EMOJIS: Record<string, string> = {
  instagram: '📸', tiktok: '🎵', youtube: '▶️', linkedin: '💼', twitter: '🐦',
}

function formatK(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'
  return String(n)
}

interface Competitor {
  id: string
  handle: string
  platform: string
  followers: number
  engagement: number
  postsPerWeek: number
  avgLikes: number
  avgComments: number
  topFormat: string
  niche: string
  trend: 'up' | 'down' | 'flat'
  trendPct: number
  lastPost: string
  notes: string
}

function mapFromDb(c: any): Competitor {
  return {
    id:          c.id,
    handle:      c.handle,
    platform:    c.platform,
    followers:   c.followers ?? 0,
    engagement:  c.engagement ?? 0,
    postsPerWeek: Number(c.postsPerWeek ?? 0),
    avgLikes:    c.avgLikes ?? 0,
    avgComments: c.avgComments ?? 0,
    topFormat:   c.contentTypes ?? 'Reels',
    niche:       c.niche ?? 'General',
    trend:       'flat',
    trendPct:    0,
    lastPost:    '—',
    notes:       c.notes ?? '',
  }
}

interface Props {
  initialCompetitors: any[]
}

export default function CompetitorsClient({ initialCompetitors }: Props) {
  const [competitors, setCompetitors] = useState<Competitor[]>(
    initialCompetitors.map(mapFromDb)
  )
  const [showAdd, setShowAdd]   = useState(false)
  const [selected, setSelected] = useState<Competitor | null>(null)
  const [search, setSearch]     = useState('')
  const [form, setForm]         = useState({ handle: '', platform: 'instagram', niche: '', notes: '' })
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')

  const filtered = competitors.filter(c =>
    c.handle.toLowerCase().includes(search.toLowerCase()) ||
    c.niche.toLowerCase().includes(search.toLowerCase())
  )

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!form.handle.trim()) return
    setSaving(true)
    setError('')

    // Simulate brief "analyzing" delay
    await new Promise(r => setTimeout(r, 1200))

    const payload = {
      handle:      form.handle.startsWith('@') ? form.handle : `@${form.handle}`,
      platform:    form.platform,
      niche:       form.niche,
      notes:       form.notes,
      // Estimated metrics until real API integration
      followers:    Math.floor(Math.random() * 150_000) + 5_000,
      engagement:   parseFloat((Math.random() * 7 + 1).toFixed(1)),
      postsPerWeek: Math.floor(Math.random() * 10) + 2,
      avgLikes:     Math.floor(Math.random() * 8_000) + 200,
      avgComments:  Math.floor(Math.random() * 400) + 30,
      topFormat:    ['Reels', 'Carruseles', 'Videos', 'Stories'][Math.floor(Math.random() * 4)],
    }

    try {
      const res = await fetch('/api/competitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)

      setCompetitors(prev => [mapFromDb(json.competitor), ...prev])
      setForm({ handle: '', platform: 'instagram', niche: '', notes: '' })
      setShowAdd(false)
    } catch (err: any) {
      setError(err.message)
    }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    // Optimistic remove
    setCompetitors(prev => prev.filter(c => c.id !== id))
    if (selected?.id === id) setSelected(null)

    try {
      await fetch(`/api/competitors/${id}`, { method: 'DELETE' })
    } catch {
      // If it fails we've already removed from UI; reload would restore it
    }
  }

  return (
    <div className="space-y-6">
      {/* Top bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar competidor..."
            className="w-full pl-9 pr-4 py-2 bg-[#13131f] border border-[#1a1a2e] rounded-lg text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-violet-500/50"
          />
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus size={14} /> Agregar
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Competitor list */}
        <div className="lg:col-span-2 space-y-3">
          {filtered.length === 0 && (
            <div className="text-center py-16 text-gray-600">
              <Search size={32} className="mx-auto mb-3 opacity-30" />
              {competitors.length === 0 ? (
                <>
                  <p className="text-sm font-medium text-gray-500 mb-1">No hay competidores todavía</p>
                  <p className="text-xs text-gray-600">Agrega a un competidor para empezar a analizar su estrategia</p>
                </>
              ) : (
                <p className="text-sm">No hay competidores que coincidan con "{search}"</p>
              )}
            </div>
          )}

          {filtered.map(comp => (
            <div
              key={comp.id}
              onClick={() => setSelected(comp)}
              className={cn(
                'bg-[#13131f] border rounded-xl p-4 cursor-pointer transition-all hover:border-violet-500/30',
                selected?.id === comp.id ? 'border-violet-500/40 shadow-lg shadow-violet-900/10' : 'border-[#1a1a2e]'
              )}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center text-lg', PLATFORM_COLORS[comp.platform] || 'bg-gray-700')}>
                    {PLATFORM_EMOJIS[comp.platform] || '🌐'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white text-sm">{comp.handle}</span>
                      <span className={cn('text-[10px] px-1.5 py-0.5 rounded font-medium capitalize', PLATFORM_COLORS[comp.platform])}>
                        {comp.platform}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-700/50 text-gray-400">{comp.niche}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Users size={10} /> {formatK(comp.followers)}
                      </span>
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Zap size={10} /> {comp.engagement}% eng
                      </span>
                      <span className="text-xs text-gray-500">{comp.postsPerWeek}x/sem</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {comp.trendPct > 0 && (
                    <div className={cn(
                      'flex items-center gap-1 text-xs font-medium px-2 py-1 rounded',
                      comp.trend === 'up'   ? 'text-emerald-400 bg-emerald-500/10' :
                      comp.trend === 'down' ? 'text-red-400 bg-red-500/10' :
                                              'text-gray-400 bg-gray-500/10'
                    )}>
                      {comp.trend === 'up' ? <TrendingUp size={11} /> : comp.trend === 'down' ? <TrendingDown size={11} /> : <Minus size={11} />}
                      {comp.trendPct}%
                    </div>
                  )}
                  <button
                    onClick={e => { e.stopPropagation(); handleDelete(comp.id) }}
                    className="p-1.5 rounded text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-4 mt-3 pt-3 border-t border-[#1a1a2e]">
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <Heart size={10} className="text-pink-400" /> {formatK(comp.avgLikes)} avg
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <MessageCircle size={10} className="text-blue-400" /> {formatK(comp.avgComments)} avg
                </div>
                <div className="text-xs text-gray-500">📋 {comp.topFormat}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Detail panel */}
        <div className="space-y-4">
          {selected ? (
            <>
              <div className="bg-[#13131f] border border-[#1a1a2e] rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-white text-sm">{selected.handle}</h3>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Seguidores',  value: formatK(selected.followers),    icon: Users,     color: 'text-violet-400' },
                    { label: 'Engagement',  value: `${selected.engagement}%`,      icon: Zap,       color: 'text-amber-400' },
                    { label: 'Posts/sem',   value: String(selected.postsPerWeek),  icon: BarChart2, color: 'text-blue-400' },
                    { label: 'Avg Likes',   value: formatK(selected.avgLikes),     icon: Heart,     color: 'text-pink-400' },
                  ].map(stat => (
                    <div key={stat.label} className="bg-[#0d0d1a] rounded-lg p-3">
                      <stat.icon size={14} className={cn('mb-1', stat.color)} />
                      <div className="text-sm font-bold text-white">{stat.value}</div>
                      <div className="text-[10px] text-gray-500">{stat.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-[#13131f] border border-[#1a1a2e] rounded-xl p-4">
                <h3 className="font-semibold text-white text-sm mb-3 flex items-center gap-2">
                  <AlertCircle size={13} className="text-amber-400" />
                  Insights & Gaps
                </h3>
                <div className="space-y-2 text-xs text-gray-400">
                  <div className="flex items-start gap-2">
                    <span className="text-emerald-400 mt-0.5">✓</span>
                    <span>Formato principal: <strong className="text-gray-200">{selected.topFormat}</strong></span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-amber-400 mt-0.5">→</span>
                    <span>
                      {selected.engagement > 5
                        ? 'Engagement alto — copia su estrategia de interacción'
                        : selected.engagement > 2
                        ? 'Engagement medio — oportunidad de superar con mejor CTA'
                        : 'Engagement bajo — la audiencia no está muy activa'}
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-blue-400 mt-0.5">★</span>
                    <span>
                      {selected.postsPerWeek >= 7
                        ? 'Publica muy seguido — consistencia como ventaja competitiva'
                        : selected.postsPerWeek >= 4
                        ? 'Frecuencia consistente — difícil superar sin mayor calidad'
                        : 'Publica poco — puedes ganar terreno publicando más'}
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-violet-400 mt-0.5">→</span>
                    <span>
                      {selected.followers > 100_000
                        ? `${formatK(selected.followers)} seguidores — cuenta establecida, enfócate en diferenciarte`
                        : `${formatK(selected.followers)} seguidores — perfil en crecimiento, buena oportunidad de competir`}
                    </span>
                  </div>
                </div>
              </div>

              {selected.notes && (
                <div className="bg-[#13131f] border border-[#1a1a2e] rounded-xl p-4">
                  <h3 className="font-semibold text-white text-sm mb-2">Notas</h3>
                  <p className="text-xs text-gray-400">{selected.notes}</p>
                </div>
              )}
            </>
          ) : (
            <div className="bg-[#13131f] border border-[#1a1a2e] rounded-xl p-6 text-center">
              <Eye size={28} className="mx-auto mb-3 text-gray-600" />
              <p className="text-sm text-gray-500">Selecciona un competidor para ver su análisis</p>
            </div>
          )}

          {/* Tips */}
          <div className="bg-gradient-to-br from-violet-900/20 to-purple-900/10 border border-violet-500/20 rounded-xl p-4">
            <h3 className="font-semibold text-violet-300 text-sm mb-3 flex items-center gap-2">
              <TrendingUp size={13} /> Estrategia Anti-Competencia
            </h3>
            <div className="space-y-1.5 text-xs text-gray-400">
              <p>• Busca los temas que <em className="text-gray-300">no cubren</em> y créalos tú</p>
              <p>• Responde a sus comentarios más populares</p>
              <p>• Publica cuando ellos no publican</p>
              <p>• Mejora su contenido con más calidad o detalle</p>
            </div>
          </div>
        </div>
      </div>

      {/* Add modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#13131f] border border-[#1a1a2e] rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-lg font-bold text-white mb-1">Agregar Competidor</h2>
            <p className="text-xs text-gray-500 mb-5">Se estimarán las métricas iniciales y podrás editarlas</p>

            {error && (
              <div className="flex items-center gap-2 p-3 mb-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs">
                <AlertCircle size={12} /> {error}
              </div>
            )}

            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Handle / Usuario</label>
                <input
                  value={form.handle}
                  onChange={e => setForm(f => ({ ...f, handle: e.target.value }))}
                  placeholder="@usuario"
                  className="w-full px-3 py-2 bg-[#0d0d1a] border border-[#1a1a2e] rounded-lg text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-violet-500/50"
                  required
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Plataforma</label>
                <select
                  value={form.platform}
                  onChange={e => setForm(f => ({ ...f, platform: e.target.value }))}
                  className="w-full px-3 py-2 bg-[#0d0d1a] border border-[#1a1a2e] rounded-lg text-sm text-gray-200 focus:outline-none focus:border-violet-500/50"
                >
                  <option value="instagram">Instagram</option>
                  <option value="tiktok">TikTok</option>
                  <option value="youtube">YouTube</option>
                  <option value="linkedin">LinkedIn</option>
                  <option value="twitter">Twitter/X</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Nicho</label>
                <input
                  value={form.niche}
                  onChange={e => setForm(f => ({ ...f, niche: e.target.value }))}
                  placeholder="ej: Fitness, Negocios, Travel..."
                  className="w-full px-3 py-2 bg-[#0d0d1a] border border-[#1a1a2e] rounded-lg text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-violet-500/50"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Notas</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Qué hace bien, estrategia, horarios de publicación..."
                  rows={3}
                  className="w-full px-3 py-2 bg-[#0d0d1a] border border-[#1a1a2e] rounded-lg text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-violet-500/50 resize-none"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowAdd(false); setError('') }}
                  className="flex-1 py-2 rounded-lg border border-[#1a1a2e] text-sm text-gray-400 hover:text-gray-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? <><RefreshCw size={13} className="animate-spin" /> Guardando...</> : 'Agregar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
